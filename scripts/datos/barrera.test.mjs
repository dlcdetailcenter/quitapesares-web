// Prueba de la barrera dentro de `astro build` (node --test): compila de verdad en los dos modos
// y comprueba que el resultado cuadra con el estado actual de src/data/restaurante.json.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarDatos } from './validar.mjs';

const raiz = fileURLToPath(new URL('../..', import.meta.url));
const astro = join(raiz, 'node_modules', 'astro', 'bin', 'astro.mjs');
const { pendientes } = validarDatos(JSON.parse(readFileSync(join(raiz, 'src', 'data', 'restaurante.json'), 'utf8')));

/** @param {string} modo */
function compilar(modo) {
  const salida = mkdtempSync(join(tmpdir(), 'quitapesares-'));
  try {
    const r = spawnSync(process.execPath, [astro, 'build', '--mode', modo, '--outDir', salida], {
      cwd: raiz,
      encoding: 'utf8',
    });
    return { codigo: r.status, texto: `${r.stdout}\n${r.stderr}` };
  } finally {
    rmSync(salida, { recursive: true, force: true });
  }
}

test('modo production: falla si hay datos sin confirmar y compila si están todos', () => {
  const { codigo, texto } = compilar('production');
  if (pendientes.length > 0) {
    assert.notEqual(codigo, 0, 'debía fallar y ha compilado');
    assert.match(texto, /Compilación de producción bloqueada/);
  } else {
    assert.equal(codigo, 0, texto);
  }
});

test('modo demo: compila y avisa de los datos sin confirmar', () => {
  const { codigo, texto } = compilar('demo');
  assert.equal(codigo, 0, texto);
  if (pendientes.length > 0) assert.match(texto, /Compilación DEMO: faltan \d+ de \d+ datos por confirmar/);
});
