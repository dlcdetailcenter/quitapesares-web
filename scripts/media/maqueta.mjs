// MAQUETA de la demo al dueño (excepción a FIDELIDAD de Kara del 2026-11-03, CLAUDE.md). Solo demo privada:
// build:produccion falla con ella (scripts/datos/integracion-astro.mjs) y no entra nunca en git (check:media).
//
// Piezas (scripts/media/tramos-maqueta.json): cada una sale de una foto fija real (procesar.mjs foto <id>) y es
//   - «higgsfield»: un vídeo de imagen a vídeo ACEPTADO (solo movimiento de cámara), descargado en
//     $MATERIAL/f2/maqueta/aceptadas/<id>.mp4; lleva "ia": "local" en recorrido.json y su etiqueta visible;
//   - «foto»: la foto real sin IA, con acercamiento y desplazamiento lentos hechos con recortes de la propia foto
//     (ningún píxel inventado), si ninguna versión de IA pasó la revisión;
//   - «creada» (excepciones ampliadas de Kara del 2026-11-04, CLAUDE.md): imagen o vídeo NUEVOS creados con IA a partir de
//     fotogramas reales y aceptados en la revisión. Llevan "ia": "local" obligatoriamente: sin él, el ensamblado falla.
//     Con «imagen», fija y con el mismo recorte progresivo, desde $MATERIAL/f2/maqueta/creadas/intentos/<imagen>.png.
//     Con «video», fotogramas del vídeo aceptado en $MATERIAL/f2/maqueta/final/intentos/<video>.mp4.
//
// Uso:
//   node scripts/media/maqueta.mjs pieza <id>     vídeo aceptado → fotogramas WebP 540×960 (sin audio ni metadatos)
//   node scripts/media/maqueta.mjs sinia <id>     foto real o imagen creada → fotogramas con recorte progresivo
//   node scripts/media/maqueta.mjs ensamblar      recorrido-maqueta/ (aire y nubes del real) y su manifiesto
// Después: npm run media:check:maqueta. Despliegue: npm run demo:desplegar -- --maqueta.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { listar, sha256 } from './media-check.mjs';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const MATERIAL = resolve(process.env.MATERIAL ?? join(homedir(), 'proyectos', 'quitapesares-material'));
const DIR = join(MATERIAL, 'f2', 'maqueta');
const REAL = join(RAIZ, 'recorrido-real');
const DESTINO = join(RAIZ, 'recorrido-maqueta');
const config = JSON.parse(readFileSync(process.env.MAQUETA_CONFIG ? resolve(process.env.MAQUETA_CONFIG) : join(RAIZ, 'scripts', 'media', 'tramos-maqueta.json'), 'utf8'));
const tramos = JSON.parse(readFileSync(join(RAIZ, 'scripts', 'media', 'tramos.json'), 'utf8'));
const { ancho, alto } = tramos.salida;
const SIN_EXTRAS = ['-an', '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1', '-fflags', '+bitexact'];

function fallar(m) {
  console.error(`✗ ${m}`);
  process.exit(1);
}

function ffmpeg(args) {
  console.log(`$ ffmpeg ${args.join(' ')}`);
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.error || r.status !== 0) fallar(`ffmpeg ha fallado (${r.error?.message ?? `código ${r.status}`})`);
}

function pieza(id) {
  const p = config.piezas.find((x) => x.id === id);
  if (!p) fallar(`no hay ninguna pieza «${id}» en tramos-maqueta.json`);
  return p;
}

function salida(id) {
  const destino = join(DIR, '05-export', id);
  rmSync(destino, { recursive: true, force: true });
  mkdirSync(destino, { recursive: true });
  return destino;
}

/** Vídeo aceptado → fotogramas: sin audio ni metadatos, el mismo ajuste de color de los tramos, 540×960, WebP. */
function exportarPieza(id) {
  const p = pieza(id);
  if (p.origen !== 'higgsfield' && !p.video) fallar(`la pieza «${id}» no es un vídeo (origen «${p.origen}»): usa «sinia»`);
  const entrada = p.video ? join(DIR, 'final', 'intentos', `${p.video}.mp4`) : join(DIR, 'aceptadas', `${id}.mp4`);
  if (!existsSync(entrada)) fallar(`falta el vídeo aceptado ${entrada}`);
  const { eq, nitidez } = tramos.color;
  const recorte = p.recorte ? [`crop=${p.recorte.ancho}:${p.recorte.alto}:${p.recorte.x}:${p.recorte.y}`] : [];
  const filtro = [...recorte, `scale=${ancho}:${alto}:force_original_aspect_ratio=increase:flags=lanczos`, `crop=${ancho}:${alto}`, `eq=${eq}`, nitidez, `fps=${p.fps}`].join(',');
  ffmpeg(['-i', entrada, '-vf', filtro, '-c:v', 'libwebp', '-quality', String(p.calidad ?? 60), '-compression_level', '6', '-preset', 'photo', ...SIN_EXTRAS, join(salida(id), '%04d.webp')]);
}

/**
 * Sin IA: la foto real con un acercamiento y un desplazamiento lentos, hechos recortando una ventana que se mueve y
 * encoge sobre la propia foto (del 100 % al 88 % del encuadre). Solo se reescalan píxeles de la foto: nada se inventa.
 * Una pieza «creada» sigue el mismo camino desde su imagen aceptada, con su recorte 9:16 (la IA ya está en la imagen).
 */
