// Pruebas de las barreras de material de F2 (node --test, dentro de npm run test:datos):
//   - check:media rechaza vídeos con pista de audio y material del recorrido versionado;
//   - media:check (material real) rechaza peso, sumas, audio, metadatos y dimensiones que no cuadran.
// Los vídeos de prueba (pruebas/*.mp4.bin) son sintéticos: un color liso de 16×16 px, uno con un tono de audio.
// Sin exiftool, las pruebas que lo necesitan se saltan, salvo con EXIGIR_EXIFTOOL=1 (trabajo «media» de la CI).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { comprobar, listar, sha256 } from './media-check.mjs';
import { pngLiso } from './preparar.mjs';

const RAIZ = fileURLToPath(new URL('../..', import.meta.url));
const PRUEBAS = join(RAIZ, 'scripts', 'media', 'pruebas');
const hayExiftool = !spawnSync(process.env.EXIFTOOL || 'exiftool', ['-ver']).error;
const sinExiftool = !hayExiftool && !process.env.EXIGIR_EXIFTOOL ? 'exiftool no está instalado' : false;

function repoTemporal() {
  const dir = mkdtempSync(join(tmpdir(), 'check-media-prueba-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  return dir;
}

function checkMedia(dir) {
  const r = spawnSync(process.execPath, [join(RAIZ, 'scripts', 'check-media.mjs'), '--staged'], { cwd: dir, encoding: 'utf8' });
  return { codigo: r.status, texto: `${r.stdout}\n${r.stderr}` };
}

function preparar(dir, ruta, origen) {
  mkdirSync(join(dir, ruta, '..'), { recursive: true });
  if (typeof origen === 'string') copyFileSync(origen, join(dir, ruta));
  else writeFileSync(join(dir, ruta), origen);
  spawnSync('git', ['add', '-f', ruta], { cwd: dir });
}

test('check:media: un vídeo con pista de audio bloquea el commit', { skip: sinExiftool }, () => {
  const dir = repoTemporal();
  try {
    preparar(dir, 'video.mp4', join(PRUEBAS, 'con-audio.mp4.bin'));
    const { codigo, texto } = checkMedia(dir);
    assert.notEqual(codigo, 0, texto);
    assert.match(texto, /Lleva pista de audio: video\.mp4/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('check:media: un vídeo sin audio pasa', { skip: sinExiftool }, () => {
  const dir = repoTemporal();
  try {
    preparar(dir, 'video.mp4', join(PRUEBAS, 'sin-audio.mp4.bin'));
    const { codigo, texto } = checkMedia(dir);
    assert.equal(codigo, 0, texto);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('check:media: el material del recorrido no entra en git durante F2', () => {
  const dir = repoTemporal();
  try {
    preparar(dir, 'public/recorrido/recorrido.json', Buffer.from('{}'));
    preparar(dir, 'recorrido-real/recorrido.json', Buffer.from('{}'));
    const { codigo, texto } = checkMedia(dir);
    assert.notEqual(codigo, 0, texto);
    assert.match(texto, /Material del recorrido versionado.*public\/recorrido\/recorrido\.json/);
    assert.match(texto, /Material del recorrido versionado.*recorrido-real\/recorrido\.json/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** Carpeta de material «real» de prueba: 3 fotogramas lisos de 72×128 y su manifiesto. */
function materialDePrueba() {
  const dir = mkdtempSync(join(tmpdir(), 'media-check-prueba-'));
  mkdirSync(join(dir, 'puerta'));
  for (let i = 1; i <= 3; i++) writeFileSync(join(dir, 'puerta', `000${i}.png`), pngLiso(72, 128, [142, 27, 42 + i]));
  const config = { material: 'real', ancho: 72, alto: 128, aire: { niveles: [], nubes: [], pantallas: 1, pnoa: null }, tramos: [{ id: 'puerta', fotogramas: 3, patron: 'puerta/%04d.png', pantallas: 2 }], ia: [] };
  writeFileSync(join(dir, 'recorrido.json'), JSON.stringify(config));
  const manifiesto = join(dir, '..', `${dir.split(/[\\/]/).pop()}-manifiesto.json`);
  const escribirManifiesto = () => {
    const archivos = {};
    for (const r of listar(dir)) archivos[r] = { sha256: sha256(join(dir, r)), ...(r.endsWith('.png') ? { ancho: 72, alto: 128 } : {}) };
    writeFileSync(manifiesto, JSON.stringify({ archivos }));
  };
  escribirManifiesto();
  const limpiar = () => {
    rmSync(dir, { recursive: true, force: true });
    rmSync(manifiesto, { force: true });
  };
  return { dir, manifiesto, escribirManifiesto, limpiar };
}

test('media:check: material correcto pasa', { skip: sinExiftool }, () => {
  const m = materialDePrueba();
  try {
    const { fallos } = comprobar(m.dir, m.manifiesto);
    assert.deepEqual(fallos, []);
  } finally {
    m.limpiar();
  }
});

test('media:check: suma distinta, archivo fuera del manifiesto y vídeo con audio', { skip: sinExiftool }, () => {
  const m = materialDePrueba();
  try {
    writeFileSync(join(m.dir, 'puerta', '0001.png'), pngLiso(72, 128, [0, 0, 0]));
    copyFileSync(join(PRUEBAS, 'con-audio.mp4.bin'), join(m.dir, 'extra.mp4'));
    const texto = comprobar(m.dir, m.manifiesto).fallos.join('\n');
    assert.match(texto, /SHA-256 distinta de la del manifiesto: puerta\/0001\.png/);
    assert.match(texto, /No está en el manifiesto: extra\.mp4/);
    assert.match(texto, /Lleva pista de audio: extra\.mp4/);
  } finally {
    m.limpiar();
  }
});

test('media:check: fotograma con otras dimensiones y más de 8 MB en total', { skip: sinExiftool }, () => {
  const m = materialDePrueba();
  try {
    writeFileSync(join(m.dir, 'puerta', '0002.png'), pngLiso(64, 128, [142, 27, 44]));
    writeFileSync(join(m.dir, 'relleno.json'), Buffer.alloc(8 * 1024 * 1024 + 1, 0x20));
    m.escribirManifiesto();
    const texto = comprobar(m.dir, m.manifiesto).fallos.join('\n');
    assert.match(texto, /Fotograma de puerta de 64×128; recorrido\.json dice 72×128/);
    assert.match(texto, /el límite es 8 MB/);
  } finally {
    m.limpiar();
  }
});
