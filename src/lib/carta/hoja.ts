// Lectura y validación de la hoja de la carta (CSV que devuelve Google por gviz, o la plantilla de docs/carta/).
// Módulo puro, sin dependencias ni acceso a red: lo usan la tarea programada del Worker, la página /carta y
// las pruebas (node --test, con la eliminación de tipos de Node). Por eso solo usa sintaxis TypeScript borrable.
//
// Reglas (plan de F1 aprobado por Kara):
// - Una fila rota se descarta; el plato conserva su última versión válida y el resto se actualiza.
// - Hoja vacía, ilegible o con otra cabecera: se conserva la última versión válida entera.
// - nombre_en vacío: el plato vale en español, no sale en inglés y queda registrado.

export const CATEGORIAS = ['Primeros', 'Segundos · Carnes y pollo', 'Segundos · Pescados', 'Postres'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const CABECERA = ['id', 'categoria', 'nombre_es', 'nombre_en', 'disponible', 'orden'] as const;

// Topes para que una hoja enorme o maliciosa no agote los 10 ms de CPU del plan gratuito.
const MAX_BYTES = 512 * 1024;
const MAX_FILAS = 2000;
const MAX_NOMBRE = 120;
const ID_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_ID = 80;
// Caracteres de control y separadores de línea o párrafo: no pueden aparecer en un nombre de plato.
const CONTROL = /[\p{Cc}\p{Zl}\p{Zp}]/u;

export interface Plato {
  id: string;
  categoria: Categoria;
  nombre_es: string;
  /** Vacío si la hoja no lo tiene: entonces el plato no se muestra en inglés. */
  nombre_en: string;
  disponible: boolean;
  orden: number;
}

export interface Carta {
  version: 1;
  /** Momento (ISO 8601) de la última lectura que cambió algo. */
  actualizada: string;
  platos: Plato[];
}

export interface FilaRechazada {
  /** Número de fila en la hoja (la cabecera es la 1). */
  fila: number;
  id: string;
  motivo: string;
}

export interface Lectura {
  /** false si el texto no es una hoja de la carta (cabecera distinta, vacío o demasiado grande). */
  legible: boolean;
  motivo?: string;
  platos: Plato[];
  rechazadas: FilaRechazada[];
  /** Platos válidos en español a los que les falta nombre_en. */
  sinIngles: string[];
}

/** CSV según RFC 4180: comillas, comillas dobladas, saltos de línea dentro de comillas, CRLF o LF. */
export function parsearCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let entreComillas = false;
  let i = 0;
  if (texto.charCodeAt(0) === 0xfeff) i = 1; // marca de orden de bytes
  for (; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          celda += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        celda += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ',') {
      fila.push(celda);
      celda = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = '';
    } else {
      celda += c;
    }
  }
  if (celda !== '' || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas;
}

function validarNombre(valor: string, campo: string): string | null {
  if (valor.length > MAX_NOMBRE) return `${campo} pasa de ${MAX_NOMBRE} caracteres`;
  if (CONTROL.test(valor)) return `${campo} tiene caracteres de control`;
  return null;
}

/** Valida una fila ya separada en celdas. Devuelve el plato o el motivo por el que no vale. */
export function validarFila(celdas: string[]): { plato: Plato } | { motivo: string } {
  if (celdas.length !== CABECERA.length) return { motivo: `tiene ${celdas.length} columnas en vez de ${CABECERA.length}` };
  const [idCrudo, categoriaCruda, nombreEsCrudo, nombreEnCrudo, disponibleCrudo, ordenCrudo] = celdas;
  const id = idCrudo.trim();
  const categoria = categoriaCruda.trim();
  const nombre_es = nombreEsCrudo.trim();
  const nombre_en = nombreEnCrudo.trim();
  const disponible = disponibleCrudo.trim().toUpperCase();
  const orden = ordenCrudo.trim();

  if (!ID_VALIDO.test(id) || id.length > MAX_ID) return { motivo: 'id vacío o no válido (minúsculas, números y guiones)' };
  if (!(CATEGORIAS as readonly string[]).includes(categoria)) return { motivo: `categoría desconocida "${categoria}"` };
  if (nombre_es === '') return { motivo: 'nombre_es vacío' };
  const errorEs = validarNombre(nombre_es, 'nombre_es');
  if (errorEs) return { motivo: errorEs };
  const errorEn = validarNombre(nombre_en, 'nombre_en');
  if (errorEn) return { motivo: errorEn };
  if (disponible !== 'TRUE' && disponible !== 'FALSE') return { motivo: `disponible "${disponibleCrudo}" no es una casilla (TRUE o FALSE)` };
  if (!/^[1-9]\d{0,2}$/.test(orden)) return { motivo: `orden "${ordenCrudo}" no es un entero entre 1 y 999` };

  return {
    plato: { id, categoria: categoria as Categoria, nombre_es, nombre_en, disponible: disponible === 'TRUE', orden: Number(orden) },
  };
}

