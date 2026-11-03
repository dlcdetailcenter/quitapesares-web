// Antes de compilar (npm run build → prebuild): deja el material del recorrido en public/recorrido/ (ignorada por git).
//   - Por defecto, un recorrido SINTÉTICO de colores lisos, generado aquí mismo: es el que usan las pruebas y la CI.
//     No contiene nada real, así que no hay nada que proteger ni que pesar.
//   - Con RECORRIDO_MATERIAL=real, copia recorrido-real/ (ignorada por git), que antes ha pasado media:check.
// public/recorrido/lab/ (material de /lab/scroll) no se toca.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const DESTINO = join(RAIZ, 'public', 'recorrido');
const REAL = join(RAIZ, 'recorrido-real');

/** PNG de un solo color, sin metadatos (RGB, 8 bits). */
export function pngLiso(ancho, alto, [r, g, b]) {
  const crc = (buf) => {
    let c = ~0;
    for (const byte of buf) {
      c ^= byte;
      for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
  };
  const trozo = (tipo, datos) => {
    const cab = Buffer.alloc(8);
    cab.writeUInt32BE(datos.length, 0);
    cab.write(tipo, 4, 'ascii');
    const fin = Buffer.alloc(4);
    fin.writeUInt32BE(crc(Buffer.concat([Buffer.from(tipo, 'ascii'), datos])), 0);
    return Buffer.concat([cab, datos, fin]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ancho, 0);
  ihdr.writeUInt32BE(alto, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  const fila = Buffer.alloc(1 + ancho * 3);
  for (let x = 0; x < ancho; x++) fila.set([r, g, b], 1 + x * 3);
  const crudo = Buffer.concat(Array.from({ length: alto }, () => fila));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    trozo('IHDR', ihdr),
    trozo('IDAT', deflateSync(crudo)),
    trozo('IEND', Buffer.alloc(0)),
  ]);
}

function limpiarDestino() {
  mkdirSync(DESTINO, { recursive: true });
  for (const f of readdirSync(DESTINO)) if (f !== 'lab') rmSync(join(DESTINO, f), { recursive: true, force: true });
}

function sintetico() {
  limpiarDestino();
  const escribir = (ruta, datos) => {
    mkdirSync(join(DESTINO, ruta, '..'), { recursive: true });
    writeFileSync(join(DESTINO, ruta), datos);
  };
  // Aire: tres «niveles» lisos en verdes y ocres. Nubes: ninguna pieza (el recorrido las dibuja sin IA).
  const niveles = [[74, 98, 66], [120, 112, 80], [168, 140, 98]].map((color, i) => {
    escribir(`aire/nivel-${i}.png`, pngLiso(90, 160, color));
    return `aire/nivel-${i}.png`;
  });
  // Tramos: 24 fotogramas lisos cada uno, el tono cambia de un fotograma a otro para ver que se mueven.
  const bases = { puerta: [142, 27, 42], barra: [110, 70, 40], comedor: [60, 50, 90] };
  const tramos = Object.entries(bases).map(([id, [r, g, b]]) => {
    for (let i = 0; i < 24; i++) {
      const k = i * 4;
      escribir(`${id}/${String(i + 1).padStart(4, '0')}.png`, pngLiso(36, 64, [Math.min(255, r + k), g, Math.max(0, b - k / 2)]));
    }
    return { id, fotogramas: 24, patron: `${id}/%04d.png`, pantallas: 2 };
  });
  const config = {
    material: 'sintetico',
    ancho: 720,
    alto: 1280,
    aire: { niveles, nubes: [], pantallas: 1.5, pnoa: null },
    tramos,
    ia: [],
  };
  writeFileSync(join(DESTINO, 'recorrido.json'), `${JSON.stringify(config, null, 2)}\n`);
  console.log('recorrido: material SINTÉTICO (colores lisos) en public/recorrido/');
}

function real() {
  if (!existsSync(join(REAL, 'recorrido.json'))) {
    console.error('✗ RECORRIDO_MATERIAL=real pero no hay recorrido-real/recorrido.json (scripts/media/ensamblar.mjs).');
    process.exit(1);
  }
  limpiarDestino();
  cpSync(REAL, DESTINO, { recursive: true });
  console.log('recorrido: material REAL copiado de recorrido-real/ a public/recorrido/ (ignorada por git)');
}

// Solo al ejecutarlo (prebuild), no al importarlo (las pruebas usan pngLiso).
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  if (process.env.RECORRIDO_MATERIAL === 'real') real();
  else sintetico();
}
