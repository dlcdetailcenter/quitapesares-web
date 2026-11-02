# Estado del proyecto

Reglas de este archivo:
- Es **público**. Nada sobre la cuenta de GitHub ni sus ajustes.
- Ni datos personales, ni rutas locales, ni datos del restaurante (esos solo en `src/data/restaurante.json`).
- Ni la URL de la hoja de la carta ni la de la demo.
- Si contradice al repositorio o a GitHub, manda lo comprobado y se corrige este archivo.

| | |
|---|---|
| Actualizado | 2026-11-02 |
| `main` al escribirlo | `eebd1d3` |
| Fase | **F1** (carta funcional y portada estática, demo privada), en curso |

## Ramas y PR

- `main`: protegida por la regla de repositorio «main protegida», activa y sin excepciones. VERIFICADO
- `f0-base` y `f0-contexto`: fusionadas (PR #1 y PR #5). VERIFICADO
- `f1-carta`: rama de F1, creada desde `main` (`eebd1d3`). Una sola PR a `main`, fusionada sin aplastar.

## F0: cerrada

Esqueleto de Astro 7 con `@astrojs/cloudflare`, datos del local etiquetados con barrera de compilación,
hooks de pre-commit (`identidad`, `gitleaks`, `check:media --staged`), hook de Claude Code contra los
comandos que apagan las barreras, CI con 7 trabajos obligatorios y skill `workers-best-practices`.
Ningún dato del restaurante está CONFIRMADO: `build:produccion` sigue fallando a propósito. VERIFICADO

## F1: en curso

Decidido en el plan aprobado por Kara (2-11-2026):
- La carta se lee de la hoja de Google por el endpoint gviz. Medido: un cambio de «disponible» aparece en
  gviz en menos de 6 s (3 mediciones). VERIFICADO
- Caché: KV + tarea programada cada minuto; se escribe en KV solo si algo cambió.
- La URL de la hoja va como secreto del Worker, nunca en el repositorio.
- Rutas: `/` y `/carta` en español, `/en/` y `/en/carta` en inglés. Todo con noindex.
- Skills de diseño: solo `frontend-design` (Anthropic). Impeccable no cumple las condiciones y no se usa.

## A medias

- Implementación de F1 en `f1-carta`. PARCIAL
- Nombres en inglés de los platos (columna `nombre_en` de la hoja): pendientes de Kara.

## Siguiente paso

Implementar F1 en `f1-carta`, un commit por cambio; desplegar la demo con el OK de Kara y medir en ella
que un agotado aparece en 5 minutos o menos.

## Cómo trabajamos

- Un cambio, un commit. Nada a producción sin aprobación de Kara.
- Antes de cada push, PR, fusión o despliegue, Claude Code lo resume en el chat en 3 líneas y espera el
  OK explícito de Kara (las reglas `ask` siguen sin verificar, A-06).
