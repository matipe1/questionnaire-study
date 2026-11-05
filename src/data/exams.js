const banks = import.meta.glob('./banks/*.json', { eager: true, import: 'default' });

export const exams = Object.values(banks);