/** Interpreta el CSV de la hoja: platos válidos, filas rechazadas y platos sin nombre en inglés. */
export function leerHoja(texto: string): Lectura {
  const vacia: Lectura = { legible: false, platos: [], rechazadas: [], sinIngles: [] };
  if (texto.length > MAX_BYTES) return { ...vacia, motivo: `la hoja pasa de ${MAX_BYTES} bytes` };
  const filas = parsearCsv(texto);
  if (filas.length === 0) return { ...vacia, motivo: 'la hoja está vacía' };
  const cabecera = filas[0].map((c) => c.trim().toLowerCase());
  if (cabecera.length !== CABECERA.length || CABECERA.some((nombre, i) => cabecera[i] !== nombre)) {
    return { ...vacia, motivo: `cabecera inesperada: ${cabecera.join(',')}` };
  }
  if (filas.length - 1 > MAX_FILAS) return { ...vacia, motivo: `la hoja pasa de ${MAX_FILAS} filas` };

  const platos: Plato[] = [];
  const rechazadas: FilaRechazada[] = [];
  const vistos = new Set<string>();
  for (let n = 1; n < filas.length; n++) {
    const celdas = filas[n];
    // Filas vacías: la casilla de «disponible» llega hasta la fila 1000 y gviz las devuelve con FALSE.
    const conTexto = celdas.filter((c, i) => c.trim() !== '' && !(i === 4 && c.trim().toUpperCase() === 'FALSE'));
    if (conTexto.length === 0) continue;
    const resultado = validarFila(celdas);
    const id = (celdas[0] ?? '').trim();
    if ('motivo' in resultado) {
      rechazadas.push({ fila: n + 1, id, motivo: resultado.motivo });
    } else if (vistos.has(resultado.plato.id)) {
      rechazadas.push({ fila: n + 1, id, motivo: 'id repetido: vale la primera fila con ese id' });
    } else {
      vistos.add(resultado.plato.id);
      platos.push(resultado.plato);
    }
  }
  if (platos.length === 0 && rechazadas.length === 0) return { ...vacia, motivo: 'la hoja no tiene platos' };
  const sinIngles = platos.filter((p) => p.nombre_en === '').map((p) => p.id);
  return { legible: true, platos, rechazadas, sinIngles };
}

/**
 * Combina la lectura nueva con la última versión válida.
 * - Lectura ilegible: se devuelve la anterior tal cual.
 * - Plato con fila rota: si existía antes, conserva su versión anterior; si no, no aparece.
 * - Plato que ya no está en la hoja: desaparece.
 * Devuelve `cambio: false` si el resultado es igual a la anterior (entonces no hace falta escribir en KV).
 */
export function fusionar(anterior: Carta | null, lectura: Lectura, ahora: Date): { carta: Carta | null; cambio: boolean } {
  if (!lectura.legible) return { carta: anterior, cambio: false };
  const previos = new Map((anterior?.platos ?? []).map((p) => [p.id, p]));
  const nuevos = new Map(lectura.platos.map((p) => [p.id, p]));
  for (const rechazada of lectura.rechazadas) {
    const previo = previos.get(rechazada.id);
    if (previo && !nuevos.has(previo.id)) nuevos.set(previo.id, previo);
  }
  const platos = [...nuevos.values()];
  if (anterior && mismosPlatos(anterior.platos, platos)) return { carta: anterior, cambio: false };
  return { carta: { version: 1, actualizada: ahora.toISOString(), platos }, cambio: true };
}

function mismosPlatos(a: Plato[], b: Plato[]): boolean {
  if (a.length !== b.length) return false;
  const clave = (p: Plato) => JSON.stringify([p.id, p.categoria, p.nombre_es, p.nombre_en, p.disponible, p.orden]);
  const enA = new Set(a.map(clave));
  return b.every((p) => enA.has(clave(p)));
}

/** Comprueba que un valor leído de KV tiene la forma de una Carta; si no, se trata como si no hubiera nada. */
export function esCarta(valor: unknown): valor is Carta {
  if (typeof valor !== 'object' || valor === null) return false;
  const c = valor as Partial<Carta>;
  return (
    c.version === 1 &&
    typeof c.actualizada === 'string' &&
    Array.isArray(c.platos) &&
    c.platos.every((p) => {
      if (typeof p !== 'object' || p === null) return false;
      const r = validarFila([p.id, p.categoria, p.nombre_es, p.nombre_en, p.disponible ? 'TRUE' : 'FALSE', String(p.orden)].map(String));
      return !('motivo' in r) && typeof p.disponible === 'boolean';
    })
  );
}

export type Idioma = 'es' | 'en';

export interface GrupoCarta {
  categoria: Categoria;
  platos: Array<{ id: string; nombre: string; disponible: boolean }>;
}

/** Platos agrupados por categoría en el orden de CATEGORIAS. Sin categorías vacías; en inglés, solo platos con nombre_en. */
export function agrupar(carta: Carta, idioma: Idioma): GrupoCarta[] {
  const grupos: GrupoCarta[] = [];
  for (const categoria of CATEGORIAS) {
    const platos = carta.platos
      .filter((p) => p.categoria === categoria && (idioma === 'es' || p.nombre_en !== ''))
      .sort((a, b) => a.orden - b.orden || a.nombre_es.localeCompare(b.nombre_es, 'es'))
      .map((p) => ({ id: p.id, nombre: idioma === 'es' ? p.nombre_es : p.nombre_en, disponible: p.disponible }));
    if (platos.length > 0) grupos.push({ categoria, platos });
  }
  return grupos;
}
