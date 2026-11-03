// Material del recorrido de F2: un comando por paso, reproducible, con los parámetros de scripts/media/tramos.json.
//
// El material vive FUERA del repositorio (FIDELIDAD y PRIVACIDAD en el encargo de F2):
//   $MATERIAL/originales/IMG_xxxx.MOV      clips sin tocar (nunca entran en git ni en Higgsfield)
//   $MATERIAL/f2/01-sdr/<clip>.mkv         HDR → SDR con tonemapping
//   $MATERIAL/f2/02-limpio/<clip>.mkv      sin audio, sin metadatos, sin pistas de datos
//   $MATERIAL/f2/03-estable/<tramo>.mkv    tramo elegido, estabilizado, recorte 9:16, velocidad, difuminados
//   $MATERIAL/f2/04-color/<tramo>.mkv      el mismo ajuste de color para todos, reducción de ruido, nitidez suave
//   $MATERIAL/f2/05-export/<metodo>/<tramo>/  lo que se publica (fotogramas WebP o vídeo H.264 sin audio)
// $MATERIAL es ~/proyectos/quitapesares-material salvo que se indique otra con la variable MATERIAL.
// Las hojas de contacto y las comparaciones van a $INFORMES/f2-revision (~/proyectos/quitapesares-informes).
//
// Uso:
//   node scripts/media/procesar.mjs sdr <clip>
//   node scripts/media/procesar.mjs limpiar <clip>
//   node scripts/media/procesar.mjs estabilizar <tramo>
//   node scripts/media/procesar.mjs color <tramo>
//   node scripts/media/procesar.mjs exportar <tramo> <canvas|video>
//   node scripts/media/procesar.mjs contacto <tramo|clip> [etapa]   (etapa: 02-limpio, 04-color… por defecto 04-color)
//   node scripts/media/procesar.mjs comparar <tramo>
//   node scripts/media/procesar.mjs todo <canvas|video>               (los pasos de todos los tramos definidos)
// Opciones: --config <tramos.json>  (por defecto scripts/media/tramos.json)
//
// Solo se permiten las operaciones del encargo: recorte, estabilización, HDR → SDR, un mismo ajuste de color,
// reducción de ruido, nitidez suave, elegir fotogramas y velocidad, desenfoque de movimiento con fotogramas
// reales (tmix) y difuminado de privacidad. Nada de esto genera ni inventa píxeles.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const args = process.argv.slice(2);
const iConfig = args.indexOf('--config');
const rutaConfig = iConfig >= 0 ? resolve(args.splice(iConfig, 2)[1]) : join(RAIZ, 'scripts', 'media', 'tramos.json');
const [paso, objetivo, extra] = args;

export const MATERIAL = resolve(process.env.MATERIAL ?? join(homedir(), 'proyectos', 'quitapesares-material'));
export const INFORMES = resolve(process.env.INFORMES ?? join(homedir(), 'proyectos', 'quitapesares-informes'));
const F2 = join(MATERIAL, 'f2');
const config = JSON.parse(readFileSync(rutaConfig, 'utf8'));
const { ancho, alto, fps } = config.salida;

// Sin audio, sin subtítulos, sin pistas de datos, sin metadatos ni capítulos y sin la etiqueta del codificador.
const SIN_EXTRAS = ['-an', '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1', '-fflags', '+bitexact'];
// Intermedios casi sin pérdida: cada paso parte del anterior sin degradarlo.
const INTERMEDIO = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '8', '-pix_fmt', 'yuv420p', '-flags:v', '+bitexact'];

function ffmpeg(argumentos) {
  console.log(`$ ffmpeg ${argumentos.join(' ')}`);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...argumentos], { stdio: 'inherit' });
  if (r.error || r.status !== 0) fallar(`ffmpeg ha fallado (${r.error?.message ?? `código ${r.status}`})`);
}

export function sondear(archivo) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', archivo], {
    encoding: 'utf8',
  });
  if (r.error || r.status !== 0) fallar(`ffprobe no ha podido leer ${archivo}: ${r.stderr ?? r.error?.message}`);
  return JSON.parse(r.stdout);
}

function fallar(mensaje) {
  console.error(`✗ ${mensaje}`);
  process.exit(1);
}

function carpeta(...partes) {
  const ruta = join(...partes);
  mkdirSync(dirname(ruta), { recursive: true });
  return ruta;
}

function tramo(id) {
  const t = config.tramos.find((x) => x.id === id);
  if (!t) fallar(`no hay ningún tramo «${id}» en ${rutaConfig}`);
  if (t.inicio === null || t.fin === null) {
    fallar(`el tramo «${id}» no tiene inicio y fin: elígelos en la hoja de contacto del clip ${t.clip} (paso «contacto ${t.clip} 02-limpio»)`);
  }
  if (!(t.fin > t.inicio)) fallar(`el tramo «${id}» tiene fin <= inicio`);
  return t;
}

function original(clip) {
  const dir = join(MATERIAL, 'originales');
  const encontrado = existsSync(dir) && readdirSync(dir).find((f) => f.replace(/\.[^.]+$/, '') === clip);
  if (!encontrado) fallar(`no encuentro el original de ${clip} en ${dir}`);
  return join(dir, encontrado);
}

