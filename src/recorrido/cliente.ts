// Recorrido de la portada (F2): aire y piezas, movido por el scroll nativo.
// Las acciones (Recorrido.astro) son las que ya existen en la portada. Con «panel» en recorrido.json, en el aire y en
// cada tramo, cada grupo queda fijo durante toda su zona y se va con un fundido. Sin ese campo (material real), hay
// dos paradas de media pantalla: la de la puerta tras su zona y la de la barra tras la suya.
// Progresivo: la portada de F1 está completa en el HTML. El script de <head> (Recorrido.astro) solo marca
// `recorrido-pendiente` si no hay «reducir movimiento», ahorro de datos ni red lenta. Aquí:
//   1. se pregunta al Worker (/recorrido/estado), que dice que no si llega la cabecera Save-Data;
//   2. se carga el primer tramo; si no está en 3 s desde el inicio de la navegación, versión estática;
//   3. con el primer tramo listo, `recorrido-activo`: la sección crece por debajo de la pantalla (sin CLS).
// Carga por tramos: el siguiente se pide cuando empieza el actual. Memoria: solo el tramo visible tiene fotogramas
// decodificados, y solo una ventana alrededor del actual (reproductor.ts).
import { Aire, type ConfigAire } from './aire.ts';
import { SecuenciaCanvas } from './reproductor.ts';

interface ConfigTramo {
  id: string;
  fotogramas: number;
  /** Ruta de los fotogramas con %04d (desde 0001). */
  patron: string;
  /** Pantallas de scroll que dura el tramo (1 como mucho). */
  pantallas: number;
  /** Zona del local («puerta» o «barra»): su rótulo y su parada. Sin ella, la zona es el id. */
  zona?: string;
  /** Maqueta (excepción a FIDELIDAD, CLAUDE.md): pieza creada con IA a partir de fotogramas reales del local. */
  ia?: 'local';
  /** Grupo de acciones que queda fijo mientras se ve este tramo. */
  panel?: string;
  /** Parte del tramo en la que pasan sus fotogramas (de 0 a 1); el resto, quieto en el último. */
  fin?: number;
  /** Zoom extra del efecto de empuje (reproductor.ts). */
  empuje?: number;
  /** Se toma un fotograma de cada tantos (mantiene los nombres y las sumas del material real). */
  paso?: number;
  /** El tramo acaba en luz y se funde con la crema de la página. */
  fundido?: boolean;
}

/** Pantallas de scroll de cada parada con acciones (material sin paneles). */
const PANTALLAS_PARADA = 0.5;
/** Con panel en el aire, el descenso se queda aquí, con el suelo a la vista, hasta que cierran las nubes. */
const AIRE_DETENIDO = 0.72;
/** Parte del aire con el suelo a la vista; en el resto cierran las nubes. */
const AIRE_ABIERTO = 0.75;

export interface ConfigRecorrido {
  material: 'real' | 'sintetico';
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
  // en una parada a la que se ha saltado), el fotograma que toca no se pintaría hasta el siguiente movimiento.
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
  const fundido = seccion.querySelector<HTMLElement>('[data-recorrido-fundido]');
  if (config.material === 'sintetico') seccion.querySelector<HTMLElement>('[data-recorrido-sintetico]')?.removeAttribute('hidden');
  const pnoa = seccion.querySelector<HTMLElement>('[data-recorrido-pnoa]');
  if (pnoa && config.aire.pnoa) {
    const anio = pnoa.querySelector('[data-anio]');
    if (anio) anio.textContent = config.aire.pnoa.anio;
    pnoa.removeAttribute('hidden');
  }

