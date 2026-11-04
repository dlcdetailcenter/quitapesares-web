// Los dos métodos de la prueba técnica de F2 para mover un tramo con el scroll:
//   - SecuenciaCanvas: fotogramas sueltos (WebP o PNG) pintados en un <canvas>;
//   - VideoScrub: un vídeo H.264 sin audio con GOP corto, movido con currentTime.
// Los dos tienen la misma interfaz: cargar(), mostrar(índice), liberar() y onPintado (para medir).
// Memoria: la secuencia guarda los fotogramas comprimidos (Blob) y solo decodifica una VENTANA alrededor del
// fotograma actual; lo que sale de la ventana se libera con close(). Safari en iPhone puede recargar la
// pestaña si se decodifican todos.

export interface Reproductor {
  readonly fotogramas: number;
  /** Bytes descargados hasta ahora. */
  bytes: number;
  cargar(señal?: AbortSignal): Promise<void>;
  mostrar(indice: number): void;
  liberar(): void;
  /** Se llama cada vez que un fotograma nuevo llega a la pantalla, con su índice y el instante (performance.now). */
  onPintado?: (indice: number, instante: number) => void;
}

/** Pinta `fuente` cubriendo todo el lienzo, como object-fit: cover. */
export function pintarCubriendo(
  ctx: CanvasRenderingContext2D,
  fuente: CanvasImageSource,
  anchoFuente: number,
  altoFuente: number,
  escalaExtra = 1,
): void {
  const { width: w, height: h } = ctx.canvas;
  const escala = Math.max(w / anchoFuente, h / altoFuente) * escalaExtra;
  const dw = anchoFuente * escala;
  const dh = altoFuente * escala;
  ctx.drawImage(fuente, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/** Ajusta el tamaño interno del lienzo al de la pantalla, sin pasar del tamaño de los fotogramas. */
export function ajustarLienzo(canvas: HTMLCanvasElement, anchoMax: number, altoMax: number): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const caja = canvas.getBoundingClientRect();
  const escala = Math.min(1, anchoMax / (caja.width * dpr), altoMax / (caja.height * dpr));
  const w = Math.max(1, Math.round(caja.width * dpr * escala));
  const h = Math.max(1, Math.round(caja.height * dpr * escala));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}

async function descargar(url: string, señal?: AbortSignal): Promise<Blob> {
  const r = await fetch(url, { signal: señal });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.blob();
}

export class SecuenciaCanvas implements Reproductor {
  bytes = 0;
  onPintado?: (indice: number, instante: number) => void;
  private readonly blobs: (Blob | undefined)[];
  private readonly decodificados = new Map<number, ImageBitmap>();
  private readonly pendientes = new Set<number>();
  private objetivo = 0;
  private pintado = -1;
  private liberado = false;
  /** Sube al soltar el tramo: lo que aún se esté decodificando de antes se cierra al llegar. */
  private generacion = 0;
  /** Solo pinta el tramo que se está viendo: varios tramos comparten el mismo lienzo. */
  activo = true;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly urls: string[],
    private readonly ancho: number,
    private readonly alto: number,
    /** Fotogramas decodificados a cada lado del actual. */
    private readonly ventana = 6,
    /** Descargas a la vez. */
    private readonly paralelas = 6,
  ) {
    this.blobs = new Array(urls.length);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('sin contexto 2d');
    this.ctx = ctx;
  }

  get fotogramas(): number {
    return this.urls.length;
  }

  /** Termina cuando están todos los fotogramas descargados (también con cargarProgresivo). */
  completo: Promise<void> = Promise.resolve();

  /** Descarga todos los fotogramas (comprimidos) en orden y decodifica el primero. */
  async cargar(señal?: AbortSignal): Promise<void> {
    await this.descargarEnOrden(this.urls.map((_, i) => i), this.urls.length, señal);
    await this.decodificar(0);
  }

  /**
   * Descarga de lo grueso a lo fino (0, n/8, 2n/8… y después los huecos) y vuelve en cuanto tiene la primera pasada:
   * el tramo ya se puede recorrer con menos fotogramas mientras llega el resto (`completo`).
   */
  async cargarProgresivo(señal?: AbortSignal, paso = 8): Promise<void> {
    const orden: number[] = [];
    const vistos = new Set<number>();
    for (let p = paso; p >= 1; p = Math.floor(p / 2)) {
      for (let i = 0; i < this.urls.length; i += p) {
        if (!vistos.has(i)) {
          vistos.add(i);
          orden.push(i);
        }
      }
      if (p === 1) break;
    }
    const primeros = Math.ceil(this.urls.length / paso);
    await this.descargarEnOrden(orden, primeros, señal);
    await this.decodificar(0);
  }

  /** Vuelve cuando han llegado los `minimo` primeros de `orden`; el resto sigue en segundo plano (`completo`). */
  private descargarEnOrden(orden: number[], minimo: number, señal?: AbortSignal): Promise<void> {
    let siguiente = 0;
    let hechos = 0;
    let avisar: () => void = () => {};
    const suficientes = new Promise<void>((ok) => (avisar = ok));
    const trabajador = async () => {
      while (siguiente < orden.length && !this.liberado) {
        const i = orden[siguiente++];
        const blob = await descargar(this.urls[i], señal);
        if (this.liberado) return;
        this.blobs[i] = blob;
        this.bytes += blob.size;
        if (++hechos >= minimo) avisar();
      }
    };
    const todos = Promise.all(Array.from({ length: Math.min(this.paralelas, orden.length) }, trabajador)).then(() => {});
    this.completo = todos;
    // Un fallo después de la primera pasada no rompe nada: el tramo sigue con los fotogramas que tiene.
    todos.catch(() => {});
    return Promise.race([suficientes, todos]);
  }

  /** Otro tramo ha pintado en el mismo lienzo: la próxima vez hay que pintar aunque el fotograma sea el mismo. */
  invalidar(): void {
    this.pintado = -1;
  }

  /** Libera los fotogramas decodificados (el tramo deja de verse) y conserva los comprimidos. */
  soltarDecodificados(): void {
    this.generacion++;
    for (const b of this.decodificados.values()) b.close();
    this.decodificados.clear();
    this.pintado = -1;
  }

  mostrar(indice: number): void {
    this.objetivo = Math.max(0, Math.min(this.urls.length - 1, Math.round(indice)));
    this.rellenarVentana();
    this.pintarMejor();
  }

  liberar(): void {
    this.liberado = true;
    for (const b of this.decodificados.values()) b.close();
    this.decodificados.clear();
    this.blobs.fill(undefined);
  }

  /** Cuántos fotogramas hay decodificados ahora mismo (para comprobar la ventana). */
  get enMemoria(): number {
    return this.decodificados.size;
  }

  private async decodificar(i: number): Promise<void> {
    const blob = this.blobs[i];
    if (!blob || this.decodificados.has(i) || this.pendientes.has(i) || this.liberado) return;
    this.pendientes.add(i);
    const generacion = this.generacion;
    try {
      const bitmap = await createImageBitmap(blob);
      if (this.liberado || generacion !== this.generacion || Math.abs(i - this.objetivo) > this.ventana) {
        bitmap.close();
        return;
      }
      this.decodificados.set(i, bitmap);
      this.pintarMejor();
    } finally {
      this.pendientes.delete(i);
    }
  }

  private rellenarVentana(): void {
    for (const [i, b] of this.decodificados) {
      if (Math.abs(i - this.objetivo) > this.ventana) {
        b.close();
        this.decodificados.delete(i);
      }
    }
    // Primero el objetivo y después hacia fuera, alternando delante y detrás.
    void this.decodificar(this.objetivo);
    for (let d = 1; d <= this.ventana; d++) {
      void this.decodificar(this.objetivo + d);
      void this.decodificar(this.objetivo - d);
    }
  }

  /** Pinta el objetivo si ya está decodificado; si no, el más cercano que haya (nunca deja el lienzo en blanco). */
  private pintarMejor(): void {
    let mejor = -1;
    for (const i of this.decodificados.keys()) {
      if (mejor < 0 || Math.abs(i - this.objetivo) < Math.abs(mejor - this.objetivo)) mejor = i;
    }
    if (!this.activo || mejor < 0 || mejor === this.pintado) return;
    const bitmap = this.decodificados.get(mejor);
    if (!bitmap) return;
    ajustarLienzo(this.canvas, this.ancho, this.alto);
    pintarCubriendo(this.ctx, bitmap, bitmap.width, bitmap.height);
    this.pintado = mejor;
    this.onPintado?.(mejor, performance.now());
  }
}

