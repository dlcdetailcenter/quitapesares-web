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
| Fase | **F1** (carta funcional y portada estática, demo privada), terminada en `f1-carta`, pendiente de fusionar |

## Ramas y PR

- `main`: protegida por la regla de repositorio «main protegida», activa y sin excepciones. VERIFICADO
- `f0-base` y `f0-contexto`: fusionadas (PR #1 y PR #5). VERIFICADO
- `f1-carta`: PR #6 a `main`, con la CI 7/7 en verde. Se fusiona sin aplastar, con el OK de Kara.

## F0: cerrada

Esqueleto de Astro 7 con `@astrojs/cloudflare`, datos del local etiquetados con barrera de compilación,
hooks de pre-commit, hook de Claude Code contra los comandos que apagan las barreras y CI con 7 trabajos
obligatorios. Ningún dato del restaurante está CONFIRMADO: `build:produccion` sigue fallando a propósito.
VERIFICADO

## F1: hecho

- **Carta** (`/carta` y `/en/carta`), renderizada en el Worker desde KV. Una tarea programada cada minuto lee
  la hoja de Google por gviz, valida cada fila y escribe en KV solo si algo cambió. Una fila rota se descarta y
  queda en los logs; si la hoja cae se sirve la última versión válida; sin ninguna, «Llámanos». VERIFICADO
- **Agotado en la demo**: 3 mediciones con retrasos de 10 a 80 s (criterio: 5 min o menos). VERIFICADO
- **Portada** (`/` y `/en/`), estática: foto real de la entrada (inventario en `docs/inventario-material.md`),
  menús con sus precios, horario y botones Llamar, Ver carta, Cómo llegar y Dejar reseña. VERIFICADO
- noindex en meta y en cabecera; sin JavaScript en el navegador, sin analítica, fuentes propias y ninguna
  petición a terceros. VERIFICADO
- Demo desplegada en Cloudflare Workers (plan gratuito), sin credenciales en el repositorio ni en la CI. La URL
  de la hoja es un secreto del Worker. VERIFICADO
- Nombres en inglés de los 23 platos en la hoja: `/en/carta` los muestra. VERIFICADO
- Pruebas: datos (lectura de la hoja, tarea programada, textos en los dos idiomas, ningún dato del local fuera
  del JSON), Playwright en Chromium y WebKit a 360 y 390 px, y Lighthouse también sobre `/carta`. VERIFICADO
- Skill `frontend-design` (Anthropic) con su commit de origen. Impeccable no se instala.

## A medias

- Comprobaciones de Kara en un móvil real: VoiceOver lee la carta en orden; Llamar, Cómo llegar y Dejar reseña
  abren lo correcto. NO VERIFICABLE AÚN desde el repositorio.
- Fusión de la PR #6.

## Siguiente paso

Fusionar la PR #6 con el OK de Kara. Después, la siguiente fase según el BRIEF (los datos confirmados por el
restaurante son de F3).

## Cómo trabajamos

- Un cambio, un commit. Nada a producción sin aprobación de Kara.
- Antes de cada push, PR, fusión o despliegue, Claude Code lo resume en el chat en 3 líneas y espera el
  OK explícito de Kara (las reglas `ask` siguen sin verificar, A-06).
- `npm run test:datos` compila en `node_modules/.cache` y deja la configuración de despliegue apuntando allí:
  `npm run build` antes de `preview` o de desplegar.
