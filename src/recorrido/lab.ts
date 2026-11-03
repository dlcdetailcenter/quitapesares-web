// /lab/scroll: el mismo tramo con los dos métodos (secuencia en canvas o vídeo con currentTime), para medirlos con
// Playwright (scripts/lab/medir.mjs) y para que Kara los compare en sus móviles. Muestra las cifras en pantalla.
import { SecuenciaCanvas, VideoScrub, type Reproductor } from './reproductor.ts';

interface MaterialLab {
  fps: number;
  ancho: number;
  alto: number;
  fotogramas: number;
  canvas: { patron: string };
  video: { archivo: string };
}

interface Medicion {
  metodo: string;
  pintados: { indice: number; instante: number }[];
  primerFotograma: number | null;
  bytes: number;
  listo: boolean;
  error: string | null;
}

declare global {
  interface Window {
    __lab: Medicion;
  }
}

const BASE = '/recorrido/lab/';
const metodo = new URLSearchParams(location.search).get('metodo') === 'video' ? 'video' : 'canvas';
const medicion: Medicion = { metodo, pintados: [], primerFotograma: null, bytes: 0, listo: false, error: null };
window.__lab = medicion;

const zona = document.querySelector<HTMLElement>('[data-lab-zona]');
const canvas = document.querySelector<HTMLCanvasElement>('[data-lab-canvas]');
const video = document.querySelector<HTMLVideoElement>('[data-lab-video]');
const cifras = document.querySelector<HTMLElement>('[data-lab-cifras]');

function percentil(valores: number[], p: number): number {
  if (valores.length === 0) return NaN;
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.floor((p / 100) * orden.length))];
}

function escribir(texto: string): void {
  if (cifras) cifras.textContent = texto;
}

async function iniciar(): Promise<void> {
  if (!zona || !canvas || !video) return;
  document.querySelectorAll<HTMLElement>('[data-lab-metodo]').forEach((a) => {
    if (a.dataset.labMetodo === metodo) a.setAttribute('aria-current', 'page');
  });
  const r = await fetch(`${BASE}lab.json`);
  if (!r.ok) {
    medicion.error = 'sin material';
    escribir('Esta compilación no tiene material de laboratorio.');
    return;
  }
  const m = (await r.json()) as MaterialLab;
  let rep: Reproductor;
  if (metodo === 'canvas') {
    video.hidden = true;
    const urls = Array.from({ length: m.fotogramas }, (_, i) => BASE + m.canvas.patron.replace('%04d', String(i + 1).padStart(4, '0')));
    rep = new SecuenciaCanvas(canvas, urls, m.ancho, m.alto);
  } else {
    canvas.hidden = true;
    rep = new VideoScrub(video, BASE + m.video.archivo, m.fotogramas, m.fps);
  }
  rep.onPintado = (indice, instante) => {
    if (medicion.primerFotograma === null) medicion.primerFotograma = instante;
    medicion.pintados.push({ indice, instante });
  };
  try {
    await rep.cargar();
  } catch (e) {
    medicion.error = String(e);
    escribir(`Error: ${medicion.error}`);
    return;
  }
  medicion.bytes = rep.bytes;
  medicion.listo = true;

  let pendiente = false;
  const actualizar = () => {
    pendiente = false;
    const caja = zona.getBoundingClientRect();
    const recorrido = caja.height - innerHeight;
    const t = Math.min(1, Math.max(0, -caja.top / recorrido));
    rep.mostrar(t * (rep.fotogramas - 1));
  };
  addEventListener('scroll', () => {
    if (!pendiente) {
      pendiente = true;
      requestAnimationFrame(actualizar);
    }
  }, { passive: true });
  actualizar();

  // Cifras en pantalla cada medio segundo: intervalos entre fotogramas nuevos de los últimos 3 s.
  setInterval(() => {
    const ahora = performance.now();
    const recientes = medicion.pintados.filter((p) => ahora - p.instante < 3000);
    const intervalos = recientes.slice(1).map((p, i) => p.instante - recientes[i].instante);
    const p50 = percentil(intervalos, 50);
    const p95 = percentil(intervalos, 95);
    escribir(
      `${metodo} · ${(medicion.bytes / 1024 / 1024).toFixed(2)} MB · primer fotograma ${Math.round(medicion.primerFotograma ?? 0)} ms` +
        (intervalos.length > 5 ? ` · intervalo p50 ${Math.round(p50)} ms, p95 ${Math.round(p95)} ms` : ' · desplázate para medir'),
    );
  }, 500);
}

void iniciar();
