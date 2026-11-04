// npm run media:check — barrera sobre el material REAL del recorrido (recorrido-real/, ignorada por git) antes de
// compilar la demo con él. El script de despliegue (scripts/desplegar-demo.mjs) lo ejecuta y aborta si falla.
// Falla si:
//   1. el total pasa de 8 MB (8 × 1024 × 1024 bytes);
//   2. algún archivo no está en scripts/media/manifiesto-real.json, falta alguno o su SHA-256 no coincide;
//   3. algún vídeo lleva pista de audio;
//   4. alguna imagen o vídeo lleva metadatos: GPS, EXIF, XMP, IPTC, datos de cámara o fecha de grabación;
//   5. las dimensiones no son las del manifiesto, o los fotogramas de un tramo no miden lo que dice recorrido.json;
//   6. la ortofoto se hizo con otras coordenadas que las de src/data/restaurante.json (hay que regenerarla).
// exiftool es obligatorio (variable EXIFTOOL para otra ruta).
//
// Uso: node scripts/media/media-check.mjs [carpeta] [manifiesto]
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
export const LIMITE_TOTAL = 8 * 1024 * 1024;
const MEDIOS = /\.(webp|png|jpe?g|avif|mp4|m4v|webm|mov)$/i;
// Grupos de exiftool (-G1) que son metadatos de captura y no deben quedar en nada publicado.
const GRUPOS_PROHIBIDOS = /^(IFD\d|ExifIFD|SubIFD|GPS|InteropIFD|MakerNotes|Apple|XMP(-.*)?|IPTC|Photoshop|UserData|ItemList|Keys|Microsoft|Composite:GPS.*)$/i;
const FECHA = /(create|modify|datetimeoriginal|creation)date$/i;

/** Mismo criterio que scripts/check-media.mjs. */
function esAudio(etiqueta, valor) {
  if (/^handlertype$/i.test(etiqueta)) return /^(soun|audio track)$/i.test(String(valor));
  if (/^tracktype$/i.test(etiqueta)) return String(valor) === '2' || /^audio$/i.test(String(valor));
  return /^audio(format|channels)$/i.test(etiqueta) && valor !== '' && valor !== null;
}

export function sha256(archivo) {
  return createHash('sha256').update(readFileSync(archivo)).digest('hex');
}

export function listar(dir) {
  const salida = [];
  const recorrer = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const ruta = join(d, e.name);
      if (e.isDirectory()) recorrer(ruta);
      else salida.push(relative(dir, ruta).split(sep).join('/'));
    }
  };
  recorrer(dir);
  return salida.sort();
}

/** Lee con exiftool todas las etiquetas de las imágenes y vídeos de la carpeta. */
export function leerEtiquetas(dir, rutas) {
  const orden = process.env.EXIFTOOL || 'exiftool';
  const temporal = mkdtempSync(join(tmpdir(), 'media-check-'));
  try {
    const listado = join(temporal, 'archivos.txt');
    writeFileSync(listado, `${rutas.map((r) => join(dir, r)).join('\n')}\n`, 'utf8');
    const r = spawnSync(orden, ['-json', '-n', '-a', '-G1', '-ee3', '-q', '-q', '-charset', 'filename=utf8', '-@', listado], {
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
    });
    if (r.error) return { error: `exiftool no está instalado (${orden}): es obligatorio para media:check` };
    const porRuta = new Map();
    for (const resultado of JSON.parse(r.stdout || '[]')) {
      porRuta.set(relative(dir, resolve(String(resultado.SourceFile))).split(sep).join('/'), resultado);
    }
    return { porRuta };
  } finally {
    rmSync(temporal, { recursive: true, force: true });
  }
}

