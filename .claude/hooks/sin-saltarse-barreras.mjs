// Hook PreToolUse de Claude Code: deniega los comandos que desactivarían las barreras del
// repositorio. Lo lanza .claude/settings.json en cada llamada a Bash o PowerShell, con
// onFailure: "block", así que si este script se rompe el comando tampoco se ejecuta.
//
// Las barreras (hooks de pre-commit, regla de main) solo valen si no se pueden apagar. Un agente
// que puede escribir `--no-verify` cuando el hook le molesta no tiene barreras, tiene sugerencias.
// Si un hook bloquea por error, lo quita Kara con `npx lefthook uninstall`, no Claude.
//
// A propósito, se revisa el comando entero sin excepciones por comillas: `git commit "--no-verify"`
// también salta el hook, así que fiarse de las comillas abriría la puerta. El precio es que un
// comando que solo *menciona* estas palabras (documentarlas, buscarlas con grep, un mensaje de
// commit que las nombre) también se deniega: para eso están la herramienta Write y
// `git commit -F archivo`.
import { readFileSync } from 'node:fs';

/** @type {Array<{nombre: string, prueba: (c: string) => boolean, porque: string}>} */
const PROHIBIDOS = [
  {
    nombre: '--no-verify',
    prueba: (c) => /--no-verify\b/i.test(c) || (esGit(c) && /\s-n\b/.test(c)),
    porque: 'salta los hooks de pre-commit (gitleaks y check:media), la última barrera antes de publicar',
  },
  {
    nombre: 'LEFTHOOK=0',
    prueba: (c) => /\bLEFTHOOK\s*=\s*(0|false|"0"|'0')/i.test(c) || /\$env:LEFTHOOK\s*=/i.test(c),
    porque: 'desactiva lefthook, que es quien ejecuta los hooks de pre-commit',
  },
  {
    nombre: 'core.hooksPath',
    prueba: (c) => /core\.hooksPath/i.test(c),
    porque: 'cambia de sitio los hooks de git: los instalados dejan de ejecutarse',
  },
  {
    nombre: 'lefthook uninstall',
    prueba: (c) => /lefthook(\.exe)?\s+uninstall\b/i.test(c),
    porque: 'desinstala los hooks del repositorio; esa decisión es de Kara, no de Claude',
  },
  {
    nombre: 'git push --force',
    prueba: (c) => esPush(c) && (/--force(-with-lease|-if-includes)?\b/i.test(c) || /\s-f\b/.test(c) || /\s\+[^\s]+:/.test(c)),
    porque: 'reescribe el historial publicado y puede borrar commits de main',
  },
];

const esGit = (c) => /\bgit\b[\s\S]*\b(commit|push|merge|revert|cherry-pick|rebase)\b/i.test(c);
const esPush = (c) => /\bgit\b[\s\S]*\bpush\b/i.test(c);

let entrada = '';
try {
  entrada = readFileSync(0, 'utf8');
} catch {
  entrada = '';
}

let comando = '';
try {
  const json = JSON.parse(entrada || '{}');
  comando = String(json?.tool_input?.command ?? '');
} catch {
  // Entrada ilegible: con onFailure "block" es más seguro fallar que dejar pasar a ciegas.
  console.error('sin-saltarse-barreras: no he podido leer la entrada del hook.');
  process.exit(1);
}

const encontrados = PROHIBIDOS.filter((p) => p.prueba(comando));
if (encontrados.length === 0) process.exit(0);

const motivo =
  `Comando denegado por .claude/settings.json de este repositorio: ${encontrados.map((p) => p.nombre).join(', ')}.\n` +
  encontrados.map((p) => `· ${p.nombre}: ${p.porque}.`).join('\n') +
  '\n\nLas barreras no se apagan para que un commit pase. Si una bloquea por error, lo dice y lo' +
  ' decide Kara (CLAUDE.md). Si solo necesitas escribir o nombrar estas palabras, usa la' +
  ' herramienta Write o `git commit -F archivo` en vez de ponerlas en el comando.';

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: motivo,
    },
  }),
);
process.exit(0);
