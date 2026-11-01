# CLAUDE.md · web del Restaurante Quitapesares

Instrucciones para Claude Code en este repositorio. **Son instrucciones, no garantías**: lo que de verdad impide errores son las barreras de la tabla final (compilación, CI, hooks y ajustes de GitHub).

## Estado y traspaso

@docs/ESTADO.md

Esa línea importa el estado del proyecto y lo carga junto con este CLAUDE.md al empezar la sesión. Va **sin comillas invertidas**: entre comillas invertidas el archivo no se importa, solo se menciona.

- **Al empezar sesión**: di en 3 líneas la fase, lo que está a medias y el siguiente paso. Si `docs/ESTADO.md` contradice al repositorio o a GitHub, avísalo: manda lo comprobado y se corrige el archivo.
- **Cuando Kara diga «cerramos»**, y antes de pedirle un push: actualiza `docs/ESTADO.md` en la rama de trabajo, en su propio commit.
- Los `git push` y los comandos `gh` que escriben en GitHub (`pr create`, `pr merge`, `repo archive`, `api` con `-X`, `-f` o `-F`…) los lanza Kara: tú los preparas y se los das en bloques, diciendo en qué terminal. Leer sí: `git fetch`, `gh pr view`, `gh pr checks`, `gh api` con GET. **Es una instrucción, no una barrera.**

## Reglas

### Datos del restaurante
- Teléfono, precios, horario, dirección y demás datos del local: **solo** desde `src/data/restaurante.json`. No se escriben en ningún otro archivo.
- Platos: **solo** desde la hoja de Google de la carta. Hasta F1 su plantilla vive en `docs/carta/`.
- Cada dato lleva `valor`, `fuente`, `fechaConsulta`, `estado` y `confirmadoPor`.
- Un cambio de dato necesita confirmación del restaurante, con fecha y quién: `"estado": "CONFIRMADO"` y `"confirmadoPor": { "quien": "…", "fecha": "AAAA-MM-DD" }`.

### Fidelidad
- Platos y local reales. Ninguna IA que cree o cambie platos, local, personas o producto.
- La IA solo en fondos o transiciones, y declarada. Higgsfield u otras herramientas de IA, solo con encargo explícito.
- Nada de texto inventado: ni descripciones de platos ni reseñas.

### Material
- Al repositorio solo entra material procesado, sin GPS, sin audio y sin caras identificables.
- El material original vive fuera del repositorio (`~/proyectos/quitapesares-material`) y nunca entra en él.