export class VideoScrub implements Reproductor {
  bytes = 0;
  onPintado?: (indice: number, instante: number) => void;
  private objetivo = 0;
  private buscando = false;
  private url: string | null = null;

  constructor(
    private readonly video: HTMLVideoElement,
    private readonly fuente: string,
    readonly fotogramas: number,
    private readonly fps: number,
  ) {
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.addEventListener('seeked', () => {
      this.buscando = false;
      this.avisarPintado();
      if (this.indiceActual() !== this.objetivo) this.buscar();
    });
  }

  /** Descarga el vídeo entero (Blob): así buscar no espera a la red. */
  async cargar(señal?: AbortSignal): Promise<void> {
    const blob = await descargar(this.fuente, señal);
    this.bytes += blob.size;
    this.url = URL.createObjectURL(blob);
    this.video.src = this.url;
    await new Promise<void>((ok, mal) => {
      this.video.addEventListener('loadeddata', () => ok(), { once: true });
      this.video.addEventListener('error', () => mal(new Error('el vídeo no se puede decodificar')), { once: true });
    });
    this.avisarPintado();
  }

  mostrar(indice: number): void {
    this.objetivo = Math.max(0, Math.min(this.fotogramas - 1, Math.round(indice)));
    if (!this.buscando && this.indiceActual() !== this.objetivo) this.buscar();
  }

  liberar(): void {
    this.video.removeAttribute('src');
    this.video.load();
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
  }

  private indiceActual(): number {
    return Math.round(this.video.currentTime * this.fps);
  }

  private buscar(): void {
    this.buscando = true;
    // Mitad del fotograma: evita caer en el borde entre dos y que el navegador elija el anterior.
    this.video.currentTime = (this.objetivo + 0.5) / this.fps;
  }

  /** Mismo criterio que la secuencia: el instante en que el fotograma está listo para la pantalla (seeked). */
  private avisarPintado(): void {
    this.onPintado?.(this.indiceActual(), performance.now());
  }
}
