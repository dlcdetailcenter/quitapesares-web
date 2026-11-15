// Recorrido de la portada (F2): aire y piezas, movido por el scroll nativo.
// Las acciones (Recorrido.astro) son las que ya existen en la portada. Cada zona tiene su grupo, fijo mientras se ve:
// lo dice «panel» en recorrido.json, en el aire y en cada tramo; sin ese campo, el de su zona (PANEL_DE_ZONA).
// Progresivo: la portada de F1 está completa en el HTML. El script de <head> (Recorrido.astro) solo marca
// `recorrido-pendiente` si no hay «reducir movimiento», ahorro de datos ni red lenta. Aquí:
//   1. se pregunta al Worker (/recorrido/estado), que dice que no si llega la cabecera Save-Data;
//   2. se carga el primer tramo; si no está en 3 s desde el inicio de la navegación, versión estática (no cuenta lo
//      que se haya esperado al primer pintado del navegador: el plazo mide la red);
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
  /**
   * Maqueta (excepción a FIDELIDAD, CLAUDE.md): pieza creada con IA a partir de fotogramas reales del local. Aquí no
   * se usa: es el registro que hace fallar build:produccion (scripts/datos/integracion-astro.mjs).
   */
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
  /**
   * Con «encadenado»: el paso es un barrido de cámara hecho en el lienzo, con estela (reproductor.ts). 1, la imagen
   * se va hacia la derecha; -1, hacia la izquierda.
   */
  barrido?: 1 | -1;
}

/** Grupo de acciones de cada zona cuando el material no lo dice. */
const PANEL_DE_ZONA: Record<string, string> = { aire: 'llegar', puerta: 'menu', barra: 'llamar' };
/** El descenso se queda aquí, en el nivel más cercano de la ortofoto y sin mezclar con otro, hasta que cierran las nubes. */
const AIRE_DETENIDO = 0.85;
/** Parte del aire con el suelo a la vista; en el resto cierran las nubes. */
const AIRE_ABIERTO = 0.88;
/** Parte del primer tramo en la que las nubes terminan de abrirse sobre él. */
const NUBES_ABREN = 0.13;
/** Bruma sobre la ortofoto al empezar: poca, para que el nombre se lea. */
const BRUMA = 0.2;
/** Tope del velo blanco entre el aire y la puerta: entre las nubes siempre se ve algo. */
const VELO = 0.5;
/** Barrido entre dos piezas: cuánto se desplaza cada imagen y cuánto mide la estela, en anchos del lienzo. */
const BARRIDO_PASO = 0.4;
const BARRIDO_ESTELA = 0.22;

export interface ConfigRecorrido {
  material: 'real' | 'sintetico' | 'maqueta';
  ancho: number;
  alto: number;
  aire: ConfigAire & { pantallas: number; pnoa: { anio: string } | null; panel?: string };
  tramos: ConfigTramo[];
  /**
   * Registro de las piezas hechas con IA que no son el local (las nubes). No se muestra en la página (decisión de Kara
   * del 2026-11-10): queda aquí, en recorrido.json, y en docs/inventario-material.md.
   */
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

/** `espera`: milisegundos que se ha esperado al primer pintado antes de empezar; no cuentan en el plazo. */
async function iniciar(espera: number): Promise<void> {
  if (!seccion || !pista || !canvas) return estatico('sin-seccion');
  const plazo = setTimeout(() => estatico('lento'), Math.max(0, PLAZO_MS + espera - performance.now()));
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

  // El material de prueba lo dice bajo el recorrido; la atribución del PNOA, al pie del tramo aéreo.
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
    if (tramo < 0) {
      if (t < AIRE_ABIERTO) {
        soltarPuente();
        aire.pintar((t / AIRE_ABIERTO) * AIRE_DETENIDO, BRUMA - (BRUMA - 0.05) * suave(t / AIRE_ABIERTO / 0.8));
      } else {
        // Cierran las nubes y, debajo, la ortofoto deja paso al primer fotograma de la puerta.
        const cierre = suave((t - AIRE_ABIERTO) / (1 - AIRE_ABIERTO));
        const puerta = tramos.length > 0 ? pedirPuente(0, 0) : undefined;
        aire.pintar(AIRE_DETENIDO + (1 - AIRE_DETENIDO) * cierre, 0.05 + 0.95 * cierre, puerta && { fuente: puerta, alfa: suave((cierre - 0.3) / 0.7) }, VELO);
      }
    } else {
      const { rep, encadenado = 0, barrido, ritmo } = tramos[tramo];
      // Al empezar el primer tramo, las nubes se abren sobre él; en los demás, el anterior se disuelve o se barre.
      const nubes = tramo === 0 ? 1 - suave(t / NUBES_ABREN) : 0;
      const paso = tramo > 0 && encadenado > 0 && t < encadenado ? t / encadenado : 1;
      const anterior = paso < 1 ? pedirPuente(tramo - 1, -1) : undefined;
      if (paso === 1) soltarPuente();
      // Lo que va encima se pinta con cada fotograma, también con los que llegan al terminar de decodificarse.
      if (paso < 1 && barrido) {
        // Barrido: la imagen que se va y la que llega se desplazan con estela y se cruzan a mitad de camino.
        const avanzado = suave(paso);
        const estela = Math.sin(Math.PI * paso) * BARRIDO_ESTELA;
        const sale = 1 - suave((paso - 0.3) / 0.4);
        const zoomAnterior = 1 + (tramos[tramo - 1].empuje ?? 0);
        rep.encima = () => {
          rep.barrerActual(-barrido * (1 - avanzado) * BARRIDO_PASO, estela);
          if (anterior) rep.pintarBarrido(anterior, barrido * avanzado * BARRIDO_PASO, estela, sale, zoomAnterior);
        };
      } else if (nubes > 0 || anterior) {
        rep.encima = () => {
          if (anterior) rep.pintarEncima(anterior, 1 - suave(paso));
          if (nubes > 0) aire.pintarNubes(1 + t, nubes, VELO);
        };
      } else rep.encima = undefined;
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

// El primer pintado va antes: el nombre, la cabecera y la barra ya están en el HTML. El recorrido empieza a pedir su
// material cuando el navegador avisa de que ya ha pintado contenido (o, sin ese aviso, en el segundo fotograma), para
// no competir con él. Lo que dure esa espera no cuenta en el plazo de 3 s (iniciar): ese plazo decide entre recorrido
// y versión estática según la red, no según cuándo pinta el navegador. Con la pestaña oculta no se pinta nada: empieza
// ya. Y si el aviso no llegara, empieza al acabar la espera máxima.
const ESPERA_PINTADO_MS = 2500;
if (html.classList.contains('recorrido-pendiente')) {
  const alCargar = performance.now();
  let arrancado = false;
  const arrancar = () => {
    if (arrancado) return;
    arrancado = true;
    void iniciar(performance.now() - alCargar);
  };
  if (document.visibilityState !== 'visible') arrancar();
  else {
    if (typeof PerformanceObserver !== 'undefined' && (PerformanceObserver.supportedEntryTypes ?? []).includes('paint')) {
      new PerformanceObserver((lista, observador) => {
        if (lista.getEntriesByName('first-contentful-paint').length === 0) return;
        observador.disconnect();
        arrancar();
      }).observe({ type: 'paint', buffered: true });
    } else requestAnimationFrame(() => requestAnimationFrame(arrancar));
    document.addEventListener('visibilitychange', arrancar, { once: true });
    setTimeout(arrancar, ESPERA_PINTADO_MS);
  }
}
