// Hook pre-commit (lefthook): busca secretos en lo preparado para el commit con gitleaks.
// Si gitleaks no está instalado, el commit SE BLOQUEA. En un repositorio público, lo que llega a
// una rama ya es visible aunque la CI falle después: este hook es la última barrera antes de
// publicar, y una barrera que avisa y deja pasar no es una barrera.
// Para usar un gitleaks que no esté en el PATH: variable de entorno GITLEAKS con su ruta.
import { spawnSync } from 'node:child_process';

const orden = process.env.GITLEAKS || 'gitleaks';
const instalado = spawnSync(orden, ['version'], { encoding: 'utf8' });
if (instalado.error || instalado.status !== 0) {
  console.error(
    `✗ gitleaks no está instalado (${orden}): commit bloqueado.\n` +
      '\n' +
      '  Sin gitleaks nadie revisa este commit en busca de secretos, y en cuanto se suba será\n' +
      '  visible en GitHub aunque la CI falle después: la CI impide fusionar, no publicar.\n' +
      '\n' +
      '  Cómo instalarlo (versión fijada y SHA-256 comprobada): docs/instalacion/herramientas.md\n' +
      '  Si ya lo tienes fuera del PATH: GITLEAKS=<ruta a gitleaks> git commit …\n',
  );
  process.exit(1);
}

const r = spawnSync(orden, ['git', '--pre-commit', '--staged', '--redact', '--no-banner', '--verbose'], {
  stdio: 'inherit',
});
if (r.status !== 0) {
  console.error('✗ gitleaks ha encontrado posibles secretos en el commit (arriba, con el secreto tapado).');
}
process.exit(r.status ?? 1);
