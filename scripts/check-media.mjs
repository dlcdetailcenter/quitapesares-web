// npm run check:media — barrera para lo que entra en el repositorio. Falla si:
//   1. algún archivo pesa más de 10 MB (10 485 760 bytes, como lo muestra Windows);
//   2. hay material original versionado (.mov, .heic, .heif o una carpeta material/), aunque se haya
//      saltado el .gitignore con `git add -f`;
//   3. alguna imagen o vídeo lleva coordenadas GPS (lo comprueba exiftool);
//   4. algún vídeo lleva pista de audio (exiftool: pista «soun» en MP4/MOV o de tipo audio en WebM/MKV);
//   5. hay material del recorrido de F2 versionado (recorrido-real/ o public/recorrido/): durante F2 el material
//      real no entra en git (encargo de F2); entra en el último commit, con el OK de Kara, quitando esta regla.
// exiftool es obligatorio en la CI, y también en el hook de pre-commit (--staged) en cuanto hay
// imágenes o vídeos preparados: entonces el commit se bloquea. En una revisión manual de todo el
// repositorio, si no está instalado, el GPS no se comprueba y se avisa.
// Para usar un exiftool que no esté en el PATH: variable de entorno EXIFTOOL con su ruta.
//
// Uso: node scripts/check-media.mjs            → todos los archivos del repositorio
//      node scripts/check-media.mjs --staged   → solo lo preparado para el commit (hook pre-commit)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join } from 'node:path';

const LIMITE_BYTES = 10 * 1024 * 1024;
const ORIGINAL = /\.(mov|heic|heif)$/i;
const CARPETA_MATERIAL = /(^|\/)material\//i;
// Imágenes y vídeos que se pasan a exiftool. Sin `.ts`: aquí son archivos TypeScript, no vídeo MPEG-TS.
const MEDIOS = new Set([
  '.jpg', '.jpeg', '.jpe', '.jfif', '.png', '.apng', '.webp', '.avif', '.gif', '.tif', '.tiff', '.bmp',
  '.heic', '.heif', '.hif', '.jxl', '.dng', '.cr2', '.cr3', '.crw', '.nef', '.nrw', '.arw', '.srf', '.sr2',
  '.orf', '.rw2', '.raf', '.raw', '.rwl', '.pef', '.srw', '.3fr', '.erf', '.kdc', '.dcr', '.mrw', '.x3f', '.iiq',
  '.mp4', '.m4v', '.mov', '.qt', '.3gp', '.3g2', '.avi', '.mkv', '.webm', '.mts', '.m2ts', '.mpg', '.mpeg',
  '.wmv', '.asf', '.flv', '.insv', '.lrv', '.mxf',
]);
const ETIQUETA_GPS = /^(gps(latitude|longitude|position|coordinates)|locationinformation)$/i;
const CARPETA_RECORRIDO = /^(recorrido-real|public\/recorrido)\//i;

/**
 * ¿Lleva pista de audio? Con `-n`, exiftool da HandlerType «soun» (MP4, MOV) y TrackType 2 (WebM, MKV); sin `-n`,
 * «Audio Track» y «Audio». AudioFormat o AudioChannels solo aparecen si hay audio.
 * @param {string} etiqueta @param {unknown} valor
 */
function esAudio(etiqueta, valor) {
  if (/^handlertype$/i.test(etiqueta)) return /^(soun|audio track)$/i.test(String(valor));
  if (/^tracktype$/i.test(etiqueta)) return String(valor) === '2' || /^audio$/i.test(String(valor));
  return /^audio(format|channels)$/i.test(etiqueta) && valor !== '' && valor !== null;
}
const EN_CI = Boolean(process.env.CI) && process.env.CI !== 'false';

