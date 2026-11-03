# Estado del proyecto

Reglas de este archivo:
- Es **público**. Nada sobre la cuenta de GitHub ni sus ajustes.
- Ni datos personales, ni rutas locales, ni datos del restaurante (esos solo en `src/data/restaurante.json`).
- Ni la URL de la hoja de la carta ni la de la demo.
- Si contradice al repositorio o a GitHub, manda lo comprobado y se corrige este archivo.

| | |
|---|---|
| Actualizado | 2026-11-03 |
| `main` al escribirlo | `06312b0` |
| Fase | **F2** (recorrido con el scroll, demo privada, material provisional), en curso en `f2-recorrido` |

## Ramas y PR

- `main`: protegida por la regla de repositorio «main protegida», activa y sin excepciones. VERIFICADO
- `f0-base`, `f0-contexto` y `f1-carta`: fusionadas (PR #1, #5 y #6). VERIFICADO
- `f2-recorrido`: en curso. Se fusiona sin aplastar, después de la sesión de comprobación de Kara.

## F0: cerrada

Esqueleto de Astro 7 con `@astrojs/cloudflare`, datos del local etiquetados con barrera de compilación,
hooks de pre-commit, hook de Claude Code contra los comandos que apagan las barreras y CI con 7 trabajos
obligatorios. Ningún dato del restaurante está CONFIRMADO: `build:produccion` sigue fallando a propósito.
VERIFICADO

## F1: cerrada

Carta funcional (`/carta` y `/en/carta`) desde KV con la tarea programada, portada estática con la foto real de
la entrada, noindex, sin JavaScript en el navegador y demo en Cloudflare Workers. Fusionada en `main` con la
PR #6. VERIFICADO

Pendiente de F1, se comprueba en la sesión final de F2: VoiceOver lee la carta en orden; Llamar, Cómo llegar
y Dejar reseña abren lo correcto en un móvil real. NO VERIFICABLE AÚN desde el repositorio.

## F2: en curso

Recorrido que avanza con el scroll (aire → puerta → barra → comedor → secciones) como capa sobre la portada
de F1. El material real no entra en git durante la fase: en el repositorio solo hay un recorrido sintético
para las pruebas y la CI, y un manifiesto con las sumas SHA-256 del material real.

Hecho en `f2-recorrido`:
- Recorrido en español e inglés: barra «Ir a la carta», carga por tramos, ventana de fotogramas en memoria,
  versión estática (reducir movimiento, Save-Data, red lenta o primer tramo en más de 3 s) e interruptor al
  compilar (`RECORRIDO=apagado`). Probado con el material sintético en Chromium. VERIFICADO
- Prueba técnica en `/lab/scroll` (noindex, sin enlaces). Canvas p95 40 ms y vídeo p95 76 ms en Chromium con
  CPU 4x y 4G, con un tramo **sintético**. Se elige canvas. PARCIAL: falta el tramo real y WebKit.
- Pipeline del material (`npm run media:procesar`), ortofoto PNOA (`npm run media:ortofoto`), `media:check`
  y despliegue de la demo que lo ejecuta antes. El pipeline está probado con un clip sintético; la ortofoto y el
  despliegue, sin probar. PARCIAL
- `check:media` rechaza vídeos con audio y el material del recorrido versionado. VERIFICADO
- Lighthouse de la portada con el recorrido sintético: rendimiento 0,99, LCP 1,7 s, CLS 0, TBT 83 ms,
  JS 10 KB, 177 KB en total. VERIFICADO (con el real: NO VERIFICABLE AÚN)

## A medias

- Material real (puerta, barra y comedor), ortofoto y revisión fotograma a fotograma: no hechos. La sesión de
  F2 corrió en la nube, sin acceso a los clips, al servicio del IGN ni a Cloudflare.
- Nubes de IA: 3 generadas solo con texto (inventario), sin revisar y sin usar. Mientras tanto, el recorrido
  dibuja las nubes en canvas, sin IA.
- Demo con el recorrido: sin desplegar.
- Comprobaciones de Kara en móviles reales (F2 y lo pendiente de F1).

## Siguiente paso

Retomar F2 en un equipo con acceso a los clips: material real, prueba técnica con el tramo real, ortofoto,
despliegue de la demo y sesión de comprobación de Kara. Después, el último commit con el material real y la
fusión sin aplastar, con el OK de Kara.

## Cómo trabajamos

- Un cambio, un commit. Nada a producción sin aprobación de Kara.
- Antes de cada push, PR, fusión o despliegue, Claude Code lo resume en el chat en 3 líneas y espera el
  OK explícito de Kara (las reglas `ask` siguen sin verificar, A-06). En F2, Kara dio por adelantado su OK al
  push a `f2-recorrido`, a abrir la PR y a desplegar la demo privada; fusionar no está autorizado.
- `npm run test:datos` compila en `node_modules/.cache` y deja la configuración de despliegue apuntando allí:
  `npm run build` antes de `preview` o de desplegar.