### Identidad de los commits
- El repositorio es **público**: el nombre y el correo de cada commit quedan a la vista para siempre, y reescribir la historia no los borra (las PR conservan los commits viejos).
- Solo dos identidades: `Quitapesares Web <274641643+dlcdetailcenter@users.noreply.github.com>` (el noreply de la cuenta, pensado para ser público) y `Claude <noreply@anthropic.com>`. **Ningún correo personal.**
- Excepción, **solo como committer**: `GitHub <noreply@github.com>`. Es lo que firma GitHub en el commit de fusión de una PR; no es un correo personal y no se puede cambiar sin renunciar a fusionar por PR. Como autor no vale.
- En la cuenta de GitHub tiene que estar activado **Keep my email addresses private** ([github.com/settings/emails](https://github.com/settings/emails)). Si no, el commit de fusión que hace GitHub lleva el correo personal de quien fusiona, y ese commit el hook no lo ve: lo crea GitHub, no tu git.
- Se configura **solo en este repositorio**, nunca con `--global`:
  `git config user.name "Quitapesares Web"` · `git config user.email "274641643+dlcdetailcenter@users.noreply.github.com"`
- El hook de pre-commit `identidad` bloquea el commit si el autor o el committer son otro correo.

### Las barreras no se apagan
- **Nunca** `--no-verify` (ni `-n` en `git commit` o `git push`), `LEFTHOOK=0`, `core.hooksPath`, `lefthook uninstall` ni `git push --force`. El hook de Claude Code (`.claude/settings.json`) **deniega** esos comandos antes de ejecutarlos.
- Un hook que bloquea no es un obstáculo que rodear: es la barrera funcionando. Si bloquea por error, se dice y **lo decide Kara** (ella lo quita con `npx lefthook uninstall`).
- Para hacer commits hacen falta **gitleaks 8.30.1** y **exiftool 13.60**: sin ellos el commit se bloquea. Instalación con versión fijada y SHA-256 comprobada en [`docs/instalacion/herramientas.md`](docs/instalacion/herramientas.md).
- El hook de Claude Code revisa el comando entero, también entre comillas. Por eso un comando que solo *mencione* esas palabras también se deniega: para escribirlas, la herramienta Write o `git commit -F archivo`.

### Forma de trabajar
- Un cambio, un commit. Nada a producción sin aprobación de Kara.
- Skills solo de la organización oficial del fabricante, leídas antes, copiadas en el proyecto con su commit de origen (`.claude/skills/ORIGEN.md`) y solo para Claude Code.
- El presupuesto de rendimiento y accesibilidad lo vigila la CI y no se rebaja sin aprobación de Kara.

### Límites (del encargo de F0, siguen vigentes)
- Sintaxis que dependa de la versión (Astro 7, @astrojs/cloudflare 14, Wrangler 4): compruébala en la documentación oficial (MCP `astro-docs` y `cloudflare-docs`).
- Sin encargo explícito no se tocan: despliegues, la cuenta de Cloudflare, el dominio, la ficha de Google ni la carta actual de Google Sites.
- Nada global (`npm -g`, `npx skills add -g`, `winget`…) sin preguntar.
- En la CI: nunca `pull_request_target` ni secretos. Ningún secreto en el repositorio.
- Ni el plugin completo de Cloudflare ni su MCP de la API (dan permisos de escritura sobre la cuenta).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run build` | Compilación demo: compila y avisa de cuántos datos faltan por confirmar |
| `npm run build:produccion` | Compilación de producción: falla si algún dato no está CONFIRMADO |
| `npm run check` | `astro check` con TypeScript estricto |
| `npm test` | Playwright + axe sobre la portada (Chromium y WebKit, 360 y 390 px) |
| `npm run lhci` | Lighthouse CI con el presupuesto (compila antes con `npm run build`) |
| `npm run check:media` | Falla con archivos de más de 10 MB, originales versionados o imágenes y vídeos con GPS |
| `npm run test:datos` | Pruebas de la validación de datos y de la barrera de compilación |

## Barreras: qué vigila cada regla

Estado al 1-11-2026. En un repositorio **público**, lo que se sube a cualquier rama ya es visible aunque la CI falle. **La CI impide fusionar, no publicar.** Antes de publicar solo frenan los hooks de pre-commit y push protection de GitHub.

| Regla | Barrera real | Sin barrera (depende de revisión humana) |
|---|---|---|
| Datos confirmados | `astro build` en modo producción falla si hay datos sin CONFIRMADO | — |
| Datos solo en el JSON | — | Que un dato o un plato se copie en otro archivo |
| Estado público (`docs/ESTADO.md`) | — | Sin barrera: nada comprueba lo que dice ni que no se le cuelen datos personales, rutas locales o datos del restaurante. Claude lo revisa antes de cada push |
| Secretos | **pre-commit: gitleaks bloquea el commit**, y también si gitleaks no está instalado · push protection de GitHub · gitleaks 8.30.1 en la CI | Un secreto con formato que gitleaks no reconozca |
| Material | **pre-commit: `check:media --staged` bloquea el commit** por tamaño (>10 MB), originales versionados o GPS, y también si hay imágenes o vídeos preparados sin exiftool instalado · `check:media` en la CI, donde exiftool es obligatorio | Caras identificables y audio |
| Identidad de los commits | **pre-commit: `identidad` bloquea el commit** si el autor no es el noreply de la cuenta o `Claude <noreply@anthropic.com>`, o si el committer no es uno de esos dos ni `GitHub <noreply@github.com>` | El commit de fusión lo crea GitHub, no tu git: ahí el hook no llega y depende de que la cuenta tenga «Keep my email addresses private» activado |
| Apagar las barreras | **Hook de Claude Code** (`.claude/settings.json`, `PreToolUse` con `onFailure: "block"`): deniega `--no-verify`, `LEFTHOOK=0`, `core.hooksPath`, `lefthook uninstall` y `git push --force` | Vigila a Claude Code, no a una persona escribiendo en su terminal |
| Rendimiento y accesibilidad | Lighthouse CI y Playwright + axe en la CI | — |
| Historial de `main` | **Regla de repositorio «main protegida»: activa, sin excepciones** (`bypass_actors` vacío, así que tampoco para administradores). Comprobada con `gh api repos/dlcdetailcenter/quitapesares-web/rules/branches/main`: `pull_request` con fusión solo por *merge* (`allowed_merge_methods: ["merge"]`, sin aplastar), `required_status_checks` con los 7 trabajos de la CI, y `non_fast_forward`, `deletion` y `creation`: no se reescribe, no se borra y no se recrea la rama | — |
| Publicar (push y `gh`) | — | Sin barrera: depende de la instrucción de la sección «Estado y traspaso» y de que los push y los comandos `gh` que escriben en GitHub los lanza Kara |
| Producción | Sin credenciales de despliegue en el repositorio ni en la CI | — |

Los 7 trabajos de la CI: `build (ubuntu-latest)`, `build (windows-latest)`, `check`, `test`, `lighthouse`, `gitleaks`, `media`.