const soloPreparados = process.argv.includes('--staged');
let raiz = process.cwd();
raiz = git(['rev-parse', '--show-toplevel']).trim();
const archivos = (
  soloPreparados
    ? git(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR'])
    : git(['ls-files', '-z'])
)
  .split('\0')
  .filter(Boolean);

/** @type {string[]} */
const fallos = [];
/** @type {string[]} */
const avisos = [];

/** @type {string[]} */
const medios = [];
for (const ruta of archivos) {
  if (ORIGINAL.test(ruta) || CARPETA_MATERIAL.test(ruta)) fallos.push(`Material original versionado: ${ruta}`);
  if (CARPETA_RECORRIDO.test(ruta)) fallos.push(`Material del recorrido versionado (en F2 no entra en git): ${ruta}`);
  const bytes = soloPreparados ? tamanoPreparado(ruta) : tamanoEnDisco(ruta);
  if (bytes !== null && bytes > LIMITE_BYTES) {
    fallos.push(`Pesa más de 10 MB: ${ruta} (${(bytes / 1024 / 1024).toFixed(1)} MB)`);
  } else if (bytes !== null && MEDIOS.has(extname(ruta).toLowerCase())) {
    medios.push(ruta);
  }
}

// En la CI exiftool tiene que estar siempre, haya o no imágenes: así una instalación rota no pasa desapercibida.
if (EN_CI && !buscarExiftool()) {
  fallos.push('exiftool no está instalado: en la CI es obligatorio para comprobar el GPS.');
} else if (medios.length > 0) {
  comprobarGps(medios);
}

const alcance = soloPreparados ? 'preparados para el commit' : 'del repositorio';
console.log(`check:media · ${archivos.length} archivos ${alcance} · ${medios.length} imágenes o vídeos`);
for (const aviso of avisos) console.warn(`⚠ ${aviso}`);
if (fallos.length > 0) {
  for (const fallo of fallos) console.error(`✗ ${fallo}`);
  console.error(`check:media: ${fallos.length} problema(s).`);
  process.exit(1);
}
console.log('✓ Sin archivos de más de 10 MB, sin originales ni material del recorrido versionados, sin GPS y sin audio.');

/** @param {string[]} args */
function git(args) {
  const r = spawnSync('git', args, { cwd: raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0) {
    console.error(`check:media: falló "git ${args.join(' ')}": ${r.error?.message ?? r.stderr}`);
    process.exit(2);
  }
  return r.stdout;
}

/** @param {string} ruta */
function tamanoEnDisco(ruta) {
  try {
    return statSync(join(raiz, ruta)).size;
  } catch {
    return null; // borrado en la carpeta pero aún en git: no hay nada que revisar
  }
}

/** @param {string} ruta */
function tamanoPreparado(ruta) {
  return Number(git(['cat-file', '-s', `:${ruta}`]).trim());
}

function buscarExiftool() {
  const orden = process.env.EXIFTOOL || 'exiftool';
  const r = spawnSync(orden, ['-ver'], { encoding: 'utf8' });
  return !r.error && r.status === 0 ? { orden, version: r.stdout.trim() } : null;
}

/** @param {string[]} rutas */
function comprobarGps(rutas) {
  const exiftool = buscarExiftool();
  if (!exiftool) {
    if (EN_CI) {
      fallos.push('exiftool no está instalado: en la CI es obligatorio para comprobar el GPS.');
    } else if (soloPreparados) {
      // Hook pre-commit: hay imágenes o vídeos preparados y nadie puede comprobar si llevan GPS.
      // Se bloquea en vez de avisar: una vez subido, el GPS ya es visible aunque la CI falle después.
      fallos.push(
        `exiftool no está instalado (${process.env.EXIFTOOL || 'exiftool'}): no se puede comprobar el GPS de ` +
          `${rutas.length} imagen(es) o vídeo(s) preparados para el commit.\n` +
          '  Cómo instalarlo (versión fijada y SHA-256 comprobada): docs/instalacion/herramientas.md\n' +
          '  Si ya lo tienes fuera del PATH: EXIFTOOL=<ruta a exiftool> git commit …',
      );
    } else {
      avisos.push(
        `GPS sin comprobar en ${rutas.length} imagen(es) o vídeo(s): exiftool no está instalado. ` +
          'El hook del commit y la CI sí lo comprueban.',
      );
    }
    return;
  }

  const temporal = mkdtempSync(join(tmpdir(), 'check-media-'));
  try {
    // Con --staged se revisa lo preparado para el commit, no la copia de trabajo: se extrae de git.
    const entradas = rutas.map((ruta, i) => {
      if (!soloPreparados) return { ruta, archivo: ruta };
      const contenido = spawnSync('git', ['cat-file', 'blob', `:${ruta}`], {
        cwd: raiz,
        maxBuffer: LIMITE_BYTES + 1024 * 1024,
      });
      const archivo = join(temporal, `${i}${extname(ruta).toLowerCase()}`);
      writeFileSync(archivo, contenido.stdout);
      return { ruta, archivo };
    });

    const listado = join(temporal, 'archivos.txt');
    writeFileSync(listado, `${entradas.map((e) => e.archivo).join('\n')}\n`, 'utf8');
    const r = spawnSync(
      exiftool.orden,
      ['-json', '-n', '-a', '-G1', '-ee3', '-q', '-q', '-charset', 'filename=utf8', '-api', 'LargeFileSupport=1',
        '-*gps*', '-LocationInformation', '-HandlerType', '-TrackType', '-AudioFormat', '-AudioChannels', '-@', listado],
      { cwd: raiz, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
    );
    /** @type {Array<Record<string, unknown>>} */
    let resultados = [];
    try {
      resultados = JSON.parse(r.stdout || '[]');
    } catch {
      fallos.push(`exiftool no devolvió un resultado legible: ${r.stderr || r.error?.message || 'sin salida'}`);
      return;
    }

    const porArchivo = new Map(entradas.map((e) => [normalizar(e.archivo), e.ruta]));
    const revisadas = new Set();
    for (const resultado of resultados) {
      const ruta = porArchivo.get(normalizar(String(resultado.SourceFile))) ?? String(resultado.SourceFile);
      revisadas.add(ruta);
      const etiquetas = [];
      const audio = [];
      for (const [clave, valor] of Object.entries(resultado)) {
        const etiqueta = clave.split(':').pop() ?? '';
        if (etiqueta === 'Error') fallos.push(`No se pudo leer con exiftool: ${ruta} (${String(valor)})`);
        if (ETIQUETA_GPS.test(etiqueta) && valor !== '' && valor !== null) etiquetas.push(clave);
        if (esAudio(etiqueta, valor)) audio.push(clave);
      }
      if (etiquetas.length > 0) fallos.push(`Lleva GPS: ${ruta} (${[...new Set(etiquetas)].join(', ')})`);
      if (audio.length > 0) fallos.push(`Lleva pista de audio: ${ruta} (${[...new Set(audio)].join(', ')})`);
    }
    for (const { ruta } of entradas) {
      if (!revisadas.has(ruta)) fallos.push(`exiftool no revisó: ${ruta}`);
    }
  } finally {
    rmSync(temporal, { recursive: true, force: true });
  }
}

/** @param {string} ruta */
function normalizar(ruta) {
  const r = ruta.replaceAll('\\', '/');
  return process.platform === 'win32' ? r.toLowerCase() : r;
}
