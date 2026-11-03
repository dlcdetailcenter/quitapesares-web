// Material de /lab/scroll: el mismo tramo exportado con los dos métodos y el MISMO peso objetivo.
// Busca la calidad de WebP y el CRF de H.264 que más se acercan al peso pedido (sin pasarse) y deja el resultado en
// public/recorrido/lab/ (carpeta ignorada por git: el material del recorrido no entra en el repositorio en F2).
//
// Uso: node scripts/lab/preparar-lab.mjs <tramo ya con color, .mkv> [peso objetivo en MB, por defecto 1.6]
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const [entradaArg, mbArg] = process.argv.slice(2);
if (!entradaArg) {
  console.error('Uso: node scripts/lab/preparar-lab.mjs <tramo.mkv> [MB]');
  process.exit(2);
}
const entrada = resolve(entradaArg);
const objetivo = Number(mbArg ?? 1.6) * 1024 * 1024;
const destino = join(RAIZ, 'public', 'recorrido', 'lab');
const SIN_EXTRAS = ['-an', '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1', '-fflags', '+bitexact'];

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(1);
}

function info() {
  const r = spawnSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries',
    'stream=width,height,r_frame_rate,nb_read_frames', '-of', 'json', entrada], { encoding: 'utf8' });
  const s = JSON.parse(r.stdout).streams[0];
  const [n, d] = s.r_frame_rate.split('/').map(Number);
  return { ancho: s.width, alto: s.height, fps: n / d, fotogramas: Number(s.nb_read_frames) };
}

function pesoCarpeta(dir) {
  return readdirSync(dir).reduce((t, f) => t + statSync(join(dir, f)).size, 0);
}

function canvas(calidad) {
  const dir = join(destino, 'canvas');
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  ffmpeg(['-i', entrada, '-c:v', 'libwebp', '-quality', String(calidad), '-compression_level', '6', '-preset', 'photo', ...SIN_EXTRAS, join(dir, '%04d.webp')]);
  return pesoCarpeta(dir);
}

function video(crf) {
  const archivo = join(destino, 'video.mp4');
  ffmpeg(['-i', entrada, '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'slow', '-crf', String(crf), '-pix_fmt', 'yuv420p',
    '-g', '4', '-keyint_min', '4', '-sc_threshold', '0', '-bf', '0', '-flags:v', '+bitexact', '-movflags', '+faststart', ...SIN_EXTRAS, archivo]);
  return statSync(archivo).size;
}

/** Búsqueda binaria del parámetro entero que da el mayor peso sin pasar del objetivo. */
function buscar(nombre, generar, min, max, subeConParametro) {
  let mejor = null;
  while (min <= max) {
    const medio = Math.floor((min + max) / 2);
    const peso = generar(medio);
    console.log(`  ${nombre} ${medio}: ${(peso / 1024 / 1024).toFixed(2)} MB`);
    const cabe = peso <= objetivo;
    if (cabe && (!mejor || peso > mejor.peso)) mejor = { parametro: medio, peso };
    if (cabe === subeConParametro) min = medio + 1;
    else max = medio - 1;
  }
  if (!mejor) {
    console.error(`✗ ${nombre}: ni con el mínimo cabe en ${(objetivo / 1024 / 1024).toFixed(2)} MB`);
    process.exit(1);
  }
  generar(mejor.parametro);
  return mejor;
}

mkdirSync(destino, { recursive: true });
const datos = info();
console.log(`Tramo: ${datos.ancho}×${datos.alto}, ${datos.fps} fps, ${datos.fotogramas} fotogramas. Objetivo ${(objetivo / 1024 / 1024).toFixed(2)} MB.`);
const c = buscar('calidad WebP', canvas, 1, 95, true);
const v = buscar('CRF H.264', video, 14, 45, false);
const lab = {
  ...datos,
  objetivoBytes: objetivo,
  canvas: { patron: 'canvas/%04d.webp', calidadWebp: c.parametro, bytes: c.peso },
  video: { archivo: 'video.mp4', crf: v.parametro, gop: 4, bytes: v.peso },
};
writeFileSync(join(destino, 'lab.json'), `${JSON.stringify(lab, null, 2)}\n`);
console.log(`✓ canvas: calidad ${c.parametro}, ${(c.peso / 1024 / 1024).toFixed(2)} MB · vídeo: CRF ${v.parametro}, ${(v.peso / 1024 / 1024).toFixed(2)} MB`);
