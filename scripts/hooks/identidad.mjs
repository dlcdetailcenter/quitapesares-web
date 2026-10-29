// Hook pre-commit (lefthook): bloquea el commit si el autor o el committer no son una identidad
// permitida en este repositorio.
//
// El repositorio es público: el nombre y el correo de cada commit quedan a la vista para siempre, y
// reescribir la historia no los borra (las PR conservan los commits viejos). Por eso la identidad
// se comprueba antes de crear el commit, no después.
//
// Permitidas:
//   - Quitapesares Web <274641643+dlcdetailcenter@users.noreply.github.com>  (noreply de la cuenta)
//   - Claude <noreply@anthropic.com>
//
// Se lee con `git var`, que es lo que git va a usar de verdad: tiene en cuenta la configuración y
// también GIT_AUTHOR_EMAIL o GIT_COMMITTER_EMAIL si se pasan en el entorno.
import { spawnSync } from 'node:child_process';

const PERMITIDOS = ['274641643+dlcdetailcenter@users.noreply.github.com', 'noreply@anthropic.com'];
const CORREO_PROYECTO = PERMITIDOS[0];
// Solo como committer: asi firma GitHub los commits que hace el propio GitHub, como el de fusion de
// una PR. No es un correo personal y no se puede cambiar sin renunciar a fusionar por PR. Como autor
// no vale: un commit escrito aqui no lo ha hecho GitHub.
const PERMITIDOS_COMMITTER = [...PERMITIDOS, 'noreply@github.com'];

/** @param {'GIT_AUTHOR_IDENT' | 'GIT_COMMITTER_IDENT'} cual */
function identidad(cual) {
  const r = spawnSync('git', ['var', cual], { encoding: 'utf8' });
  if (r.error || r.status !== 0) {
    console.error(`✗ no he podido leer ${cual}: ${r.error?.message ?? r.stderr}`);
    process.exit(2);
  }
  // Formato: "Nombre <correo> 1730200000 +0100"
  const m = /^(.*) <([^>]*)> \d+ [+-]\d{4}$/.exec(r.stdout.trim());
  if (!m) {
    console.error(`✗ no entiendo lo que ha devuelto git var ${cual}: ${r.stdout.trim()}`);
    process.exit(2);
  }
  return { nombre: m[1], correo: m[2] };
}

const autor = identidad('GIT_AUTHOR_IDENT');
const committer = identidad('GIT_COMMITTER_IDENT');
const mal = [
  ['autor', autor, PERMITIDOS],
  ['committer', committer, PERMITIDOS_COMMITTER],
].filter(([, i, permitidos]) => !permitidos.includes(i.correo));

if (mal.length > 0) {
  console.error('✗ identidad no permitida en este repositorio: commit bloqueado.');
  for (const [papel, i] of mal) console.error(`  ${papel}: ${i.nombre} <${i.correo}>`);
  console.error(
    '\n  Este repositorio es público: ese correo quedaría a la vista en el historial para siempre.\n' +
      '  Identidades permitidas:\n' +
      PERMITIDOS.map((c) => `    · ${c}`).join('\n') +
      '\n    · noreply@github.com (solo como committer, lo pone GitHub al fusionar)' +
      '\n\n  Para arreglarlo, solo en este repositorio (no en tu git global):\n' +
      `    git config user.name "Quitapesares Web"\n` +
      `    git config user.email "${CORREO_PROYECTO}"\n`,
  );
  process.exit(1);
}