  // Partes del recorrido: el aire, cada tramo y sus paradas. El tramo -1 de una parada es el aire.
  type Parte =
    | { tipo: 'aire'; pantallas: number; panel?: HTMLElement }
    | { tipo: 'tramo'; tramo: number; pantallas: number; primeroDeZona: boolean; panel?: HTMLElement }
    | { tipo: 'parada'; tramo: number; pantallas: number; panel: HTMLElement; zona: string };
  const zonaDe = (t: ConfigTramo) => t.zona ?? t.id;
  const paneles = new Map([...seccion.querySelectorAll<HTMLElement>('[data-parada]')].map((p) => [p.dataset.parada ?? '', p]));
  const conPaneles = Boolean(config.aire.panel);
  const partes: Parte[] = [{ tipo: 'aire', pantallas: config.aire.pantallas, panel: paneles.get(config.aire.panel ?? '') }];
  tramos.forEach((t, i) => {
    const zona = zonaDe(t);
    partes.push({ tipo: 'tramo', tramo: i, pantallas: t.pantallas, primeroDeZona: i === 0 || zonaDe(tramos[i - 1]) !== zona, panel: paneles.get(t.panel ?? '') });
    const ultimoDeZona = i === tramos.length - 1 || zonaDe(tramos[i + 1]) !== zona;
    const panel = !conPaneles && ultimoDeZona ? paneles.get(zona) : undefined;
    if (panel) partes.push({ tipo: 'parada', tramo: i, pantallas: PANTALLAS_PARADA, panel, zona });
  });
  // Con paneles, las pantallas de cada parte son pantallas de scroll: la pista mide una más, la del propio escenario.
  // Sin paneles, la suma ya la incluye. Cada parte avanza en proporción a sus pantallas a lo largo de lo que se desplaza.
  const total = partes.reduce((a, p) => a + p.pantallas, 0);
  pista.style.setProperty('--recorrido-pantallas', String(Math.max(conPaneles ? total + 1 : total, 1)));
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

  const rotulos = [...seccion.querySelectorAll<HTMLElement>('[data-rotulo]')];
  /** Tramo que se ve en la parte (el aire no tiene; la parada enseña el de su zona). */
  const tramoDe = (p: Parte) => (p.tipo === 'aire' ? -1 : p.tramo);
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
    const tramo = tramoDe(parte);

    if (indice !== visible) {
      if (tramo !== tramoVisible) {
        // El tramo que deja de verse suelta sus fotogramas decodificados; se pide el siguiente al que entra.
        if (tramoVisible >= 0) {
          tramos[tramoVisible].rep.activo = false;
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
      seccion.dataset.parte = parte.tipo === 'aire' ? 'aire' : parte.tipo === 'parada' ? `parada-${parte.zona}` : tramos[parte.tramo].id;
      for (const p of paneles.values()) p.classList.toggle('recorrido__parada--visible', p === parte.panel);
    }
    // La etiqueta de IA del local, mientras se ve una pieza de la maqueta. Sobre la crema del fundido ya no se ve ninguna.
    if (etiquetaIa) etiquetaIa.hidden = !(tramo >= 0 && tramos[tramo].ia === 'local') || Boolean(tramo >= 0 && tramos[tramo].fundido && t > 0.95);
    if (fundido) {
      const seFunde = tramo >= 0 && tramos[tramo].fundido;
      fundido.style.opacity = String(seFunde ? suave((t - 0.55) / 0.4) : 0);
    }
    if (parte.tipo === 'aire') {
      if (!conPaneles) aire.pintar(t);
      else if (t < AIRE_ABIERTO) aire.pintar((t / AIRE_ABIERTO) * AIRE_DETENIDO, 0.35 - 0.3 * suave(t / AIRE_ABIERTO / 0.8));
      else {
        const cierre = suave((t - AIRE_ABIERTO) / (1 - AIRE_ABIERTO));
        aire.pintar(AIRE_DETENIDO + (1 - AIRE_DETENIDO) * cierre, 0.05 + 0.95 * cierre);
      }
    } else {
      const rep = tramos[tramo].rep;
      if (parte.tipo === 'parada') {
        // La parada deja quieto el último fotograma de su zona.
        rep.mostrar(rep.fotogramas - 1);
      } else {
        // Al empezar el primer tramo, las nubes se abren sobre él.
        const nubes = tramo === 0 ? 1 - suave(t / 0.25) : 0;
        if (nubes > 0) rep.invalidar();
        rep.mostrar(Math.min(1, t / (tramos[tramo].fin ?? 1)) * (rep.fotogramas - 1));
        if (nubes > 0) aire.pintarNubes(1 + t, nubes);
      }
    }
    // Rótulos: el del aire, al empezar; el de cada zona, dentro de su primer tramo.
    const zonaVisible = parte.tipo === 'tramo' && parte.primeroDeZona ? zonaDe(tramos[parte.tramo]) : null;
    for (const r of rotulos) {
      const enSuParte = r.dataset.rotulo === 'aire' ? parte.tipo === 'aire' : r.dataset.rotulo === zonaVisible;
      const o = enSuParte ? suave((t - 0.08) / 0.15) * (1 - suave((t - 0.75) / 0.15)) : 0;
      r.style.opacity = String(r.dataset.rotulo === 'aire' && parte.tipo === 'aire' ? Math.max(o, 1 - suave(t / 0.6)) : o);
    }
    if (pnoa) pnoa.classList.toggle('recorrido__pnoa--oculta', parte.tipo !== 'aire');
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
