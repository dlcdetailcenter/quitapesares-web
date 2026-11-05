// Recorrido de la portada (F2): aire, piezas y paradas, movido por el scroll nativo.
// Las paradas (Recorrido.astro) son acciones que ya existen en la portada. Cada una ocupa media pantalla y deja quieto
// el último fotograma de lo que tiene delante. Las dice «parada» en recorrido.json, en el aire y en cada tramo; sin ese
// campo (material real), la de la puerta tras su zona y la de la barra tras la suya.
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
  /** Parada que va después de este tramo. */
  parada?: string;
  /** El tramo acaba en luz y se funde con la crema de la página. */
  fundido?: boolean;
}

/** Pantallas de scroll de cada parada con acciones (al final de la puerta y de la barra). */
const PANTALLAS_PARADA = 0.5;

export interface ConfigRecorrido {
  material: 'real' | 'sintetico';
  ancho: number;
  alto: number;
  aire: ConfigAire & { pantallas: number; pnoa: { anio: string } | null; parada?: string };
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
      Array.from({ length: t.fotogramas }, (_, i) => BASE + t.patron.replace('%04d', String(i + 1).padStart(4, '0'))),
      config.ancho,
      config.alto,
    ), { activo: false }),
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
    | { tipo: 'aire'; pantallas: number }
    | { tipo: 'tramo'; tramo: number; pantallas: number; primeroDeZona: boolean }
    | { tipo: 'parada'; tramo: number; pantallas: number; panel: HTMLElement; zona: string };
  const zonaDe = (t: ConfigTramo) => t.zona ?? t.id;
  const paneles = new Map([...seccion.querySelectorAll<HTMLElement>('[data-parada]')].map((p) => [p.dataset.parada ?? '', p]));
  const partes: Parte[] = [{ tipo: 'aire', pantallas: config.aire.pantallas }];
  const panelDelAire = config.aire.parada ? paneles.get(config.aire.parada) : undefined;
  if (panelDelAire && config.aire.parada) partes.push({ tipo: 'parada', tramo: -1, pantallas: PANTALLAS_PARADA, panel: panelDelAire, zona: config.aire.parada });
  tramos.forEach((t, i) => {
    const zona = zonaDe(t);
    partes.push({ tipo: 'tramo', tramo: i, pantallas: t.pantallas, primeroDeZona: i === 0 || zonaDe(tramos[i - 1]) !== zona });
    const ultimoDeZona = i === tramos.length - 1 || zonaDe(tramos[i + 1]) !== zona;
    const clave = t.parada ?? (ultimoDeZona ? zona : undefined);
    const panel = clave ? paneles.get(clave) : undefined;
    if (panel && clave) partes.push({ tipo: 'parada', tramo: i, pantallas: PANTALLAS_PARADA, panel, zona: clave });
  });
  // Alto de la pista: la suma de las pantallas de todas las partes, con la del propio escenario incluida (4 con
  // aire, puerta, barra y dos paradas). Cada parte avanza en proporción a sus pantallas a lo largo de lo que se desplaza.
  const total = partes.reduce((a, p) => a + p.pantallas, 0);
  pista.style.setProperty('--recorrido-pantallas', String(Math.max(total, 1)));
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
      for (const p of partes) if (p.tipo === 'parada') p.panel.classList.toggle('recorrido__parada--visible', p === parte);
      // La etiqueta de IA del local, mientras se ve una pieza de la maqueta (también en su parada, que la deja quieta).
      if (etiquetaIa) etiquetaIa.hidden = !(tramo >= 0 && tramos[tramo].ia === 'local');
    }
    if (fundido) {
      const seFunde = tramo >= 0 && tramos[tramo].fundido;
      fundido.style.opacity = String(!seFunde ? 0 : parte.tipo === 'parada' ? 1 : suave((t - 0.55) / 0.45));
    }
    if (parte.tipo === 'aire' || tramo < 0) {
      aire.pintar(parte.tipo === 'aire' ? t : 1);
    } else {
      const rep = tramos[tramo].rep;
      if (parte.tipo === 'parada') {
        // La parada deja quieto el último fotograma de su zona.
        rep.mostrar(rep.fotogramas - 1);
      } else {
        // Al empezar el primer tramo, las nubes se abren sobre él.
        const nubes = tramo === 0 ? 1 - suave(t / 0.25) : 0;
        if (nubes > 0) rep.invalidar();
        rep.mostrar(t * (rep.fotogramas - 1));
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
