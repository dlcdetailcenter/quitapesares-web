// Despliegue de la DEMO PRIVADA con el material real del recorrido (encargo de F2: autorizado; producción, no).
//   1. npm run media:check sobre recorrido-real/: si falla, no se despliega nada;
//   2. compilación demo con RECORRIDO_MATERIAL=real (el material se copia a public/recorrido/, ignorada por git);
//   3. wrangler deploy del Worker quitapesares-web.
// Vuelta atrás: npx wrangler rollback (versión anterior) o RECORRIDO=apagado npm run build y desplegar otra vez.
//
// Uso: node scripts/desplegar-demo.mjs [--sintetico]   (--sintetico: sin material real, para probar el despliegue)
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const sintetico = process.argv.includes('--sintetico');

function paso(nombre, orden, args, env = {}) {
  console.log(`\n── ${nombre}`);
  const r = spawnSync(orden, args, { cwd: RAIZ, stdio: 'inherit', env: { ...process.env, ...env }, shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.error(`✗ ${nombre} ha fallado: no se despliega.`);
    process.exit(1);
  }
}

if (!sintetico) paso('media:check', 'node', ['scripts/media/media-check.mjs']);
paso('Compilación demo', 'npm', ['run', 'build'], sintetico ? {} : { RECORRIDO_MATERIAL: 'real' });
paso('Despliegue (wrangler deploy)', 'npx', ['wrangler', 'deploy']);
console.log('\n✓ Demo desplegada. Comprueba noindex: curl -sI <URL>/ y <URL>/en/ (X-Robots-Tag: noindex, nofollow).');
