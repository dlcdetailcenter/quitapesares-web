// Barrera de compilación para los datos del restaurante (src/data/restaurante.json).
// - `astro build --mode demo` (npm run build): compila y avisa de cuántos datos faltan por confirmar.
// - Cualquier otro modo, incluido el de por defecto de `astro build` (production): falla si algún
//   dato no está CONFIRMADO. Así ningún despliegue que llame a `astro build` a secas sale con datos
//   sin confirmar.
// Un error de estructura en el archivo hace fallar la compilación en cualquier modo.
import { readFileSync } from 'node:fs';
import { validarDatos } from './validar.mjs';

const ARCHIVO = new URL('../../src/data/restaurante.json', import.meta.url);
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

/**
 * @param {string} modo
 * @param {import('astro').AstroIntegrationLogger} logger
 */
function comprobar(modo, logger) {
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
