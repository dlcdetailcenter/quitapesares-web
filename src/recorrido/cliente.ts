// Recorrido de la portada (F2): aire y piezas, movido por el scroll nativo.
// Las acciones (Recorrido.astro) son las que ya existen en la portada. Cada zona tiene su grupo, fijo mientras se ve:
// lo dice «panel» en recorrido.json, en el aire y en cada tramo; sin ese campo, el de su zona (PANEL_DE_ZONA).
// Progresivo: la portada de F1 está completa en el HTML. El script de <head> (Recorrido.astro) solo marca
// `recorrido-pendiente` si no hay «reducir movimiento», ahorro de datos ni red lenta. Aquí:
//   1. se pregunta al Worker (/recorrido/estado), que dice que no si llega la cabecera Save-Data;
//   2. se carga el primer tramo; si no está en 3 s desde el inicio de la navegación, versión estática;
//   3. con el primer tramo listo, `recorrido-activo`: la sección crece por debajo de la pantalla (sin CLS).
// Carga por tramos: el siguiente se pide cuando empieza el actual. Memoria: solo el tramo visible tiene fotogramas
// decodificados, y solo una ventana alrededor del actual (reproductor.ts); las transiciones usan un fotograma más.
import { Aire, type ConfigAire } from './aire.ts';
import { SecuenciaCanvas } from './reproductor.ts';

interface ConfigTramo {
  id: string;
  fotogramas: number;
  /** Ruta de los fotogramas con %04d (desde 0001). */
  patron: string;
  /** Pantallas de scroll que dura el tramo (1 como mucho). */
  pantallas: number;
  /** Zona del local («puerta» o «barra»). Sin ella, la zona es el id. */
  zona?: string;
  /** Maqueta (excepción a FIDELIDAD, CLAUDE.md): pieza creada con IA a partir de fotogramas reales del local. */
  ia?: 'local';
  /** Grupo de acciones que queda fijo mientras se ve este tramo. */
  panel?: string;
  /**
   * Ritmo: puntos [parte del scroll del tramo, parte de sus fotogramas], de 0 a 1 y en orden; empieza en [0, 0].
   * Dos puntos seguidos con los mismos fotogramas son una pausa. Sin él, los fotogramas pasan a velocidad constante.
   */
  ritmo?: [number, number][];
  /** Zoom extra del efecto de empuje (reproductor.ts). */
  empuje?: number;
  /** Se toma un fotograma de cada tantos (mantiene los nombres y las sumas del material real). */
  paso?: number;
  /** Parte del tramo en la que el último fotograma del tramo anterior se disuelve sobre este. */
  encadenado?: number;
}

/** Grupo de acciones de cada zona cuando el material no lo dice. */
const PANEL_DE_ZONA: Record<string, string> = { aire: 'llegar', puerta: 'menu', barra: 'llamar' };
/** El descenso se queda aquí, con el suelo a la vista, hasta que cierran las nubes. */
const AIRE_DETENIDO = 0.72;
/** Parte del aire con el suelo a la vista; en el resto cierran las nubes. */
const AIRE_ABIERTO = 0.85;
/** Parte del primer tramo en la que las nubes terminan de abrirse sobre él. */
const NUBES_ABREN = 0.16;
/** Tope del velo blanco entre el aire y la puerta: entre las nubes siempre se ve algo. */
const VELO = 0.5;

export interface ConfigRecorrido {
  material: 'real' | 'sintetico' | 'maqueta';
  ancho: number;
  alto: number;
  aire: ConfigAire & { pantallas: number; pnoa: { anio: string } | null; panel?: string };
  tramos: ConfigTramo[];
  /** Piezas de IA usadas en el recorrido (nunca el local): si hay alguna, se declara en los créditos. */
  ia: { es: string; en: string; herramienta: string }[];
}

const BASE = '/recorrido/';
const PLAZO_MS = 3000;
const html = document.documentElement;
const seccion = document.querySelector<HTMLElement>('[data-recorrido]');
const pista = document.querySelector<HTMLElement>('[data-recorrido-pista]');
const canvas = document.querySelector<HTMLCanvasElement>('[data-recorrido-lienzo]');
const controlador = new AbortController();
let terminado = false;

