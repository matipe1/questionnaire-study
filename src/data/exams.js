import cdd from './ciencia-de-datos-parcial-1.json';

export const exams = [{
  course: 'ciencia-de-datos',
  courseName: 'Ciencia de Datos',
  slug: 'parcial-1',
  title: 'Parcial 1',
  units: [
    'Introducción y gestión de proyectos',
    'ETL y preprocesamiento',
    'Visualización y análisis exploratorio',
    'Aprendizaje automático',
  ],
  questions: cdd.questions,
}];
