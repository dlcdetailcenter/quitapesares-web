# CLAUDE.md · web del Restaurante Quitapesares

Instrucciones para Claude Code en este repositorio. **Son instrucciones, no garantías**: lo que de verdad impide errores son las barreras de la tabla final (compilación, CI, hooks y ajustes de GitHub).

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

## Qué vigila cada regla

| Regla | Barrera real | Sin barrera (depende de revisión humana) |
|---|---|---|
| Datos confirmados | `astro build` en modo producción falla si hay datos sin CONFIRMADO | — |
| Datos solo en el JSON | — | Que un dato o un plato se copie en otro archivo |
| Secretos | Push protection de GitHub; gitleaks en la CI y en pre-commit (si gitleaks está instalado) | — |
| Material | `check:media` en la CI y en pre-commit: tamaño, originales y GPS (GPS en local solo con exiftool) | Caras identificables y audio |
| Fidelidad e IA | — | Todo |
| Rendimiento y accesibilidad | Lighthouse CI y Playwright + axe en la CI | — |
| Producción | Sin credenciales de despliegue en el repositorio ni en la CI; `main` protegida con PR y CI obligatorias | — |

Ojo: en un repositorio público, lo que se sube a cualquier rama ya es visible aunque la CI falle. La CI impide fusionar, no publicar. Antes de publicar solo frenan push protection y los hooks locales.
