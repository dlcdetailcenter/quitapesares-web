// Recorrido de la portada (F2): aire → puerta → barra → comedor, movido por el scroll nativo.
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
  /** Pantallas de scroll que dura el tramo. */
  pantallas: number;
}

export interface ConfigRecorrido {
  material: 'real' | 'sintetico';
  ancho: number;
  alto: number;
  aire: ConfigAire & { pantallas: number; pnoa: { anio: string } | null };
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
  const pedir = (i: number) => {
    const t = tramos[i];
    if (!t || t.pedido) return;
    t.pedido = true;
    t.rep.cargarProgresivo(controlador.signal).catch(() => {});
  };

  // Créditos: IA declarada si hay alguna pieza; atribución del PNOA al pie del tramo aéreo.
  const ia = seccion.querySelector<HTMLElement>('[data-recorrido-ia]');
  if (ia && config.ia.length > 0) {
    const idioma = html.lang === 'en' ? 'en' : 'es';
    const lista = ia.querySelector('[data-lista]');
    if (lista) lista.textContent = config.ia.map((p) => `${p[idioma]} (${p.herramienta})`).join(', ');
    ia.removeAttribute('hidden');
  }
  if (config.material === 'sintetico') seccion.querySelector<HTMLElement>('[data-recorrido-sintetico]')?.removeAttribute('hidden');
  const pnoa = seccion.querySelector<HTMLElement>('[data-recorrido-pnoa]');
  if (pnoa && config.aire.pnoa) {
    const anio = pnoa.querySelector('[data-anio]');
    if (anio) anio.textContent = config.aire.pnoa.anio;
    pnoa.removeAttribute('hidden');
  }

  // Alto de la pista: la suma de las pantallas de todas las partes, con la del propio escenario incluida (3 en total
  // con aire, puerta y barra). Cada parte avanza en proporción a sus pantallas a lo largo de lo que se desplaza.
  const partes = [config.aire.pantallas, ...tramos.map((t) => t.pantallas)];
  const total = partes.reduce((a, b) => a + b, 0);
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
  let visible = -1;
  let pendiente = false;

  const actualizar = () => {
    pendiente = false;
    const caja = pista.getBoundingClientRect();
    const recorrido = caja.height - innerHeight;
    // Ventana más alta que la pista (captura de página completa): no hay recorrido que mover ni nada que pedir.
    if (recorrido <= 0) return;
    const progreso = Math.min(1, Math.max(0, -caja.top / recorrido)) * total;
    let parte = 0;
    let inicio = 0;
    while (parte < partes.length - 1 && progreso > inicio + partes[parte]) inicio += partes[parte++];
    const t = Math.min(1, (progreso - inicio) / partes[parte]);

    if (parte !== visible) {
      // El tramo que deja de verse suelta sus fotogramas decodificados; se pide el siguiente al que entra.
      if (visible > 0) {
        tramos[visible - 1].rep.activo = false;
        tramos[visible - 1].rep.soltarDecodificados();
      }
      if (parte > 0) {
        tramos[parte - 1].rep.activo = true;
        tramos[parte - 1].rep.invalidar();
      }
      if (empezado) pedir(parte);
      visible = parte;
      seccion.dataset.parte = parte === 0 ? 'aire' : tramos[parte - 1].id;
    }
    if (parte === 0) {
      aire.pintar(t);
    } else {
      const rep = tramos[parte - 1].rep;
      // Al empezar la puerta, las nubes se abren sobre ella.
      const nubes = parte === 1 ? 1 - suave(t / 0.25) : 0;
      if (nubes > 0) rep.invalidar();
      rep.mostrar(t * (rep.fotogramas - 1));
      if (nubes > 0) aire.pintarNubes(1 + t, nubes);
    }
    // Rótulo de cada parte: aparece y se va dentro de su tramo.
    rotulos.forEach((r, i) => {
      const o = i === parte ? suave((t - 0.08) / 0.15) * (1 - suave((t - 0.75) / 0.15)) : 0;
      r.style.opacity = String(i === 0 && parte === 0 ? Math.max(o, 1 - suave(t / 0.6)) : o);
    });
    if (pnoa) pnoa.classList.toggle('recorrido__pnoa--oculta', parte !== 0);
  };

  addEventListener(
    'scroll',
    () => {
      if (scrollY > 0 && innerHeight < pista.offsetHeight) {
        empezar();
        if (visible > 0) pedir(visible);
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
