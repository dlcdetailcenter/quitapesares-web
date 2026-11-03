// Tramo aéreo del recorrido: ortofoto PNOA del IGN por WMTS, centrada en las coordenadas de src/data/restaurante.json,
// en varios niveles de zoom (cada uno el doble de cerca). El recorrido hace el zoom continuo en canvas (aire.ts).
// Si las coordenadas cambian al confirmarse, se vuelve a ejecutar: media:check falla mientras no coincidan.
//
// Servicio: https://www.ign.es/wmts/pnoa-ma, capa OI.OrthoimageCoverage, TileMatrixSet GoogleMapsCompatible (según la
// wiki de OSM). El script lo comprueba antes con GetCapabilities y para si no está.
// Licencia: CC-BY 4.0 scne.es. El AÑO del producto no viene en las teselas: se toma de la tabla de productos de
// scne.es (o de los metadatos del servicio) y se pasa con --anio; queda en meta.json y en la atribución visible.
//
// Uso: node scripts/media/ortofoto.mjs --anio <AAAA> [--zoom 15] [--niveles 4] [--calidad 70]
//      → $MATERIAL/f2/aire/nivel-0.webp… y meta.json
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const MATERIAL = resolve(process.env.MATERIAL ?? join(homedir(), 'proyectos', 'quitapesares-material'));
const SERVICIO = 'https://www.ign.es/wmts/pnoa-ma';
const CAPA = 'OI.OrthoimageCoverage';
const MATRIZ = 'GoogleMapsCompatible';
const TESELA = 256;
const LIMITE = 0.8 * 1024 * 1024;

const opcion = (nombre, porDefecto) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : porDefecto;
};
const anio = opcion('anio');
const zoom = Number(opcion('zoom', 15));
const niveles = Number(opcion('niveles', 4));
const calidad = Number(opcion('calidad', 70));
if (!/^\d{4}$/.test(anio ?? '')) {
  console.error('✗ Falta --anio <AAAA>: el año del producto PNOA, de la tabla de productos de scne.es o de los metadatos del servicio.');
  process.exit(2);
}

const tramos = JSON.parse(readFileSync(join(RAIZ, 'scripts', 'media', 'tramos.json'), 'utf8'));
const { ancho, alto } = tramos.salida;
const datos = JSON.parse(readFileSync(join(RAIZ, 'src', 'data', 'restaurante.json'), 'utf8'));
const { lat, lng } = datos.coordenadas.valor;

// 1. GetCapabilities: la capa y la matriz existen y admiten JPEG.
const capacidades = await (await fetch(`${SERVICIO}?SERVICE=WMTS&REQUEST=GetCapabilities&VERSION=1.0.0`)).text();
for (const [que, texto] of [['capa', `<ows:Identifier>${CAPA}</ows:Identifier>`], ['matriz', `<ows:Identifier>${MATRIZ}</ows:Identifier>`], ['formato', 'image/jpeg']]) {
  if (!capacidades.includes(texto)) {
    console.error(`✗ GetCapabilities no anuncia la ${que} «${texto}»: revisa el servicio antes de seguir.`);
    process.exit(1);
  }
}
console.log(`✓ GetCapabilities: ${CAPA} en ${MATRIZ}, JPEG`);

/** Píxel global de la proyección Web Mercator (EPSG:3857) a un zoom dado. */
function pixel(z) {
  const n = 2 ** z * TESELA;
  const s = Math.sin((lat * Math.PI) / 180);
  return { x: ((lng + 180) / 360) * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n };
}

const destino = join(MATERIAL, 'f2', 'aire');
mkdirSync(destino, { recursive: true });
const salidas = [];
for (let k = 0; k < niveles; k++) {
  const z = zoom + k;
  const centro = pixel(z);
  const x0 = Math.floor(centro.x - ancho / 2);
  const y0 = Math.floor(centro.y - alto / 2);
  const [c0, c1] = [Math.floor(x0 / TESELA), Math.floor((x0 + ancho - 1) / TESELA)];
  const [f0, f1] = [Math.floor(y0 / TESELA), Math.floor((y0 + alto - 1) / TESELA)];
  const temporal = mkdtempSync(join(tmpdir(), 'pnoa-'));
  try {
    let n = 0;
    for (let f = f0; f <= f1; f++) {
      for (let c = c0; c <= c1; c++) {
        const url = `${SERVICIO}?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${CAPA}&STYLE=default&TILEMATRIXSET=${MATRIZ}&TILEMATRIX=${z}&TILEROW=${f}&TILECOL=${c}&FORMAT=image/jpeg`;
        const r = await fetch(url);
        if (!r.ok) throw new Error(`tesela z${z} f${f} c${c}: ${r.status}`);
        writeFileSync(join(temporal, `${String(n++).padStart(4, '0')}.jpg`), Buffer.from(await r.arrayBuffer()));
      }
    }
    const archivo = `nivel-${k}.webp`;
    const r = spawnSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '1', '-i', join(temporal, '%04d.jpg'),
      '-vf', `tile=${c1 - c0 + 1}x${f1 - f0 + 1},crop=${ancho}:${alto}:${x0 - c0 * TESELA}:${y0 - f0 * TESELA}`,
      '-frames:v', '1', '-c:v', 'libwebp', '-quality', String(calidad), '-map_metadata', '-1', '-fflags', '+bitexact', join(destino, archivo),
    ], { stdio: 'inherit' });
    if (r.status !== 0) throw new Error(`ffmpeg ha fallado en el nivel ${k}`);
    salidas.push(archivo);
    console.log(`✓ nivel ${k} (zoom ${z}): ${n} teselas → ${archivo}`);
  } finally {
    rmSync(temporal, { recursive: true, force: true });
  }
}

const peso = salidas.reduce((t, a) => t + statSync(join(destino, a)).size, 0);
writeFileSync(
  join(destino, 'meta.json'),
  `${JSON.stringify({ servicio: SERVICIO, capa: CAPA, matriz: MATRIZ, zooms: salidas.map((_, k) => zoom + k), centro: { lat, lng }, anio, licencia: 'CC-BY 4.0 scne.es', niveles: salidas.map((a) => `aire/${a}`), fecha: new Date().toISOString() }, null, 2)}\n`,
);
console.log(`Peso del tramo aéreo: ${(peso / 1024 / 1024).toFixed(2)} MB (máximo 0,8 MB)`);
if (peso > LIMITE) {
  console.error('✗ Pasa de 0,8 MB: baja --calidad o --niveles.');
  process.exit(1);
}