function sinIa(id) {
  const p = pieza(id);
  const creada = p.origen === 'creada';
  const entrada = creada ? join(DIR, 'creadas', 'intentos', `${p.imagen}.png`) : join(DIR, 'fotos', `${p.foto}.png`);
  if (!existsSync(entrada)) fallar(creada ? `falta la imagen aceptada ${entrada}` : `falta la foto ${entrada} (npm run media:procesar -- foto ${p.foto})`);
  const recorte = creada ? [`crop=${p.recorte.ancho}:${p.recorte.alto}:${p.recorte.x}:${p.recorte.y}`] : [];
  const n = Math.round((p.segundos ?? 5) * p.fps);
  const zoom = `(1-0.12*on/${n - 1})`;
  const filtro = [
    ...recorte,
    `scale=${ancho * 2}:${alto * 2}:flags=lanczos`,
    `zoompan=z='1/${zoom}':x='(iw-iw*${zoom})*${p.desplazamiento?.x ?? 0.5}':y='(ih-ih*${zoom})*${p.desplazamiento?.y ?? 0.5}':d=${n}:s=${ancho}x${alto}:fps=${p.fps}`,
  ].join(',');
  ffmpeg(['-i', entrada, '-vf', filtro, '-frames:v', String(n), '-c:v', 'libwebp', '-quality', String(p.calidad ?? 60), '-compression_level', '6', '-preset', 'photo', ...SIN_EXTRAS, join(salida(id), '%04d.webp')]);
}

/** Una pieza creada con IA sin «"ia": "local"» no se ensambla: es lo que bloquea producción y enciende la etiqueta. */
function validarPiezas() {
  const sinDeclarar = config.piezas.filter((p) => p.origen === 'creada' && p.ia !== 'local').map((p) => p.id);
  if (sinDeclarar.length > 0) fallar(`pieza creada con IA sin "ia": "local": ${sinDeclarar.join(', ')}`);
}

function ensamblar() {
  validarPiezas();
  if (!existsSync(join(REAL, 'recorrido.json'))) fallar('falta recorrido-real/ (npm run media:ensamblar): la maqueta toma de ahí el aire y las nubes');
  const real = JSON.parse(readFileSync(join(REAL, 'recorrido.json'), 'utf8'));
  rmSync(DESTINO, { recursive: true, force: true });
  mkdirSync(DESTINO, { recursive: true });
  // Aire y nubes: los mismos archivos que el material real (mismas sumas).
  for (const carpeta of ['aire', 'nubes']) if (existsSync(join(REAL, carpeta))) cpSync(join(REAL, carpeta), join(DESTINO, carpeta), { recursive: true });
  const piezas = [];
  for (const p of config.piezas) {
    const origen = join(DIR, '05-export', p.id);
    if (!existsSync(origen)) fallar(`falta la pieza exportada ${origen} (maqueta.mjs ${p.origen === 'higgsfield' || p.video ? 'pieza' : 'sinia'} ${p.id})`);
    cpSync(origen, join(DESTINO, p.id), { recursive: true });
    const fotogramas = readdirSync(origen).filter((f) => f.endsWith('.webp')).length;
    piezas.push({
      id: p.id,
      fotogramas,
      patron: `${p.id}/%04d.webp`,
      pantallas: p.pantallas,
      zona: p.zona,
      ...(p.origen === 'higgsfield' || p.origen === 'creada' ? { ia: 'local' } : {}),
      ...(p.origen === 'creada' ? { origen: 'creada' } : {}),
      ...(p.parada ? { parada: p.parada } : {}),
      ...(p.fundido ? { fundido: true } : {}),
    });
  }
  const recorrido = {
    material: 'maqueta',
    ancho,
    alto,
    aire: { ...real.aire, pantallas: config.aire.pantallas, ...(config.aire.parada ? { parada: config.aire.parada } : {}) },
    tramos: piezas,
    ia: real.ia,
  };
  writeFileSync(join(DESTINO, 'recorrido.json'), `${JSON.stringify(recorrido, null, 2)}\n`);
  const archivos = {};
  for (const r of listar(DESTINO)) {
    const e = spawnSync(process.env.EXIFTOOL || 'exiftool', ['-json', '-n', '-ImageWidth', '-ImageHeight', join(DESTINO, r)], { encoding: 'utf8' });
    const [d] = r.endsWith('.json') ? [{}] : JSON.parse(e.stdout || '[{}]');
    archivos[r] = { sha256: sha256(join(DESTINO, r)), ...(d.ImageWidth ? { ancho: d.ImageWidth, alto: d.ImageHeight } : {}) };
  }
  writeFileSync(
    join(RAIZ, 'scripts', 'media', 'manifiesto-maqueta.json'),
    `${JSON.stringify({ $comentario: 'Sumas SHA-256 y dimensiones de la MAQUETA (recorrido-maqueta/, nunca en git). Lo escribe scripts/media/maqueta.mjs ensamblar y lo comprueba npm run media:check:maqueta.', archivos }, null, 2)}\n`,
  );
  const ia = piezas.filter((p) => p.ia === 'local').map((p) => p.id);
  console.log(`✓ recorrido-maqueta/: ${Object.keys(archivos).length} archivos; piezas con IA del local: ${ia.join(', ') || 'ninguna'}`);
}

const [paso, id] = process.argv.slice(2);
if (paso === 'pieza' && id) exportarPieza(id);
else if (paso === 'sinia' && id) sinIa(id);
else if (paso === 'ensamblar') ensamblar();
else {
  console.error('Uso: node scripts/media/maqueta.mjs <pieza <id> | sinia <id> | ensamblar>');
  process.exit(2);
}
