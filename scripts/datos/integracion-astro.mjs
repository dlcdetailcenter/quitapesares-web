// Barrera de compilación para los datos del restaurante (src/data/restaurante.json).
// - `astro build --mode demo` (npm run build): compila y avisa de cuántos datos faltan por confirmar.
// - Cualquier otro modo, incluido el de por defecto de `astro build` (production): falla si algún
//   dato no está CONFIRMADO. Así ningún despliegue que llame a `astro build` a secas sale con datos
//   sin confirmar.
// Un error de estructura en el archivo hace fallar la compilación en cualquier modo.
// Además, fuera del modo demo, falla con la maqueta del recorrido (barreraMaqueta), sea cual sea el estado de los datos.
import { readFileSync } from 'node:fs';
import { validarDatos } from './validar.mjs';

const ARCHIVO = new URL('../../src/data/restaurante.json', import.meta.url);
const RECORRIDO = new URL('../../public/recorrido/recorrido.json', import.meta.url);
const MODO_DEMO = 'demo';

/** @returns {import('astro').AstroIntegration} */
export default function datosRestaurante() {
  return {
    name: 'datos-restaurante',
    hooks: {
      'astro:config:setup': ({ command, updateConfig, logger }) => {
        if (command !== 'build') return;
        let comprobado = false;
        updateConfig({
          vite: {
            plugins: [
              {
                name: 'barrera-datos-restaurante',
                // Las integraciones de Astro no reciben el modo; el plugin de Vite sí (--mode).
                configResolved({ mode }) {
                  if (comprobado) return;
                  comprobado = true;
                  comprobar(mode, logger);
                },
              },
            ],
          },
        });
      },
    },
  };
}

/** ¿Hay en el recorrido alguna pieza de IA sobre el local («"ia": "local"» o «"origen": "creada"»), a cualquier profundidad? */
export function tieneIaDelLocal(valor) {
  if (Array.isArray(valor)) return valor.some(tieneIaDelLocal);
  if (valor === null || typeof valor !== 'object') return false;
  return Object.entries(valor).some(([clave, v]) => (clave === 'ia' && v === 'local') || (clave === 'origen' && v === 'creada') || tieneIaDelLocal(v));
}

/**
 * Barrera de la maqueta (excepción a FIDELIDAD de Kara del 2026-11-03, CLAUDE.md): la maqueta con IA sobre fotos
 * del local solo existe en la demo privada. Fuera del modo demo, la compilación falla con la variante maqueta o si el
 * recorrido preparado tiene alguna pieza «"ia": "local"», aunque todos los datos estuvieran confirmados.
 * @param {string} modo
 * @param {{ variante?: string, recorrido?: unknown }} recorrido
 * @returns {string[]} motivos por los que no se puede compilar en este modo (vacío si se puede)
 */
export function barreraMaqueta(modo, { variante, recorrido }) {
  if (modo === MODO_DEMO) return [];
  const motivos = [];
  if (variante === 'maqueta') motivos.push('RECORRIDO_VARIANTE=maqueta (la maqueta solo va a la demo privada)');
  if (tieneIaDelLocal(recorrido)) motivos.push('public/recorrido/recorrido.json tiene piezas con IA del local o creadas con IA (maqueta)');
  return motivos;
}

/** El recorrido que va a entrar en la compilación (lo deja preparar.mjs en public/recorrido/), si lo hay. */
function recorridoPreparado() {
  try {
    return JSON.parse(readFileSync(RECORRIDO, 'utf8'));
  } catch {
    return undefined;
  }
}

/**
 * @param {string} modo
 * @param {import('astro').AstroIntegrationLogger} logger
 */
function comprobar(modo, logger) {
  // Primero la maqueta: aunque todos los datos estuvieran confirmados, producción nunca la lleva.
  const motivos = barreraMaqueta(modo, { variante: process.env.RECORRIDO_VARIANTE, recorrido: recorridoPreparado() });
  if (motivos.length > 0) {
    throw new Error(`Compilación de producción bloqueada por la maqueta: ${motivos.join('; ')}. Producción nunca lleva maqueta.`);
  }

  /** @type {unknown} */
  let datos;
  try {
    datos = JSON.parse(readFileSync(ARCHIVO, 'utf8'));
  } catch (error) {
    throw new Error(`No se puede leer src/data/restaurante.json: ${error instanceof Error ? error.message : error}`);
  }

  const { errores, pendientes, total } = validarDatos(datos);
  if (errores.length > 0) {
    throw new Error(`src/data/restaurante.json tiene errores:\n- ${errores.join('\n- ')}`);
  }
  if (pendientes.length === 0) {
    logger.info(`Datos del restaurante: ${total} de ${total} confirmados.`);
    return;
  }

  const lista = pendientes.join(', ');
  if (modo === MODO_DEMO) {
    logger.warn(`Compilación DEMO: faltan ${pendientes.length} de ${total} datos por confirmar (${lista}).`);
    return;
  }
  throw new Error(
    `Compilación de producción bloqueada: ${pendientes.length} de ${total} datos sin CONFIRMADO (${lista}). ` +
      'Para una compilación de prueba usa "npm run build".',
  );
}