function estatico(motivo: string): void {
  if (terminado) return;
  terminado = true;
  controlador.abort();
  html.classList.remove('recorrido-pendiente', 'recorrido-activo');
  html.classList.add('recorrido-estatico');
  html.dataset.estadoRecorrido = motivo;
}

async function json<T>(url: string): Promise<T> {
  const r = await fetch(url, { signal: controlador.signal, cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return (await r.json()) as T;
}

const suave = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

/** Parte de los fotogramas (de 0 a 1) que toca en el punto `t` del tramo, según su ritmo. */
function avance(ritmo: [number, number][] | undefined, t: number): number {
  if (!ritmo || ritmo.length === 0) return t;
  let [t0, f0] = [0, 0];
  for (const [t1, f1] of ritmo) {
    if (t <= t1) return t1 > t0 ? f0 + ((f1 - f0) * (t - t0)) / (t1 - t0) : f1;
    [t0, f0] = [t1, f1];
  }
  return f0;
}

async function iniciar(): Promise<void> {
  if (!seccion || !pista || !canvas) return estatico('sin-seccion');
  const plazo = setTimeout(() => estatico('lento'), Math.max(0, PLAZO_MS - performance.now()));
  let config: ConfigRecorrido;
  let aire: Aire;
  try {
    const estado = await json<{ recorrido: boolean }>('/recorrido/estado');
    if (!estado.recorrido) return estatico('servidor');
    config = await json<ConfigRecorrido>(`${BASE}recorrido.json`);
    aire = new Aire(canvas, config.aire, BASE);
    await aire.cargar(controlador.signal);
  } catch {
    return estatico('error');
  } finally {
    clearTimeout(plazo);
  }
  if (terminado) return;
  activar(config, aire);
}

function activar(config: ConfigRecorrido, aire: Aire): void {
  if (!seccion || !pista || !canvas) return;
  const tramos = config.tramos.map((t) => ({
    ...t,
    rep: Object.assign(new SecuenciaCanvas(
      canvas,
      Array.from({ length: t.fotogramas }, (_, i) => BASE + t.patron.replace('%04d', String(i * (t.paso ?? 1) + 1).padStart(4, '0'))),
      config.ancho,
      config.alto,
    ), { activo: false, empuje: t.empuje ?? 0 }),
    pedido: false,
  }));
  // Si el tramo se está viendo cuando termina una fase de su carga, se vuelve a pintar: sin scroll (por ejemplo, quieto
  // en una zona a la que se ha saltado), el fotograma que toca no se pintaría hasta el siguiente movimiento.
  const redibujarSiSeVe = (i: number) => {
    if (i !== tramoVisible) return;
    tramos[i].rep.invalidar();
    requestAnimationFrame(actualizar);
  };
  const pedir = (i: number) => {
    const t = tramos[i];
    if (!t || t.pedido) return;
    t.pedido = true;
    t.rep
      .cargarProgresivo(controlador.signal)
      .then(() => {
        redibujarSiSeVe(i);
        return t.rep.completo;
      })
      .then(() => redibujarSiSeVe(i))
      .catch(() => {});
  };

  // Créditos: IA declarada si hay alguna pieza; atribución del PNOA al pie del tramo aéreo.
  const iaLocal = config.tramos.some((t) => t.ia === 'local');
  const ia = seccion.querySelector<HTMLElement>('[data-recorrido-ia]');
  if (ia && config.ia.length > 0) {
    const idioma = html.lang === 'en' ? 'en' : 'es';
    const lista = ia.querySelector('[data-lista]');
    if (lista) lista.textContent = config.ia.map((p) => `${p[idioma]} (${p.herramienta})`).join(', ');
    // Con piezas de IA del local (maqueta), «el local sale solo en vídeo real» ya no es verdad: se quita.
    if (iaLocal) ia.querySelector('[data-solo-real]')?.remove();
    ia.removeAttribute('hidden');
  }
  if (iaLocal) seccion.querySelector<HTMLElement>('[data-recorrido-ia-local]')?.removeAttribute('hidden');
  const etiquetaIa = seccion.querySelector<HTMLElement>('[data-recorrido-etiqueta-ia]');
  if (config.material === 'sintetico') seccion.querySelector<HTMLElement>('[data-recorrido-sintetico]')?.removeAttribute('hidden');
  const pnoa = seccion.querySelector<HTMLElement>('[data-recorrido-pnoa]');
  if (pnoa && config.aire.pnoa) {
    const anio = pnoa.querySelector('[data-anio]');
    if (anio) anio.textContent = config.aire.pnoa.anio;
    pnoa.removeAttribute('hidden');
  }

  // Partes del recorrido: el aire (tramo -1) y cada tramo, con su grupo de acciones.
  interface Parte {
    tramo: number;
    pantallas: number;
    panel?: HTMLElement;
  }
  const paneles = new Map([...seccion.querySelectorAll<HTMLElement>('[data-parada]')].map((p) => [p.dataset.parada ?? '', p]));
  const panelDe = (panel: string | undefined, zona: string) => paneles.get(panel ?? PANEL_DE_ZONA[zona] ?? '');
  const partes: Parte[] = [
    { tramo: -1, pantallas: config.aire.pantallas, panel: panelDe(config.aire.panel, 'aire') },
    ...tramos.map((t, i) => ({ tramo: i, pantallas: t.pantallas, panel: panelDe(t.panel, t.zona ?? t.id) })),
  ];
  // Las pantallas de cada parte son pantallas de scroll: la pista mide una más, la del propio escenario.
  const total = partes.reduce((a, p) => a + p.pantallas, 0);
  pista.style.setProperty('--recorrido-pantallas', String(total + 1));
  pista.dataset.pantallas = String(total);

  // El horario de hoy, en la hora de Madrid, de los siete que trae la página.
  const hoy = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', weekday: 'long' }).format(new Date()).toLowerCase();
  seccion.querySelector<HTMLElement>(`[data-dia-en="${hoy}"]`)?.removeAttribute('hidden');
  html.classList.remove('recorrido-pendiente');
  html.classList.add('recorrido-activo');
  html.dataset.estadoRecorrido = 'activo';
  // Nada más del recorrido hasta que la persona empieza a bajar: «≤ 1 MB antes del recorrido» (presupuesto).
  let empezado = false;
  const empezar = () => {
    if (empezado) return;
    empezado = true;
    aire.cargarResto();
    pedir(0);
  };

  // Fotograma suelto de las transiciones: el primero de la puerta bajo las nubes del aire y el último del tramo
  // anterior en un encadenado. Solo uno a la vez; se cierra al salir de la transición.
  let puente: { tramo: number; indice: number; bitmap?: ImageBitmap } | null = null;
  const soltarPuente = () => {
    puente?.bitmap?.close();
    puente = null;
  };
  const pedirPuente = (tramo: number, indice: number): ImageBitmap | undefined => {
    if (puente?.tramo === tramo && puente.indice === indice) return puente.bitmap;
    soltarPuente();
    const actual: NonNullable<typeof puente> = { tramo, indice };
    puente = actual;
    void tramos[tramo].rep
      .suelto(indice)
      .then((bitmap) => {
        if (puente !== actual) return bitmap?.close();
        // Sin descargar todavía: se vuelve a pedir en el siguiente pintado.
        if (!bitmap) return void (puente = null);
        actual.bitmap = bitmap;
        if (tramoVisible >= 0) tramos[tramoVisible].rep.invalidar();
        requestAnimationFrame(actualizar);
      })
      .catch(() => {
        if (puente === actual) puente = null;
      });
    return undefined;
  };

  const rotulo = seccion.querySelector<HTMLElement>('[data-rotulo="aire"]');
  let visible = -1;
  let tramoVisible = -1;
  let pendiente = false;

  const actualizar = () => {
    pendiente = false;
    const caja = pista.getBoundingClientRect();
    const recorrido = caja.height - innerHeight;
    // Ventana más alta que la pista (captura de página completa): no hay recorrido que mover ni nada que pedir.
    if (recorrido <= 0) return;
    const progreso = Math.min(1, Math.max(0, -caja.top / recorrido)) * total;
    let indice = 0;
    let inicio = 0;
    while (indice < partes.length - 1 && progreso > inicio + partes[indice].pantallas) inicio += partes[indice++].pantallas;
    const parte = partes[indice];
    const t = Math.min(1, (progreso - inicio) / parte.pantallas);
    const tramo = parte.tramo;

    if (indice !== visible) {
      if (tramo !== tramoVisible) {
        // El tramo que deja de verse suelta sus fotogramas decodificados; se pide el siguiente al que entra.
        if (tramoVisible >= 0) {
          tramos[tramoVisible].rep.activo = false;
          tramos[tramoVisible].rep.encima = undefined;
          tramos[tramoVisible].rep.soltarDecodificados();
        }
        if (tramo >= 0) {
          tramos[tramo].rep.activo = true;
          tramos[tramo].rep.invalidar();
        }
        tramoVisible = tramo;
      }
      if (empezado) {
        pedir(tramo);
        pedir(tramo + 1);
      }
      visible = indice;
      seccion.dataset.parte = tramo < 0 ? 'aire' : tramos[tramo].id;
      for (const p of paneles.values()) p.classList.toggle('recorrido__parada--visible', p === parte.panel);
    }
    // La etiqueta de IA del local, mientras se ve una pieza de la maqueta.
    if (etiquetaIa) etiquetaIa.hidden = !(tramo >= 0 && tramos[tramo].ia === 'local');
    if (tramo < 0) {
      if (t < AIRE_ABIERTO) {
        soltarPuente();
        aire.pintar((t / AIRE_ABIERTO) * AIRE_DETENIDO, 0.35 - 0.3 * suave(t / AIRE_ABIERTO / 0.8));
      } else {
        // Cierran las nubes y, debajo, la ortofoto deja paso al primer fotograma de la puerta.
        const cierre = suave((t - AIRE_ABIERTO) / (1 - AIRE_ABIERTO));
        const puerta = tramos.length > 0 ? pedirPuente(0, 0) : undefined;
        aire.pintar(AIRE_DETENIDO + (1 - AIRE_DETENIDO) * cierre, 0.05 + 0.95 * cierre, puerta && { fuente: puerta, alfa: suave((cierre - 0.3) / 0.7) }, VELO);
      }
    } else {
      const { rep, encadenado = 0, ritmo } = tramos[tramo];
      // Al empezar el primer tramo, las nubes se abren sobre él; en los demás, el anterior se disuelve.
      const nubes = tramo === 0 ? 1 - suave(t / NUBES_ABREN) : 0;
      const mezcla = tramo > 0 && encadenado > 0 && t < encadenado ? 1 - suave(t / encadenado) : 0;
      const anterior = mezcla > 0 ? pedirPuente(tramo - 1, -1) : undefined;
      if (mezcla === 0) soltarPuente();
      // Lo que va encima se pinta con cada fotograma, también con los que llegan al terminar de decodificarse.
      rep.encima =
        nubes > 0 || anterior
          ? () => {
              if (anterior) rep.pintarEncima(anterior, mezcla);
              if (nubes > 0) aire.pintarNubes(1 + t, nubes, VELO);
            }
          : undefined;
      if (rep.encima) rep.invalidar();
      rep.mostrar(avance(ritmo, t) * (rep.fotogramas - 1));
    }
    // El nombre y la dirección, mientras se ve el suelo.
    if (rotulo) rotulo.style.opacity = String(tramo < 0 ? 1 - suave((t - AIRE_ABIERTO + 0.12) / 0.12) : 0);
    if (pnoa) pnoa.classList.toggle('recorrido__pnoa--oculta', tramo >= 0);
  };

  addEventListener(
    'scroll',
    () => {
      if (scrollY > 0 && innerHeight < pista.offsetHeight) {
        empezar();
        // El siguiente tramo, en cuanto se ve el actual (el primero lo pide empezar()).
        if (tramoVisible >= 0) pedir(tramoVisible + 1);
      }
      if (!pendiente) {
        pendiente = true;
        requestAnimationFrame(actualizar);
      }
    },
    { passive: true },
  );
  addEventListener('resize', () => requestAnimationFrame(actualizar), { passive: true });
  actualizar();
}

if (html.classList.contains('recorrido-pendiente')) void iniciar();
