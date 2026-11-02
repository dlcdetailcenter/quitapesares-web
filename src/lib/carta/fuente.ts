// De dónde sale la carta en cada momento:
// - La tarea programada del Worker (cada minuto) lee la hoja por gviz, la valida, la fusiona con la última
//   versión válida guardada en KV y escribe en KV solo si algo cambió (plan gratuito: 1.000 escrituras al día).
// - La página /carta lee KV. Si KV está vacío (recién desplegado), lee la hoja en ese momento.
// - En local (astro preview, CI) no hay URL de la hoja: se usa la plantilla de docs/carta/ como dato de prueba,
//   solo si la petición llega a localhost. En la URL desplegada no se usa nunca.
// Todo lo que pasa queda en los logs del Worker (console.*, con observability activado en wrangler.jsonc).
import { esCarta, fusionar, leerHoja, type Carta } from './hoja.ts';

export const CLAVE_KV = 'carta';
const PREFIJO_URL_VALIDA = 'https://docs.google.com/spreadsheets/d/';
const ESPERA_MAXIMA_MS = 8000;

/** Lo que se usa de un espacio de KV de Cloudflare (así las pruebas pueden pasar uno falso). */
export interface AlmacenCarta {
  get(clave: string, tipo: 'json'): Promise<unknown>;
  put(clave: string, valor: string): Promise<void>;
}

export interface EntornoCarta {
  CARTA: AlmacenCarta;
  /** Secreto del Worker con la URL gviz de la hoja (tqx=out:csv). Nunca en el repositorio. */
  URL_HOJA?: string;
}

type Registro = Pick<Console, 'info' | 'warn' | 'error'>;

export type Resultado =
  | { estado: 'sin-url' }
  | { estado: 'hoja-no-disponible'; motivo: string }
  | { estado: 'sin-cambios' | 'actualizada'; rechazadas: number; sinIngles: number };

async function leerKv(entorno: EntornoCarta, registro: Registro): Promise<Carta | null> {
  try {
    const valor = await entorno.CARTA.get(CLAVE_KV, 'json');
    if (valor === null) return null;
    if (esCarta(valor)) return valor;
    registro.error(JSON.stringify({ carta: 'kv-no-valido', mensaje: 'lo guardado en KV no es una carta válida: se ignora' }));
  } catch (error) {
    registro.error(JSON.stringify({ carta: 'kv-error', mensaje: String(error) }));
  }
  return null;
}

async function descargarHoja(url: string, pedir: typeof fetch): Promise<{ texto: string } | { motivo: string }> {
  try {
    // Sin caché de Cloudflare en la subpetición y sin seguir redirecciones: si la hoja deja de estar
    // compartida, Google redirige a su página de acceso y eso es un fallo, no una carta.
    const respuesta = await pedir(url, { cache: 'no-store', redirect: 'manual', signal: AbortSignal.timeout(ESPERA_MAXIMA_MS) });
    if (respuesta.status !== 200) return { motivo: `la hoja respondió ${respuesta.status}` };
    return { texto: await respuesta.text() };
  } catch (error) {
    return { motivo: `no se pudo leer la hoja: ${String(error)}` };
  }
}

/** Lee la hoja y actualiza KV si algo cambió. Es lo que hace la tarea programada. */
export async function actualizarCarta(
  entorno: EntornoCarta,
  ahora: Date,
  pedir: typeof fetch = fetch,
  registro: Registro = console,
): Promise<{ resultado: Resultado; carta: Carta | null }> {
  const url = entorno.URL_HOJA?.trim();
  if (!url || !url.startsWith(PREFIJO_URL_VALIDA)) {
    registro.error(JSON.stringify({ carta: 'sin-url', mensaje: 'falta el secreto URL_HOJA o no es una URL de Google Sheets' }));
    return { resultado: { estado: 'sin-url' }, carta: await leerKv(entorno, registro) };
  }

  const anterior = await leerKv(entorno, registro);
  const descarga = await descargarHoja(url, pedir);
  if ('motivo' in descarga) {
    registro.error(JSON.stringify({ carta: 'hoja-no-disponible', motivo: descarga.motivo, seSirve: anterior ? 'última versión válida' : 'nada (Llámanos)' }));
    return { resultado: { estado: 'hoja-no-disponible', motivo: descarga.motivo }, carta: anterior };
  }

  const lectura = leerHoja(descarga.texto);
  if (!lectura.legible) {
    const motivo = lectura.motivo ?? 'hoja ilegible';
    registro.error(JSON.stringify({ carta: 'hoja-no-disponible', motivo, seSirve: anterior ? 'última versión válida' : 'nada (Llámanos)' }));
    return { resultado: { estado: 'hoja-no-disponible', motivo }, carta: anterior };
  }
  for (const rechazada of lectura.rechazadas) {
    registro.warn(JSON.stringify({ carta: 'fila-rechazada', ...rechazada, seSirve: 'versión anterior del plato, si la había' }));
  }
  if (lectura.sinIngles.length > 0) {
    registro.warn(JSON.stringify({ carta: 'sin-nombre-en', platos: lectura.sinIngles, efecto: 'no salen en /en/carta' }));
  }

  const { carta, cambio } = fusionar(anterior, lectura, ahora);
  const resumen = { rechazadas: lectura.rechazadas.length, sinIngles: lectura.sinIngles.length };
  if (!cambio || !carta) return { resultado: { estado: 'sin-cambios', ...resumen }, carta };
  try {
    await entorno.CARTA.put(CLAVE_KV, JSON.stringify(carta));
    registro.info(JSON.stringify({ carta: 'actualizada', platos: carta.platos.length, agotados: carta.platos.filter((p) => !p.disponible).length }));
  } catch (error) {
    registro.error(JSON.stringify({ carta: 'kv-error', mensaje: `no se pudo guardar: ${String(error)}` }));
  }
  return { resultado: { estado: 'actualizada', ...resumen }, carta };
}

/**
 * La carta que ve la página /carta: KV; si está vacío, la hoja en ese momento; en local sin URL, la plantilla.
 * Devuelve null si no hay ninguna versión válida (la página muestra «Llámanos»).
 */
export async function cartaParaMostrar(
  entorno: EntornoCarta,
  url: URL,
  plantilla: string,
  esperar: (promesa: Promise<unknown>) => void,
  registro: Registro = console,
): Promise<Carta | null> {
  const guardada = await leerKv(entorno, registro);
  if (guardada) return guardada;
  if (entorno.URL_HOJA) {
    // Primera visita tras desplegar, antes de que corra la tarea programada.
    const actualizacion = actualizarCarta(entorno, new Date(), fetch, registro);
    esperar(actualizacion);
    return (await actualizacion).carta;
  }
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return fusionar(null, leerHoja(plantilla), new Date(0)).carta;
  }
  registro.error(JSON.stringify({ carta: 'sin-url', mensaje: 'falta el secreto URL_HOJA: se muestra Llámanos' }));
  return null;
}