// ── Pasos ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** HDR (HLG o PQ) → SDR BT.709 con tonemapping. Si el clip ya es SDR, solo pasa a BT.709. Gira según la orientación. */
function sdr(clip) {
  const entrada = original(clip);
  const v = sondear(entrada).streams.find((s) => s.codec_type === 'video');
  const trc = v.color_transfer ?? '';
  const esHdr = trc === 'arib-std-b67' || trc === 'smpte2084';
  const { operador, npl, desat } = config.tonemap;
  const filtro = esHdr
    ? [
        `zscale=tin=${trc}:pin=2020:min=2020_ncl:rin=limited:t=linear:npl=${npl}`,
        'format=gbrpf32le',
        'zscale=p=709',
        `tonemap=tonemap=${operador}:desat=${desat}`,
        'zscale=t=709:m=709:r=limited',
        'format=yuv420p',
      ].join(',')
    : 'zscale=t=709:m=709:p=709:r=limited,format=yuv420p';
  console.log(`${clip}: ${v.width}×${v.height}, ${v.r_frame_rate} fps, transferencia «${trc || 'sin dato'}» → ${esHdr ? 'tonemapping' : 'ya SDR'}`);
  ffmpeg(['-i', entrada, '-map', '0:v:0', '-vf', filtro, ...INTERMEDIO, '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', ...SIN_EXTRAS, carpeta(F2, '01-sdr', `${clip}.mkv`)]);
}

/** Copia solo la pista de vídeo, sin audio, sin metadatos y sin pistas de datos; después lo comprueba. */
function limpiar(clip) {
  const entrada = join(F2, '01-sdr', `${clip}.mkv`);
  const salida = carpeta(F2, '02-limpio', `${clip}.mkv`);
  ffmpeg(['-i', entrada, '-map', '0:v:0', '-c', 'copy', ...SIN_EXTRAS, salida]);
  const info = sondear(salida);
  if (info.streams.length !== 1 || info.streams[0].codec_type !== 'video') fallar(`${salida}: debía quedar solo una pista de vídeo`);
  const etiquetas = Object.keys(info.format.tags ?? {}).filter((k) => !/^(encoder|duration)$/i.test(k));
  if (etiquetas.length > 0) fallar(`${salida}: quedan metadatos (${etiquetas.join(', ')})`);
  console.log(`✓ ${clip}: una pista de vídeo, sin audio ni metadatos`);
}

/** Tramo elegido: recorte en el tiempo, estabilización, recorte 9:16, velocidad, desenfoque de barrido y difuminados. */
function estabilizar(id) {
  const t = tramo(id);
  const entrada = join(F2, '02-limpio', `${t.clip}.mkv`);
  const trf = carpeta(F2, '03-estable', `${id}.trf`);
  const { shakiness, accuracy, smoothing } = config.estabilizacion;
  const corte = ['-ss', String(t.inicio), '-to', String(t.fin), '-i', entrada];
  ffmpeg([...corte, '-vf', `vidstabdetect=shakiness=${shakiness}:accuracy=${accuracy}:result=${trf}`, '-f', 'null', '-']);

  // Recorte 9:16: el del tramo (x, y, ancho, alto en píxeles del clip girado) o el centrado más grande posible.
  const r = t.recorte;
  const recorte = r ? `crop=${r.ancho}:${r.alto}:${r.x}:${r.y}` : `crop='min(iw,ih*9/16)':'min(ih,iw*16/9)'`;
  const cadena = [
    `vidstabtransform=input=${trf}:smoothing=${smoothing}:zoom=0:optzoom=1:interpol=bicubic`,
    recorte,
    `scale=${ancho}:${alto}:flags=lanczos`,
    `setpts=(PTS-STARTPTS)/${t.velocidad ?? 1}`,
    `fps=${fps}`,
  ].join(',');

  let grafo = `[0:v]${cadena}[base]`;
  let ultimo = 'base';
  // Barrido al final del tramo: los últimos segundos más rápidos y mezclados con sus vecinos (tmix). Solo
  // fotogramas reales del propio clip: nada generado.
  const b = t.barridoFinal;
  if (b) {
    const duracion = (t.fin - t.inicio) / (t.velocidad ?? 1);
    const corteBarrido = Math.max(0, duracion - b.segundos);
    grafo += `;[${ultimo}]split[pa][pb]`;
    grafo += `;[pa]trim=0:${corteBarrido},setpts=PTS-STARTPTS[pa2]`;
    grafo += `;[pb]trim=${corteBarrido},setpts=(PTS-STARTPTS)/${b.factor},tmix=frames=${b.mezcla},fps=${fps}[pb2]`;
    grafo += `;[pa2][pb2]concat=n=2:v=1:a=0[barrido]`;
    ultimo = 'barrido';
  }
  // Difuminado de privacidad: solo caras pequeñas en un lateral (el encargo prefiere elegir otro tramo o recortar).
  (t.difuminados ?? []).forEach((d, i) => {
    grafo += `;[${ultimo}]split[d${i}a][d${i}b]`;
    grafo += `;[d${i}b]crop=${d.ancho}:${d.alto}:${d.x}:${d.y},boxblur=${d.radio ?? 24}:3[d${i}c]`;
    grafo += `;[d${i}a][d${i}c]overlay=${d.x}:${d.y}:enable='between(t,${d.desde},${d.hasta})'[d${i}]`;
    ultimo = `d${i}`;
  });
  ffmpeg([...corte, '-filter_complex', grafo, '-map', `[${ultimo}]`, ...INTERMEDIO, ...SIN_EXTRAS, carpeta(F2, '03-estable', `${id}.mkv`)]);
}

