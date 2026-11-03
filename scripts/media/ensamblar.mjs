// Monta recorrido-real/ (ignorada por git) con el material ya procesado y escribe su manifiesto de sumas SHA-256 en
// scripts/media/manifiesto-real.json (ese sí va al repositorio: sumas y dimensiones, nada del contenido).
//   - aire: $MATERIAL/f2/aire/ (scripts/media/ortofoto.mjs): nivel-0.webp… y meta.json (año del PNOA, centro);
//   - nubes: $MATERIAL/f2/ia/nubes-1.webp… solo las piezas ACEPTADAS (ia/aceptadas.json, con su prompt y modelo);
//   - tramos: $MATERIAL/f2/05-export/canvas/<tramo>/ de los tramos definidos en tramos.json.
// Después: npm run media:check (y el despliegue lo vuelve a ejecutar).
//
// Uso: node scripts/media/ensamblar.mjs [--config tramos.json]
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listar, sha256 } from './media-check.mjs';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const MATERIAL = resolve(process.env.MATERIAL ?? join(homedir(), 'proyectos', 'quitapesares-material'));
const F2 = join(MATERIAL, 'f2');
const DESTINO = join(RAIZ, 'recorrido-real');
const args = process.argv.slice(2);
const i = args.indexOf('--config');
const config = JSON.parse(readFileSync(i >= 0 ? resolve(args[i + 1]) : join(RAIZ, 'scripts', 'media', 'tramos.json'), 'utf8'));

function fallar(m) {
  console.error(`✗ ${m}`);
  process.exit(1);
}

rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });

// Aire.
// Sin ortofoto, el aire es solo cielo y nubes (aire.ts): se avisa, no se inventa nada.
const metaAire = join(F2, 'aire', 'meta.json');
const hayOrtofoto = existsSync(metaAire);
if (!hayOrtofoto) console.warn(`⚠ sin ortofoto (${metaAire}): el tramo aéreo será cielo con nubes. npm run media:ortofoto`);
const aire = hayOrtofoto ? JSON.parse(readFileSync(metaAire, 'utf8')) : { niveles: [], anio: null, centro: null };
if (hayOrtofoto) cpSync(join(F2, 'aire'), join(DESTINO, 'aire'), { recursive: true, filter: (f) => !f.endsWith('meta.json') });

// Piezas de IA aceptadas (si no hay ninguna, el recorrido dibuja las nubes sin IA).
const aceptadas = join(F2, 'ia', 'aceptadas.json');
const ia = existsSync(aceptadas) ? JSON.parse(readFileSync(aceptadas, 'utf8')) : [];
const nubes = [];
for (const pieza of ia.filter((p) => p.uso === 'nubes')) {
  mkdirSync(join(DESTINO, 'nubes'), { recursive: true });
  cpSync(join(F2, 'ia', pieza.archivo), join(DESTINO, 'nubes', pieza.archivo));
  nubes.push(`nubes/${pieza.archivo}`);
}

// Tramos reales.
const tramos = [];
for (const t of config.tramos.filter((x) => x.inicio !== null && x.fin !== null)) {
  const origen = join(F2, '05-export', 'canvas', t.id);
  if (!existsSync(origen)) fallar(`falta el tramo exportado ${origen} (npm run media:procesar -- exportar ${t.id} canvas)`);
  cpSync(origen, join(DESTINO, t.id), { recursive: true });
  const fotogramas = listar(origen).filter((f) => f.endsWith('.webp')).length;
  tramos.push({ id: t.id, fotogramas, patron: `${t.id}/%04d.webp`, pantallas: t.pantallas ?? 2 });
}

const recorrido = {
  material: 'real',
  ancho: config.salida.ancho,
  alto: config.salida.alto,
  aire: {
    niveles: aire.niveles,
    nubes,
    // Pantallas de scroll del aire: de tramos.json, como las de los tramos.
    pantallas: config.aire?.pantallas ?? 1,
    pnoa: hayOrtofoto ? { anio: aire.anio } : null,
    centro: aire.centro,
  },
  tramos,
  ia: nubes.length ? [{ es: 'nubes', en: 'clouds', herramienta: 'Higgsfield' }] : [],
};
writeFileSync(join(DESTINO, 'recorrido.json'), `${JSON.stringify(recorrido, null, 2)}\n`);

// Manifiesto con suma y dimensiones de cada archivo (las dimensiones, con exiftool).
const archivos = {};
for (const r of listar(DESTINO)) {
  const e = spawnSync(process.env.EXIFTOOL || 'exiftool', ['-json', '-n', '-ImageWidth', '-ImageHeight', join(DESTINO, r)], { encoding: 'utf8' });
  const [d] = r.endsWith('.json') ? [{}] : JSON.parse(e.stdout || '[{}]');
  archivos[r] = { sha256: sha256(join(DESTINO, r)), ...(d.ImageWidth ? { ancho: d.ImageWidth, alto: d.ImageHeight } : {}) };
}
writeFileSync(
  join(RAIZ, 'scripts', 'media', 'manifiesto-real.json'),
  `${JSON.stringify({ $comentario: 'Sumas SHA-256 y dimensiones del material real del recorrido (recorrido-real/). Lo escribe scripts/media/ensamblar.mjs y lo comprueba npm run media:check.', archivos }, null, 2)}\n`,
);
console.log(`✓ recorrido-real/: ${Object.keys(archivos).length} archivos; manifiesto en scripts/media/manifiesto-real.json`);
