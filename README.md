# Questionnaire Study

Cuestionarios de estudio estilo Moodle. La rama base contiene la aplicación compartida. Cada rama de estudio agrega el banco JSON de su materia y parcial.

## Crear o ampliar un cuestionario con un agente

1. Creá una rama desde la base, por ejemplo `ciencia-de-datos/parcial-1`. Abrí el repo en el chat del agente y compartí la materia, el parcial, las unidades y las fuentes. Si el banco ya existe, trabajá en su rama.
2. Pedile que prepare un lote chico. Para preguntas de parciales, compartí el enunciado, las alternativas y la clave. Para preguntas nuevas, indicá los temas y el material que debe usar. Si una clave o una transcripción es dudosa, resolvé ese punto antes de incorporarla.
3. Guardá un archivo por parcial en `src/data/banks/`, por ejemplo `ciencia-de-datos-parcial-1.json`. Astro genera la página a partir del archivo. Al ampliar un banco, agregá preguntas al JSON existente y conservá los identificadores de las anteriores.
4. Pedile al agente que valide el JSON y ejecute `pnpm build`. Revisá el cuestionario en `/<course>/<slug>/`. Probá las selecciones, el filtro de origen y la corrección. Para ver la página localmente, usá `pnpm dev`.

> Armá el banco de [materia y parcial] con las fuentes que adjunto. Incluí [unidades o temas]. Transcribí las preguntas de parciales tal como aparecen y generá [cantidad] preguntas adicionales. Guardá el resultado en el JSON de la rama siguiendo este README.

## Formato del banco

```json
{
  "course": "ciencia-de-datos",
  "courseName": "Ciencia de Datos",
  "slug": "parcial-1",
  "title": "Parcial 1",
  "units": ["ETL y preprocesamiento"],
  "questions": [
    {
      "id": "etl-001",
      "unit": 1,
      "topic": "ETL",
      "origin": "ai-generated",
      "source": "Apuntes de ETL, sección sobre etapas del proceso",
      "type": "multiple",
      "prompt": "¿Cuáles de estas acciones son etapas de ETL?",
      "options": [
        { "id": "extraccion", "text": "Extracción" },
        { "id": "transformacion", "text": "Transformación" },
        { "id": "carga", "text": "Carga" },
        { "id": "visualizacion", "text": "Visualización" }
      ],
      "correctOptionIds": ["extraccion", "transformacion", "carga"],
      "points": 1,
      "explanation": "ETL significa extracción, transformación y carga."
    }
  ]
}
```

- `course` y `slug` forman la ruta. Usá minúsculas y guiones, con una combinación única por banco dentro de la rama. `unit` indica la posición del título en `units`, empezando en 1.
- Usá `past-exam` para preguntas transcritas literalmente. Conservá el texto, las opciones y la clave. Indicá el año o la captura en `source` según la información disponible. Usá `ai-generated` para preguntas nuevas o adaptadas e indicá el material o la consigna de origen.
- Usá `single` si hay una única respuesta correcta y `multiple` si hay varias. En selección múltiple, el puntaje se otorga cuando la selección coincide con la clave completa.
- Cada pregunta lleva un ID único en el banco. Cada opción lleva un ID único dentro de su pregunta. En `correctOptionIds`, usá esos IDs sin repetirlos. La app mezcla las opciones durante el intento.
- Antes de entregar un lote, verificá las claves con las fuentes, evitá duplicados y revisá que la explicación justifique la respuesta. Mantené los cambios de contenido en el JSON.

Instalá las dependencias con `pnpm install`. Si la rama está conectada a Vercel, podés probarla con su despliegue de vista previa.
