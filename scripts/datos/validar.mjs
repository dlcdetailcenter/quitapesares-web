// Validación de src/data/restaurante.json: estructura de cada dato y cuáles faltan por confirmar.
// La usan la barrera de compilación (integracion-astro.mjs) y las pruebas.

export const ESTADOS = ['CONFIRMADO', 'VERIFICADO', 'PARCIAL', 'INFERIDO', 'NO VERIFICABLE AÚN'];

const CLAVES_OBLIGATORIAS = ['valor', 'fuente', 'fechaConsulta', 'estado', 'confirmadoPor'];
const CLAVES_OPCIONALES = ['nota'];

/** @param {unknown} texto */
function esFecha(texto) {
  if (typeof texto !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const fecha = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto;
}

/** @param {unknown} valor */
function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

/**
 * @param {unknown} datos Contenido de restaurante.json ya interpretado.
 * @returns {{ errores: string[], pendientes: string[], total: number }}
 */
export function validarDatos(datos) {
  /** @type {string[]} */
  const errores = [];
  /** @type {string[]} */
  const pendientes = [];

  if (!esObjeto(datos)) {
    return { errores: ['El archivo debe ser un objeto con un dato por clave.'], pendientes, total: 0 };
  }

  const campos = Object.entries(/** @type {Record<string, unknown>} */ (datos));
  if (campos.length === 0) errores.push('No hay ningún dato.');

  for (const [nombre, dato] of campos) {
    if (!esObjeto(dato)) {
      errores.push(`${nombre}: debe ser un objeto con ${CLAVES_OBLIGATORIAS.join(', ')}.`);
      continue;
    }
    const d = /** @type {Record<string, unknown>} */ (dato);

    for (const clave of CLAVES_OBLIGATORIAS) {
      if (!(clave in d)) errores.push(`${nombre}: falta "${clave}".`);
    }
    for (const clave of Object.keys(d)) {
      if (!CLAVES_OBLIGATORIAS.includes(clave) && !CLAVES_OPCIONALES.includes(clave)) {
        errores.push(`${nombre}: clave desconocida "${clave}".`);
      }
    }

    if ('valor' in d && (d.valor === null || d.valor === '')) errores.push(`${nombre}: "valor" está vacío.`);
    if ('fuente' in d && (typeof d.fuente !== 'string' || d.fuente.trim() === '')) {
      errores.push(`${nombre}: "fuente" debe ser un texto no vacío.`);
    }
    if ('fechaConsulta' in d && !esFecha(d.fechaConsulta)) {
      errores.push(`${nombre}: "fechaConsulta" debe ser una fecha AAAA-MM-DD.`);
    }
    if ('nota' in d && typeof d.nota !== 'string') errores.push(`${nombre}: "nota" debe ser un texto.`);
    if ('estado' in d && !ESTADOS.includes(/** @type {string} */ (d.estado))) {
      errores.push(`${nombre}: estado "${String(d.estado)}" no válido (${ESTADOS.join(' / ')}).`);
    }

    const confirmadoPor = d.confirmadoPor;
    if (d.estado === 'CONFIRMADO') {
      const valido =
        esObjeto(confirmadoPor) &&
        Object.keys(/** @type {object} */ (confirmadoPor)).every((k) => k === 'quien' || k === 'fecha') &&
        typeof (/** @type {any} */ (confirmadoPor).quien) === 'string' &&
        /** @type {any} */ (confirmadoPor).quien.trim() !== '' &&
        esFecha(/** @type {any} */ (confirmadoPor).fecha);
      if (!valido) {
        errores.push(`${nombre}: CONFIRMADO necesita "confirmadoPor": { "quien": "…", "fecha": "AAAA-MM-DD" }.`);
      }
    } else {
      if ('confirmadoPor' in d && confirmadoPor !== null) {
        errores.push(`${nombre}: "confirmadoPor" solo se rellena cuando el estado es CONFIRMADO.`);
      }
      pendientes.push(nombre);
    }
  }

  return { errores, pendientes, total: campos.length };
}
