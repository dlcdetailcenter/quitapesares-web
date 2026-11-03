# CLAUDE.md · web del Restaurante Quitapesares

Instrucciones para Claude Code en este repositorio. **Son instrucciones, no garantías**: lo que de verdad impide errores son las barreras de la tabla final (compilación, CI, hooks y ajustes de GitHub).

## Estado y traspaso

@docs/ESTADO.md

Esa línea importa el estado del proyecto y lo carga junto con este CLAUDE.md al empezar la sesión. Va **sin comillas invertidas**: entre comillas invertidas el archivo no se importa, solo se menciona.

- **Al empezar sesión**: di en 3 líneas la fase, lo que está a medias y el siguiente paso. Si `docs/ESTADO.md` contradice al repositorio o a GitHub, avísalo: manda lo comprobado y se corrige el archivo.
- **Cuando Kara diga «cerramos»**, y antes de pedirle un push: actualiza `docs/ESTADO.md` en la rama de trabajo, en su propio commit.
- **Publicar**: antes de cada push, PR, fusión o despliegue (`git push`, `gh pr create`, `gh pr merge`, `gh repo`, `gh api`, `wrangler deploy`, `wrangler secret`, `wrangler kv` con escritura…), Claude Code dice en el chat, en 3 líneas como máximo, qué se publica (rama o worker, commits y destino) y **espera el OK explícito de Kara**. Sin OK no se lanza ni se busca otra forma de lanzarlo.
- Las reglas `ask` de `.claude/settings.json` se quedan como están, **SIN VERIFICAR** (A-06): no son la barrera; la barrera es el OK de Kara en el chat.
- Leer no necesita OK: `git fetch`, `git ls-remote`, `gh pr view`, `gh pr checks`. Los commits locales tampoco: los vigilan los hooks de pre-commit y no publican nada.

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
- **Excepción, solo para la maqueta de la demo privada al dueño** (decisión de Kara del 2026-11-03): Higgsfield puede animar fotos fijas reales del local (imagen a vídeo). Sustituye, solo en la maqueta, a «la IA no lo genera, no lo recrea»; el resto de Fidelidad y de la privacidad del material sigue igual.
  - **Entrada**: solo fotos fijas reales sin caras, matrículas, pantallas de la barra ni la lista de especialidades legible; en SDR y sin metadatos ni GPS. Nunca vídeos enteros ni nada de IMG_4592. Subir a Higgsfield es irreversible (sus términos le permiten entrenar con lo subido): antes, OK de Kara en el chat con la lista exacta de fotos y sus hojas de contacto.
  - **Salida**: solo movimiento de cámara sobre la escena de la foto (acercamiento lento, paralaje, giro leve), de 5 s como mucho; sin personas, objetos nuevos ni texto inventado; el rótulo real, si sale, legible e igual; sin cambiar la luz, los colores ni la distribución del local. Etiqueta visible mientras se ve cada pieza («Simulación con IA a partir de una foto real del local» / «AI simulation based on a real photo of the venue») y en los créditos.
  - **Barreras**: la maqueta es una variante aparte (`RECORRIDO_VARIANTE=maqueta`, carpeta `recorrido-maqueta/`, ignorada por git y bloqueada por `check:media`); la variante por defecto sigue siendo la real. `build:produccion` falla con la variante maqueta o con cualquier pieza `"ia": "local"` en `recorrido.json`, aunque todos los datos estuvieran confirmados (prueba en `test:datos`). `demo:desplegar` solo la despliega con `--maqueta` explícito. Producción nunca lleva maqueta, y se retira después de la demo al dueño.

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
- **Skills**:
  - Cuando una tarea se atasque (2 intentos fallidos con el mismo problema) o haya una necesidad que no cubre ninguna herramienta aprobada, Claude Code puede buscar con `/find-skills` o proponer una skill propia del proyecto con `skill-creator`.
  - Buscar no necesita OK. Instalar o crear, sí: en el chat, en 3 líneas, qué problema resuelve, de dónde sale (repositorio y commit) y si tiene scripts o llamadas a red.
  - Toda skill de terceros se lee entera antes, se copia en `.claude/skills/` con su commit de origen en `.claude/skills/ORIGEN.md` y es solo para Claude Code. Nunca global. Con scripts que se ejecutan, descargas o llamadas a red, no se instala sin aprobación expresa de Kara.
  - Las skills propias van en `.claude/skills/` en su propio commit, dentro de la PR, para que se revisen con el resto.
  - Excepción decidida por Kara (2-11-2026): Impeccable podía entrar aunque no es de un fabricante, solo si venía de `github.com/pbakaus/impeccable` y sin scripts, descargas ni llamadas a red. No cumple (su lanzador descarga un binario y trae scripts con llamadas a red): no se copia ni se usa.
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

Estado al 2-11-2026. En un repositorio **público**, lo que se sube a cualquier rama ya es visible aunque la CI falle. **La CI impide fusionar, no publicar.** Antes de publicar frenan los hooks de pre-commit, push protection de GitHub y el OK explícito de Kara en el chat.

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
| Publicar (push, `gh`, despliegues) | — | Sin barrera técnica comprobada: depende de la instrucción de «Estado y traspaso» (3 líneas en el chat y OK explícito de Kara). Las reglas `ask` de `.claude/settings.json` siguen configuradas pero **SIN VERIFICAR** (A-06): en la prueba del 2-11 un `git push --dry-run` se ejecutó sin aviso. Tampoco cubrirían otras formas de invocar el programa (`sh -c`, scripts, rutas absolutas) ni lo que haga una persona en su terminal |
| Producción | Sin credenciales de despliegue en el repositorio ni en la CI | — |

Los 7 trabajos de la CI: `build (ubuntu-latest)`, `build (windows-latest)`, `check`, `test`, `lighthouse`, `gitleaks`, `media`.
