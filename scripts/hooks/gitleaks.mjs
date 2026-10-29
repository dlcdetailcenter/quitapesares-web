// Hook pre-commit (lefthook): busca secretos en lo preparado para el commit con gitleaks.
// Si gitleaks no está instalado, avisa y deja pasar: la barrera es entonces la CI
// (y push protection en GitHub, que solo reconoce secretos con formato de proveedor).
import { spawnSync } from 'node:child_process';

const instalado = spawnSync('gitleaks', ['version'], { encoding: 'utf8' });
if (instalado.error || instalado.status !== 0) {
  console.warn(
    '⚠ gitleaks no está instalado: este commit no se ha revisado en busca de secretos.\n' +
      '  La CI lo revisará al subirlo, pero para entonces ya será visible en GitHub.',
  );
  process.exit(0);
}

const r = spawnSync('gitleaks', ['git', '--pre-commit', '--staged', '--redact', '--no-banner', '--verbose'], {
  stdio: 'inherit',
});
if (r.status !== 0) {
  console.error('✗ gitleaks ha encontrado posibles secretos en el commit (arriba, con el secreto tapado).');
}
process.exit(r.status ?? 1);