export function comprobar(dir, rutaManifiesto) {
  const fallos = [];
  if (!existsSync(join(dir, 'recorrido.json'))) return { fallos: [`no hay ${join(dir, 'recorrido.json')}`], total: 0 };
  if (!existsSync(rutaManifiesto)) return { fallos: [`no hay manifiesto: ${rutaManifiesto}`], total: 0 };
  const manifiesto = JSON.parse(readFileSync(rutaManifiesto, 'utf8'));
  const config = JSON.parse(readFileSync(join(dir, 'recorrido.json'), 'utf8'));
  const rutas = listar(dir);

  // 1. Peso total.
  const total = rutas.reduce((t, r) => t + statSync(join(dir, r)).size, 0);
  if (total > LIMITE_TOTAL) fallos.push(`Pesa ${(total / 1024 / 1024).toFixed(2)} MB: el límite es 8 MB`);

  // 2. Manifiesto: mismos archivos y mismas sumas.
  const esperados = manifiesto.archivos ?? {};
  for (const r of rutas) {
    if (!esperados[r]) fallos.push(`No está en el manifiesto: ${r}`);
    else if (esperados[r].sha256 !== sha256(join(dir, r))) fallos.push(`SHA-256 distinta de la del manifiesto: ${r}`);
  }
  for (const r of Object.keys(esperados)) if (!rutas.includes(r)) fallos.push(`Falta (está en el manifiesto): ${r}`);

  // 3-5. Audio, metadatos y dimensiones (exiftool).
  const medios = rutas.filter((r) => MEDIOS.test(r));
  if (medios.length > 0) {
    const { porRuta, error } = leerEtiquetas(dir, medios);
    if (error) fallos.push(error);
    else {
      const fotogramas = new Map();
      for (const t of config.tramos ?? []) {
        const [prefijo] = t.patron.split('%04d');
        fotogramas.set(prefijo, t);
      }
      for (const r of medios) {
        const e = porRuta.get(r);
        if (!e) {
          fallos.push(`exiftool no revisó: ${r}`);
          continue;
        }
        const audio = [];
        const metadatos = [];
        for (const [clave, valor] of Object.entries(e)) {
          const [grupo, etiqueta = ''] = clave.includes(':') ? clave.split(':') : ['', clave];
          if (etiqueta === 'Error') fallos.push(`exiftool no pudo leer ${r}: ${valor}`);
          if (esAudio(etiqueta, valor)) audio.push(clave);
          if (GRUPOS_PROHIBIDOS.test(grupo) || /^gps/i.test(etiqueta)) metadatos.push(clave);
          if (FECHA.test(etiqueta) && valor && !/^0000:00:00 00:00:00/.test(String(valor)) && grupo !== 'System') metadatos.push(clave);
        }
        if (audio.length) fallos.push(`Lleva pista de audio: ${r} (${audio.join(', ')})`);
        if (metadatos.length) fallos.push(`Lleva metadatos: ${r} (${[...new Set(metadatos)].slice(0, 6).join(', ')})`);
        const ancho = Number(e['File:ImageWidth'] ?? e['Track1:ImageWidth'] ?? e['PNG:ImageWidth'] ?? e['RIFF:ImageWidth'] ?? e['VP8:ImageWidth']);
        const alto = Number(e['File:ImageHeight'] ?? e['Track1:ImageHeight'] ?? e['PNG:ImageHeight'] ?? e['RIFF:ImageHeight'] ?? e['VP8:ImageHeight']);
        const m = esperados[r];
        if (m && (m.ancho !== ancho || m.alto !== alto)) fallos.push(`Dimensiones ${ancho}×${alto} y el manifiesto dice ${m.ancho}×${m.alto}: ${r}`);
        for (const [prefijo, t] of fotogramas) {
          if (r.startsWith(prefijo) && (ancho !== config.ancho || alto !== config.alto)) {
            fallos.push(`Fotograma de ${t.id} de ${ancho}×${alto}; recorrido.json dice ${config.ancho}×${config.alto}: ${r}`);
          }
        }
      }
    }
  }

  // 6. Ortofoto con las coordenadas actuales.
  const datos = JSON.parse(readFileSync(join(RAIZ, 'src', 'data', 'restaurante.json'), 'utf8'));
  const centro = config.aire?.centro;
  if (centro && (centro.lat !== datos.coordenadas.valor.lat || centro.lng !== datos.coordenadas.valor.lng)) {
    fallos.push('La ortofoto se hizo con otras coordenadas que las de src/data/restaurante.json: npm run media:ortofoto');
  }
  return { fallos, total, archivos: rutas.length };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = resolve(process.argv[2] ?? join(RAIZ, 'recorrido-real'));
  const manifiesto = resolve(process.argv[3] ?? join(RAIZ, 'scripts', 'media', 'manifiesto-real.json'));
  const { fallos, total, archivos } = comprobar(dir, manifiesto);
  console.log(`media:check · ${dir} · ${archivos ?? 0} archivos · ${(total / 1024 / 1024).toFixed(2)} MB de 8 MB`);
  if (fallos.length) {
    for (const f of fallos) console.error(`✗ ${f}`);
    console.error(`media:check: ${fallos.length} problema(s).`);
    process.exit(1);
  }
  console.log('✓ Dentro de 8 MB, sin audio, sin metadatos ni GPS, dimensiones correctas y sumas iguales a las del manifiesto.');
}
