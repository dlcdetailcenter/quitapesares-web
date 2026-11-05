// Tramo aéreo: zoom continuo sobre la ortofoto (3 o 4 niveles de zoom, cada uno el doble de cerca que el anterior),
// pintado en canvas. Encima, nubes en capas con paralaje mezcladas en modo «screen»: las de Higgsfield si están en el
// material, o nubes dibujadas aquí con degradados (alternativa sin IA). Las nubes tapan el paso del aire a la puerta:
// ningún edificio generado.
import { ajustarLienzo, pintarCubriendo } from './reproductor.ts';

export interface ConfigAire {
  /** Imágenes de la ortofoto, de la más lejana a la más cercana, todas centradas en el local. */
  niveles: string[];
  /** Capas de nubes sobre fondo negro (piezas de IA declaradas), de la más lejana a la más cercana. */
  nubes: string[];
}

async function imagen(url: string, señal?: AbortSignal): Promise<ImageBitmap> {
  const r = await fetch(url, { signal: señal });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return createImageBitmap(await r.blob());
}

/** Generador pseudoaleatorio con semilla: las nubes dibujadas son siempre las mismas. */
function aleatorio(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** Nubes sin IA: manchas blancas difusas sobre negro en un lienzo aparte, para mezclar en modo «screen». */
function nubesDibujadas(semilla: number, densidad: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  // Pequeño a propósito: se escala al pintarlo y, difuso como es, no se nota. Así cuesta poco en un móvil lento.
  c.width = 192;
  c.height = 384;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, c.width, c.height);
  const azar = aleatorio(semilla);
  for (let i = 0; i < densidad; i++) {
    const x = azar() * c.width;
    const y = azar() * c.height;
    const r = 15 + azar() * 52;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.08 + azar() * 0.12;
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return c;
}

const suave = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export class Aire {
  bytes = 0;
  private niveles: (ImageBitmap | undefined)[] = [];
  private capas: CanvasImageSource[] = [];
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly config: ConfigAire,
    private readonly base: string,
  ) {
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('sin contexto 2d');
    this.ctx = ctx;
  }

  /** Pide los niveles cercanos de la ortofoto. Se llama con el primer scroll. */
  cargarResto: () => void = () => {};

  /** Vuelve con el nivel más lejano y las nubes; los cercanos, con cargarResto(). */
  async cargar(señal?: AbortSignal): Promise<void> {
    this.niveles = new Array(this.config.niveles.length);
    const cargarNivel = async (i: number) => {
      const r = await fetch(this.base + this.config.niveles[i], { signal: señal });
      if (!r.ok) throw new Error(`${this.config.niveles[i]}: ${r.status}`);
      const blob = await r.blob();
      this.bytes += blob.size;
      this.niveles[i] = await createImageBitmap(blob);
    };
    const nubes = this.config.nubes.length
      ? Promise.all(this.config.nubes.map((u) => imagen(this.base + u, señal))).then((c) => {
          this.capas = c;
        })
      : Promise.resolve().then(() => {
          this.capas = [nubesDibujadas(7, 36), nubesDibujadas(11, 26), nubesDibujadas(23, 18)];
        });
    // Sin ortofoto (pendiente de generar), el aire es un cielo con nubes: nada del suelo, ningún edificio.
    await Promise.all([this.config.niveles.length ? cargarNivel(0) : Promise.resolve(), nubes]);
    // Los niveles cercanos, solo cuando se empieza a bajar (cargarResto): la carga inicial se queda en ≤ 1 MB.
    this.cargarResto = () => {
      this.cargarResto = () => {};
      for (let i = 1; i < this.config.niveles.length; i++) void cargarNivel(i).catch(() => {});
    };
  }

  /** t de 0 a 1 a lo largo del tramo. Al final, las nubes lo cubren todo (el paso a la puerta). */
  pintar(t: number, densidad = 0.35 + 0.65 * suave((t - 0.7) / 0.3)): void {
    ajustarLienzo(this.canvas, 1080, 1920);
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const ultimo = this.niveles.length - 1;
    const z = suave(t / 0.85) * ultimo;
    const k = Math.min(ultimo, Math.floor(z));
    const actual = this.mejorNivel(k);
    if (!actual) this.pintarCielo();
    if (actual) {
      const nivel = this.niveles.indexOf(actual);
      pintarCubriendo(ctx, actual, actual.width, actual.height, 2 ** (z - nivel));
      const siguiente = this.niveles[k + 1];
      if (siguiente && nivel === k) {
        ctx.globalAlpha = suave((z - k) * 2 - 1);
        pintarCubriendo(ctx, siguiente, siguiente.width, siguiente.height, 2 ** (z - k - 1));
        ctx.globalAlpha = 1;
      }
    }
    this.pintarNubes(t, densidad);
  }

  /** Nubes encima de cualquier cosa ya pintada (también al empezar la puerta, para destaparla). */
  pintarNubes(t: number, densidad: number): void {
    if (densidad <= 0.01 || this.capas.length === 0) return;
    const ctx = this.ctx;
    const { width: w, height: h } = this.canvas;
    ctx.globalCompositeOperation = 'screen';
    this.capas.forEach((capa, i) => {
      const velocidad = 0.6 + i * 0.5;
      const escala = 1.2 + t * (0.4 + i * 0.6);
      const dw = w * escala;
      const dh = h * escala;
      const y = (h - dh) / 2 - t * velocidad * h * 0.5;
      ctx.globalAlpha = Math.min(1, densidad * (0.7 + i * 0.25));
      ctx.drawImage(capa, (w - dw) / 2, y, dw, dh);
    });
    // Con densidad alta, un velo blanco termina de tapar: es el «dentro de la nube».
    const velo = suave((densidad - 0.75) / 0.25);
    if (velo > 0) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = velo;
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  /** Cielo sin ortofoto: degradado de azul a blanco, la luz de las nubes. */
  private pintarCielo(): void {
    const { width: w, height: h } = this.canvas;
    const g = this.ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#6f9cc8');
    g.addColorStop(1, '#dfe8ef');
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, w, h);
  }

  liberar(): void {
    for (const n of this.niveles) n?.close();
    this.niveles = [];
    this.capas = [];
  }

  private mejorNivel(k: number): ImageBitmap | undefined {
    for (let i = k; i >= 0; i--) if (this.niveles[i]) return this.niveles[i];
    return undefined;
  }
}
