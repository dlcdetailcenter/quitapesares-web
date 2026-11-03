// Textos de la interfaz en español e inglés. Solo interfaz: los datos del local salen de
// src/data/restaurante.json y los platos de la hoja de la carta.
// `en` tiene el tipo de `es`: si falta una clave en inglés, `npm run check` falla; la prueba
// scripts/datos/textos.test.mjs comprueba además que ningún texto está vacío.
import type { Categoria, Idioma } from '../lib/carta/hoja.ts';

const es = {
  saltarAlContenido: 'Saltar al contenido',
  navIdioma: 'Idioma',
  otroIdioma: 'English',
  inicio: 'Inicio',
  llamar: 'Llamar',
  verCarta: 'Ver carta',
  comoLlegar: 'Cómo llegar',
  dejarResena: 'Dejar reseña',
  menuDelDia: 'Menú del día',
  menuIncluye: 'Incluye',
  menuFinDeSemana: 'Menú fin de semana',
  horario: 'Horario',
  carta: 'Carta',
  tituloCarta: 'Carta',
  agotado: 'Agotado',
  alergenos: 'Alérgenos',
  alergenosTexto: 'Consulta los alérgenos con el personal.',
  sinCartaTitulo: 'Llámanos',
  sinCartaTexto: 'Ahora mismo no podemos enseñar la carta aquí. Llámanos y te decimos qué hay hoy.',
  cartaSinIngles: 'La carta en inglés aún no está lista.',
  verCartaEnOtroIdioma: 'Ver la carta en español',
  ultimoCambio: 'Disponibilidad actualizada:',
  fotoPortada: 'Puertas burdeos abiertas a la entrada del restaurante: dentro, una barrica sobre el mostrador de madera, la escalera y el suelo de barro.',
  irALaCarta: 'Ir a la carta',
  navCarta: 'Acceso a la carta',
  recorrido: 'Recorrido por el local',
  rotuloEntrada: 'La entrada',
  rotuloBarra: 'La barra',
  rotuloComedor: 'El comedor',
  creditosSoloReal: 'El local sale solo en vídeo real.',
  creditosIa: 'Generado con IA:',
  creditosIaLocal: 'Simulación con IA a partir de fotos reales del local (Higgsfield).',
  creditosSintetico: 'Recorrido de prueba con imágenes sintéticas: todavía no es el material del local.',
  pnoaPrefijo: 'Obra derivada de PNOA',
  etiquetaIaLocal: 'Simulación con IA a partir de una foto real del local',
  paradaPuerta: 'Cómo llegar o llamar',
  paradaBarra: 'La carta y el menú del día',
};

type Textos = Record<keyof typeof es, string>;

const en: Textos = {
  saltarAlContenido: 'Skip to content',
  navIdioma: 'Language',
  otroIdioma: 'Español',
  inicio: 'Home',
  llamar: 'Call',
  verCarta: 'See the menu',
  comoLlegar: 'Directions',
  dejarResena: 'Write a review',
  menuDelDia: 'Set menu of the day',
  menuIncluye: 'Includes',
  menuFinDeSemana: 'Weekend set menu',
  horario: 'Opening hours',
  carta: 'Menu',
  tituloCarta: 'Menu',
  agotado: 'Sold out',
  alergenos: 'Allergens',
  alergenosTexto: 'Please ask our staff about allergens.',
  sinCartaTitulo: 'Call us',
  sinCartaTexto: 'We can’t show the menu here right now. Call us and we’ll tell you what we have today.',
  cartaSinIngles: 'The menu in English isn’t ready yet.',
  verCartaEnOtroIdioma: 'See the menu in Spanish',
  ultimoCambio: 'Availability updated:',
  fotoPortada: 'Burgundy doors open at the restaurant entrance: inside, a barrel on the wooden counter, the staircase and the terracotta floor.',
  irALaCarta: 'Go to the menu',
  navCarta: 'Menu shortcut',
  recorrido: 'Walk through the restaurant',
  rotuloEntrada: 'The entrance',
  rotuloBarra: 'The bar',
  rotuloComedor: 'The dining room',
  creditosSoloReal: 'The restaurant is shown only in real video.',
  creditosIa: 'AI-generated:',
  creditosIaLocal: 'AI simulation based on real photos of the venue (Higgsfield).',
  creditosSintetico: 'Test walk-through with synthetic images: not the restaurant footage yet.',
  pnoaPrefijo: 'Derived from PNOA',
  etiquetaIaLocal: 'AI simulation based on a real photo of the venue',
  paradaPuerta: 'Directions or call',
  paradaBarra: 'The menu and the set menu of the day',
};

export const TEXTOS: Record<Idioma, Textos> = { es, en };

/** Nombres de las categorías de la hoja (lista cerrada). En español, tal cual están en la hoja. */
export const CATEGORIAS_TRADUCIDAS: Record<Idioma, Record<Categoria, string>> = {
  es: {
    Primeros: 'Primeros',
    'Segundos · Carnes y pollo': 'Segundos · Carnes y pollo',
    'Segundos · Pescados': 'Segundos · Pescados',
    Postres: 'Postres',
  },
  en: {
    Primeros: 'Starters',
    'Segundos · Carnes y pollo': 'Mains · Meat and chicken',
    'Segundos · Pescados': 'Mains · Fish',
    Postres: 'Desserts',
  },
};

export const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
export type Dia = (typeof DIAS)[number];

export const NOMBRES_DIAS: Record<Idioma, Record<Dia, string>> = {
  es: { lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo' },
  en: { lunes: 'Monday', martes: 'Tuesday', miercoles: 'Wednesday', jueves: 'Thursday', viernes: 'Friday', sabado: 'Saturday', domingo: 'Sunday' },
};

/**
 * Traducción al inglés de las palabras que usa restaurante.json en «incluye» del menú y en el horario.
 * En español se muestran tal cual vienen del archivo. Si el archivo trae una palabra que no está aquí,
 * la prueba de textos falla: así no sale nunca una palabra sin traducir.
 */
export const PALABRAS_DATOS_EN: Record<string, string> = {
  primero: 'starter',
  segundo: 'main course',
  'postre o café': 'dessert or coffee',
  bebida: 'drink',
  cerrado: 'Closed',
};

/** Una palabra de restaurante.json en el idioma pedido (en español, la del archivo tal cual). */
export function palabraDatos(palabra: string, idioma: Idioma): string {
  return idioma === 'es' ? palabra : (PALABRAS_DATOS_EN[palabra] ?? palabra);
}
