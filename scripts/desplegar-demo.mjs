// Despliegue de la DEMO PRIVADA del recorrido (encargo de F2: autorizado; producción, no).
//   1. npm run media:check sobre la carpeta de la variante: si falla, no se despliega nada;
//   2. compilación demo con esa variante (el material se copia a public/recorrido/, ignorada por git);
//   3. wrangler deploy del Worker quitapesares-web.
// Variantes:
//   - por defecto, el material REAL (recorrido-real/, manifiesto-real.json);
//   - --maqueta, la MAQUETA para la demo al dueño (recorrido-maqueta/, manifiesto-maqueta.json): IA sobre fotos del
//     local, excepción a FIDELIDAD de Kara del 2026-11-03 (CLAUDE.md). Solo con la opción explícita: la variable de
//     entorno RECORRIDO_VARIANTE sola no basta, y si está puesta sin --maqueta, no se despliega nada;
//   - --sintetico, sin material real, para probar el despliegue.
// Vuelta atrás: npx wrangler rollback (versión anterior) o desplegar otra vez sin --maqueta (variante real).
//
// Uso: node scripts/desplegar-demo.mjs [--maqueta | --sintetico]
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const conMaqueta = process.argv.includes('--maqueta');
const sintetico = process.argv.includes('--sintetico');

function paso(nombre, orden, args, env = {}) {
  console.log(`\n── ${nombre}`);
  const r = spawnSync(orden, args, { cwd: RAIZ, stdio: 'inherit', env: { ...process.env, ...env }, shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`✗ ${nombre} ha fallado: no se despliega.`);
    process.exit(1);
  }
}

if (conMaqueta && sintetico) {
  console.error('✗ --maqueta y --sintetico a la vez: elige una variante.');
  process.exit(2);
}
if (process.env.RECORRIDO_VARIANTE && !conMaqueta) {
  console.error(`✗ RECORRIDO_VARIANTE="${process.env.RECORRIDO_VARIANTE}" puesta sin --maqueta: la maqueta solo se despliega con la opción explícita.`);
  process.exit(2);
}

const variante = conMaqueta ? 'MAQUETA (IA sobre fotos del local, solo demo privada)' : sintetico ? 'SINTÉTICA (pruebas)' : 'REAL';
console.log(`Variante que se despliega: ${variante}`);

if (conMaqueta) {
  paso('media:check (maqueta)', 'node', ['scripts/media/media-check.mjs', 'recorrido-maqueta', 'scripts/media/manifiesto-maqueta.json']);
  paso('Compilación demo (maqueta)', 'npm', ['run', 'build'], { RECORRIDO_VARIANTE: 'maqueta', RECORRIDO_MATERIAL: '' });
} else if (sintetico) {
  paso('Compilación demo (sintética)', 'npm', ['run', 'build'], { RECORRIDO_VARIANTE: '', RECORRIDO_MATERIAL: '' });
} else {
  paso('media:check (real)', 'node', ['scripts/media/media-check.mjs']);
  paso('Compilación demo (real)', 'npm', ['run', 'build'], { RECORRIDO_VARIANTE: '', RECORRIDO_MATERIAL: 'real' });
}
paso('Despliegue (wrangler deploy)', 'npx', ['wrangler', 'deploy']);
console.log(`\n✓ Demo desplegada con la variante ${variante}. Comprueba noindex: curl -sI <URL>/ y <URL>/en/ (X-Robots-Tag: noindex, nofollow).`);
