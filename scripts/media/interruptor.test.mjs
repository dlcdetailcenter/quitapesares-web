// Interruptor del recorrido (src/recorrido/interruptor.ts): con RECORRIDO=apagado la portada es la de F1, sin
// recorrido, sin barra «Ir a la carta» y sin JavaScript. Compila de verdad en node_modules/.cache (como barrera.test).
// Se comprueban las etiquetas, no el CSS: Astro incluye los estilos de los componentes importados aunque no se
// rendericen (unos 2 KB de reglas sin uso, que no cambian nada de lo que se ve).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../..', import.meta.url));
const astro = join(raiz, 'node_modules', 'astro', 'bin', 'astro.mjs');

test('interruptor apagado: la portada (/ y /en/) es la de F1', () => {
  const cache = join(raiz, 'node_modules', '.cache');
  mkdirSync(cache, { recursive: true });
  const salida = mkdtempSync(join(cache, 'interruptor-'));
  try {
    const r = spawnSync(process.execPath, [astro, 'build', '--mode', 'demo', '--outDir', salida], {
      cwd: raiz,
      encoding: 'utf8',
      env: { ...process.env, RECORRIDO: 'apagado' },
    });
    assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`);
    for (const ruta of ['index.html', join('en', 'index.html')]) {
      const html = readFileSync(join(salida, 'client', ruta), 'utf8');
      assert.doesNotMatch(html, /<[a-z]+[^>]*\sdata-recorrido/i, `${ruta}: queda la sección del recorrido`);
      assert.doesNotMatch(html, /<nav[^>]*class="barra-carta/, `${ruta}: queda la barra`);
      assert.doesNotMatch(html, /recorrido-pendiente'\)/, `${ruta}: queda el script de decisión`);
      assert.doesNotMatch(html, /<script/i, `${ruta}: la portada de F1 no lleva JavaScript`);
      assert.match(html, /<picture\b/, `${ruta}: falta la foto de la portada`);
      assert.match(html, /class="pizarra/, `${ruta}: falta el menú del día`);
    }
  } finally {
    rmSync(salida, { recursive: true, force: true });
  }
});
