// Barrera de la maqueta (excepción a FIDELIDAD de Kara del 2026-11-03, CLAUDE.md): build:produccion falla con la
// variante maqueta o si el recorrido tiene alguna pieza «"ia": "local"», aunque todos los datos estuvieran confirmados.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { barreraMaqueta, tieneIaDelLocal } from './integracion-astro.mjs';
import { validarDatos } from './validar.mjs';

const raiz = fileURLToPath(new URL('../..', import.meta.url));
const astro = join(raiz, 'node_modules', 'astro', 'bin', 'astro.mjs');

const real = { material: 'real', aire: { nubes: ['nubes/nubes-1.webp'] }, tramos: [{ id: 'puerta' }], ia: [{ es: 'nubes', en: 'clouds', herramienta: 'Higgsfield' }] };
const conMaqueta = { ...real, tramos: [{ id: 'puerta' }, { id: 'fachada', ia: 'local' }] };

test('«"ia": "local"» se encuentra a cualquier profundidad; las nubes declaradas no cuentan como IA del local', () => {
  assert.equal(tieneIaDelLocal(real), false);
  assert.equal(tieneIaDelLocal(conMaqueta), true);
  assert.equal(tieneIaDelLocal({ a: { b: [{ c: { ia: 'local' } }] } }), true);
  assert.equal(tieneIaDelLocal({ ia: 'nubes' }), false);
  assert.equal(tieneIaDelLocal(undefined), false);
});

test('producción: la variante maqueta y las piezas «ia: local» bloquean; la demo no', () => {
  assert.deepEqual(barreraMaqueta('production', { variante: undefined, recorrido: real }), []);
  assert.equal(barreraMaqueta('production', { variante: 'maqueta', recorrido: real }).length, 1);
  assert.equal(barreraMaqueta('production', { variante: undefined, recorrido: conMaqueta }).length, 1);
  assert.equal(barreraMaqueta('production', { variante: 'maqueta', recorrido: conMaqueta }).length, 2);
  // Cualquier modo que no sea demo es producción (como la barrera de datos).
  assert.equal(barreraMaqueta('development', { variante: 'maqueta', recorrido: real }).length, 1);
  assert.deepEqual(barreraMaqueta('demo', { variante: 'maqueta', recorrido: conMaqueta }), []);
});

test('aunque todos los datos estuvieran confirmados, la maqueta sigue bloqueando producción', () => {
  // Los datos del restaurante, todos CONFIRMADOS (copia en memoria: el archivo real no se toca).
  const datos = JSON.parse(readFileSync(join(raiz, 'src', 'data', 'restaurante.json'), 'utf8'));
  for (const d of Object.values(datos)) {
    d.estado = 'CONFIRMADO';
    d.confirmadoPor = { quien: 'Prueba', fecha: '2026-11-03' };
  }
  const { errores, pendientes } = validarDatos(datos);
  assert.deepEqual(errores, []);
  assert.deepEqual(pendientes, []);
  // La barrera de la maqueta no depende de los datos: sigue diciendo que no.
  assert.ok(barreraMaqueta('production', { variante: 'maqueta', recorrido: real }).length > 0);
  assert.ok(barreraMaqueta('production', { variante: undefined, recorrido: conMaqueta }).length > 0);
});

test('astro build en modo producción con RECORRIDO_VARIANTE=maqueta falla por la maqueta (antes que por los datos)', () => {
  // Como barrera.test.mjs: compila de verdad, con la salida dentro del proyecto para que encuentre sus dependencias.
  const cache = join(raiz, 'node_modules', '.cache');
  mkdirSync(cache, { recursive: true });
  const salida = mkdtempSync(join(cache, 'barrera-maqueta-'));
  try {
    const r = spawnSync(process.execPath, [astro, 'build', '--mode', 'production', '--outDir', salida], {
      cwd: raiz,
      encoding: 'utf8',
      env: { ...process.env, RECORRIDO_VARIANTE: 'maqueta' },
    });
    const texto = `${r.stdout}\n${r.stderr}`;
    assert.notEqual(r.status, 0, 'debía fallar y ha compilado');
    assert.match(texto, /bloqueada por la maqueta/);
    assert.match(texto, /RECORRIDO_VARIANTE=maqueta/);
  } finally {
    rmSync(salida, { recursive: true, force: true });
  }
});

test('demo:desplegar no despliega la maqueta por la variable de entorno sola: hace falta --maqueta', () => {
  // Sale antes de compilar ni desplegar nada (código 2), así que la prueba no toca Cloudflare.
  const r = spawnSync(process.execPath, [join(raiz, 'scripts', 'desplegar-demo.mjs')], {
    cwd: raiz,
    encoding: 'utf8',
    env: { ...process.env, RECORRIDO_VARIANTE: 'maqueta' },
  });
  assert.equal(r.status, 2, `${r.stdout}\n${r.stderr}`);
  assert.match(r.stderr, /sin --maqueta/);
});

test('preparar: una variante que no existe para la compilación', () => {
  const r = spawnSync(process.execPath, [join(raiz, 'scripts', 'media', 'preparar.mjs')], {
    cwd: raiz,
    encoding: 'utf8',
    env: { ...process.env, RECORRIDO_VARIANTE: 'otra' },
  });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /no existe/);
});
