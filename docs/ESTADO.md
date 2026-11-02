# Estado del proyecto

Reglas de este archivo:
- Es **público**. Nada sobre la cuenta de GitHub ni sus ajustes.
- Ni datos personales, ni rutas locales, ni datos del restaurante (esos solo en `src/data/restaurante.json`).
- Si contradice al repositorio o a GitHub, manda lo comprobado y se corrige este archivo.

| | |
|---|---|
| Actualizado | 2026-11-02 |
| `main` al escribirlo | `c61031b` |
| Fase | **F0** (base y barreras), cerrándose |

## Ramas y PR

- `main`: protegida por la regla de repositorio «main protegida», activa y sin excepciones. VERIFICADO
- `f0-base`: fusionada en la PR #1, sin commits por delante de `main`. VERIFICADO
- `f0-contexto`: rama que añadió este archivo; si ya no aparece como PR abierta, está fusionada.
- Ninguna otra PR abierta. VERIFICADO

## Hecho en F0

- Esqueleto de Astro 7 con `@astrojs/cloudflare` y portada marcador. VERIFICADO
- Datos del local etiquetados (`valor`, `fuente`, `fechaConsulta`, `estado`, `confirmadoPor`) y barrera de
  compilación: `build:produccion` falla si algo no está CONFIRMADO. VERIFICADO
- Ningún campo de datos está CONFIRMADO: los 8 siguen en `NO VERIFICABLE AÚN`. VERIFICADO
- Plantilla y guía de la hoja de la carta en `docs/carta/`. VERIFICADO
- Hooks de pre-commit con lefthook: `identidad`, `gitleaks`, `check:media --staged`. VERIFICADO
- Hook de Claude Code que deniega los comandos que apagan las barreras. VERIFICADO
- CI con 7 trabajos obligatorios para fusionar. VERIFICADO
- Skill `workers-best-practices` copiada de la organización oficial de Cloudflare con su commit de
  origen en `.claude/skills/ORIGEN.md`. VERIFICADO
- MCP del proyecto `astro-docs` y `cloudflare-docs`, conectados. VERIFICADO
- Despliegue: sin credenciales en el repositorio ni en la CI; nada publicado todavía. VERIFICADO

## A medias

- Revisión del cierre de F0 (Kara). PARCIAL
- Prueba de la hoja de Google de la carta (criterio 7 de F0): pendiente de Kara.
  NO VERIFICABLE AÚN desde el repositorio.

## Siguiente paso

Revisión del cierre de F0 por Kara. Después, F1: carta funcional leída de la hoja de Google y portada
estática, como demo privada con datos provisionales (los datos confirmados por el restaurante son de F3).

## Cómo trabajamos

- Un cambio, un commit. Nada a producción sin aprobación de Kara.
- Los push, las PR y las fusiones los ejecuta Claude Code con el OK explícito de Kara en el chat (las reglas `ask` están sin verificar).
