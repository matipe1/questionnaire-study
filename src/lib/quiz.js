const originLabels = { 'past-exam': 'Parcial anterior', 'ai-generated': 'Generada por IA' };
const formatPoints = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isCorrect(item) {
  return item.selected.size === item.correctOptionIds.length &&
    item.correctOptionIds.every(id => item.selected.has(id));
}

export function mountQuiz(root) {
  const bank = JSON.parse(root.dataset.bank);
  const find = name => root.querySelector(`[data-${name}]`);
  const form = find('settings');
  const units = [...form.querySelectorAll('[name="unit"]:enabled')];
  const start = form.querySelector('[type="submit"]');
  const all = find('all-units');
  const timed = form.querySelector('[name="timed"]');
  const minutes = form.querySelector('[name="minutes"]');
  let deadline = 0, timerId;

  let items = [], position = 0, immediate = true;

  function eligible() {
    const settings = new FormData(form);
    const selectedUnits = new Set(settings.getAll('unit').map(Number));
    const origin = settings.get('origin');
    return bank.filter(q => selectedUnits.has(q.unit) && (origin === 'all' || q.origin === origin));
  }

  function updateSettings() {
    const chosen = units.filter(input => input.checked).length;
    all.checked = units.length > 0 && chosen === units.length;
    all.indeterminate = chosen > 0 && chosen < units.length;
    all.disabled = units.length === 0;
    const count = eligible().length;
    find('timer-settings').hidden = !timed.checked;
    minutes.disabled = !timed.checked;
    start.disabled = count === 0;
    const total = count * minutes.valueAsNumber;
    find('timer-total').textContent = minutes.validity.valid && Number.isFinite(total)
      ? `Tiempo total: ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(total)} min. Al agotarse, se envía el intento.`
      : '';
    find('count').textContent = count
      ? `${count} ${count === 1 ? 'pregunta disponible' : 'preguntas disponibles'}`
      : 'No hay preguntas para esta selección. Cambiá las unidades o el origen.';
  }

  function show(view) {
    root.querySelectorAll('[data-view]').forEach(panel => { panel.hidden = panel.dataset.view !== view; });
    find('navigation').hidden = view !== 'attempt';
    find('timer-bar').hidden = !deadline || (view !== 'attempt' && view !== 'summary');
  }

  function updateIndex() {
    const index = find('index');
    index.querySelectorAll('button').forEach((button, i) => {
      const item = items[i];
      const correct = item.checked && isCorrect(item);
      const incorrect = item.checked && !correct;
      const state = item.checked ? (correct ? 'correcta' : 'incorrecta') : (item.selected.size ? 'respondida' : 'sin responder');
      button.classList.toggle('answered', item.selected.size > 0);
      button.classList.toggle('correct', correct);
      button.classList.toggle('incorrect', incorrect);
      button.classList.toggle('flagged', item.flagged);
      button.setAttribute('aria-current', i === position ? 'step' : 'false');
      const label = `Pregunta ${i + 1}, ${state}${item.flagged ? ', marcada' : ''}`;
      button.setAttribute('aria-label', label);
      button.title = label;
    });
  }

  function renderQuestion(item, i, review = false) {
    const fragment = find('question-template').content.cloneNode(true);
    const select = name => fragment.querySelector(`[data-${name}]`);
    const options = select('options');
    const status = select('status');
    const clear = select('clear');
    const flag = select('flag');
    const locked = review || item.checked;
    select('number').textContent = `Pregunta ${i + 1}`;
    select('points').textContent = `Puntúa como ${formatPoints.format(item.points)}`;
    select('prompt').textContent = item.prompt;
    options.disabled = locked;
    const verdict = locked && item.selected.size ? (isCorrect(item) ? 'correct' : 'incorrect') : '';
    if (verdict) status.classList.add(verdict);
    options.querySelector('legend').textContent = item.type === 'multiple' ? 'Seleccione una o más:' : 'Seleccione una:';

    function updateAnswer() {
      status.textContent = locked
        ? item.selected.size ? (isCorrect(item) ? 'Correcta' : 'Incorrecta') : 'Sin responder'
        : item.selected.size ? 'Respuesta guardada' : 'Sin responder';
      clear.disabled = item.selected.size === 0;
      if (!review) {
        find('check').disabled = item.selected.size === 0;
        updateIndex();
      }
    }

    for (const option of item.options) {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = item.type === 'multiple' ? 'checkbox' : 'radio';
      input.name = `answer-${i}`;
      input.value = option.id;
      input.checked = item.selected.has(option.id);
      input.addEventListener('change', () => {
        if (item.type === 'single') item.selected.clear();
        if (input.checked) item.selected.add(option.id);
        else item.selected.delete(option.id);
        updateAnswer();
      });
      const text = document.createElement('span');
      text.textContent = option.text;
      label.append(input, text);
      if (locked) {
        const correct = item.correctOptionIds.includes(option.id);
        const wrong = item.selected.has(option.id) && !correct;
        if (correct || wrong) {
          const marker = document.createElement('span');
          marker.className = correct ? 'option-verdict correct' : 'option-verdict incorrect';
          marker.textContent = correct ? 'Correcta' : 'Incorrecta';
          text.append(' ', marker);
        }
      }
      options.append(label);
    }

    clear.hidden = locked;
    clear.addEventListener('click', () => {
      item.selected.clear();
      options.querySelectorAll('input').forEach(input => { input.checked = false; });
      options.querySelector('input')?.focus();
      updateAnswer();
    });

    function updateFlag() {
      flag.setAttribute('aria-pressed', String(item.flagged));
      flag.querySelector('span').textContent = item.flagged ? 'Quitar marca' : 'Marcar pregunta';
    }
    flag.hidden = review;
    flag.addEventListener('click', () => {
      item.flagged = !item.flagged;
      updateFlag();
      updateIndex();
    });
    updateFlag();

    updateAnswer();
    if (locked) {
      select('explanation').hidden = false;
      const earned = isCorrect(item) ? item.points : 0;
      const result = document.createElement('span');
      if (verdict) result.classList.add(verdict);
      result.textContent = status.textContent;
      select('verdict').append(result, ` · ${formatPoints.format(earned)} de ${formatPoints.format(item.points)} puntos`);
      const answers = item.options.filter(o => item.correctOptionIds.includes(o.id)).map(o => o.text);
      select('key').textContent = (answers.length > 1 ? 'Respuestas correctas:\n' : 'Respuesta correcta:\n') + answers.join('\n');
      select('reason').textContent = item.explanation;
      select('source').textContent = [originLabels[item.origin], item.source].filter(Boolean).join(' · ');
    }
    return fragment;
  }

  function openQuestion(i, focus = true) {
    position = i;
    show('attempt');
    find('previous').disabled = position === 0;
    find('next').hidden = position === items.length - 1;
    find('check').hidden = !immediate || items[position].checked;
    find('current').replaceChildren(renderQuestion(items[position], position));
    if (focus) find('current').querySelector('[data-prompt]').focus();
  }

  form.addEventListener('change', event => {
    if (event.target === all) units.forEach(input => { input.checked = all.checked; });
    updateSettings();
  });

  minutes.addEventListener('input', updateSettings);

  function stopTimer() {
    clearInterval(timerId);
    deadline = 0;
  }

  function updateTimer() {
    const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    find('time-left').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    if (seconds === 0) finishAttempt(true);
  }

  function startAttempt(questions) {
    if (!questions.length) return;
    const settings = new FormData(form);
    const ordered = settings.get('order') === 'mixed' ? shuffle(questions) : [...questions].sort((a, b) => a.unit - b.unit);
    items = ordered.map(item => ({ ...item, options: shuffle(item.options), selected: new Set(), flagged: false, checked: false }));
    immediate = settings.get('feedback') === 'each';
    find('index').replaceChildren(...items.map((_, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(i + 1);
      button.addEventListener('click', () => openQuestion(i));
      return button;
    }));
    stopTimer();
    if (timed.checked) {
      deadline = Date.now() + minutes.valueAsNumber * items.length * 60_000;
      updateTimer();
      timerId = setInterval(updateTimer, 250);
    }
    find('review').replaceChildren();
    openQuestion(0);
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    startAttempt(eligible());
  });

  find('previous').addEventListener('click', () => openQuestion(position - 1));
  find('next').addEventListener('click', () => openQuestion(position + 1));
  find('check').addEventListener('click', () => {
    const item = items[position];
    if (!item.selected.size) return;
    item.checked = true;
    openQuestion(position, false);
    const feedback = find('current').querySelector('[data-explanation]');
    feedback.tabIndex = -1;
    feedback.focus();
  });
  find('summary').addEventListener('click', () => {
    const answered = items.filter(item => item.selected.size > 0).length;
    find('pending').textContent = `Respondiste ${answered} de ${items.length} preguntas.`;
    show('summary');
    root.querySelector('[data-view="summary"] h2').focus();
  });
  find('back').addEventListener('click', () => openQuestion(position));
  function finishAttempt(expired = false) {
    stopTimer();
    find('time-expired').hidden = !expired;
    const score = items.reduce((sum, item) => sum + (isCorrect(item) ? item.points : 0), 0);
    const max = items.reduce((sum, item) => sum + item.points, 0);
    find('score').textContent = `${formatPoints.format(score)} de ${formatPoints.format(max)}`;
    find('review').replaceChildren(...items.map((item, i) => renderQuestion(item, i, true)));
    const failed = failedQuestions();
    find('retry').hidden = failed.length === 0;
    find('retry').textContent = `Reintentar preguntas falladas (${failed.length})`;
    show('review');
    root.querySelector('[data-view="review"] h2').focus();
  }
  function failedQuestions() {
    return items.filter(item => item.selected.size > 0 && !isCorrect(item));
  }

  find('retry').addEventListener('click', () => startAttempt(failedQuestions()));
  find('finish').addEventListener('click', () => finishAttempt());
  find('restart').addEventListener('click', () => {
    show('setup');
    form.querySelector('input:enabled')?.focus();
  });

  updateSettings();
}