/** El mismo ajuste de color para todos los tramos, reducción de ruido y nitidez suave. */
function color(id) {
  tramo(id);
  const { eq, ruido, nitidez } = config.color;
  ffmpeg(['-i', join(F2, '03-estable', `${id}.mkv`), '-vf', [`eq=${eq}`, ruido, nitidez].join(','), ...INTERMEDIO, ...SIN_EXTRAS, carpeta(F2, '04-color', `${id}.mkv`)]);
}

/** Exportación al formato del método: fotogramas WebP (canvas) o H.264 sin audio con GOP corto (video). */
function exportar(id, metodo) {
  tramo(id);
  const entrada = join(F2, '04-color', `${id}.mkv`);
  const destino = join(F2, '05-export', metodo, id);
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });
  if (metodo === 'canvas') {
    const { calidad } = config.exportar.canvas;
    ffmpeg(['-i', entrada, '-c:v', 'libwebp', '-quality', String(calidad), '-compression_level', '6', '-preset', 'photo', ...SIN_EXTRAS, join(destino, '%04d.webp')]);
  } else if (metodo === 'video') {
    const { crf, gop } = config.exportar.video;
    ffmpeg([
      '-i', entrada, '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p',
      '-g', String(gop), '-keyint_min', String(gop), '-sc_threshold', '0', '-bf', '0', '-flags:v', '+bitexact',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-movflags', '+faststart', ...SIN_EXTRAS, join(destino, `${id}.mp4`),
    ]);
  } else {
    fallar(`método desconocido «${metodo}»: canvas o video`);
  }
}

/** Hojas de contacto con TODOS los fotogramas, numerados, para revisarlos uno a uno (caras, matrículas, pantallas, texto). */
function contacto(nombre, etapa = '04-color') {
  const entrada = join(F2, etapa, `${nombre}.mkv`);
  if (!existsSync(entrada)) fallar(`no existe ${entrada}`);
  const salida = carpeta(INFORMES, 'f2-revision', 'contacto', `${nombre}-${etapa}-%02d.png`);
  ffmpeg([
    '-i', entrada, '-vf',
    "scale=240:-2,drawtext=text='%{n}':x=6:y=6:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6,tile=6x5:padding=4:color=black",
    '-fps_mode', 'passthrough', salida,
  ]);
}

/** Original (solo SDR) frente a procesado, cada medio segundo: nada cambia de forma ni de color salvo lo permitido. */
function comparar(id) {
  const t = tramo(id);
  const izquierda = join(F2, '02-limpio', `${t.clip}.mkv`);
  const derecha = join(F2, '04-color', `${id}.mkv`);
  const salida = carpeta(INFORMES, 'f2-revision', 'comparar', `${id}-%02d.png`);
  const r = t.recorte;
  const recorte = r ? `crop=${r.ancho}:${r.alto}:${r.x}:${r.y}` : `crop='min(iw,ih*9/16)':'min(ih,iw*16/9)'`;
  ffmpeg([
    '-ss', String(t.inicio), '-to', String(t.fin), '-i', izquierda, '-i', derecha, '-filter_complex',
    `[0:v]${recorte},scale=360:640,setpts=(PTS-STARTPTS)/${t.velocidad ?? 1},fps=2[a];[1:v]scale=360:640,fps=2[b];[a][b]hstack=inputs=2`,
    '-fps_mode', 'passthrough', salida,
  ]);
}

function todo(metodo) {
  const definidos = config.tramos.filter((t) => t.inicio !== null && t.fin !== null);
  if (definidos.length === 0) fallar('ningún tramo tiene inicio y fin en tramos.json');
  for (const clip of new Set(definidos.map((t) => t.clip))) {
    sdr(clip);
    limpiar(clip);
  }
  for (const t of definidos) {
    estabilizar(t.id);
    color(t.id);
    exportar(t.id, metodo);
    contacto(t.id);
    comparar(t.id);
  }
}

const pasos = { sdr, limpiar, estabilizar, color, exportar: (id) => exportar(id, extra), contacto: (n) => contacto(n, extra), comparar, todo };
if (!pasos[paso] || !objetivo) {
  console.error('Uso: node scripts/media/procesar.mjs <sdr|limpiar|estabilizar|color|exportar|contacto|comparar|todo> <clip|tramo|método> [canvas|video|etapa]');
  process.exit(2);
}
pasos[paso](objetivo);
