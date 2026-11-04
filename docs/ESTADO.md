# Estado del proyecto

Reglas de este archivo:
- Es **público**. Nada sobre la cuenta de GitHub ni sus ajustes.
- Ni datos personales, ni rutas locales, ni datos del restaurante (esos solo en `src/data/restaurante.json`).
- Ni la URL de la hoja de la carta ni la de la demo.
- Si contradice al repositorio o a GitHub, manda lo comprobado y se corrige este archivo.

| | |
|---|---|
| Actualizado | 2026-11-04 (maqueta 2: imágenes creadas con IA para la demo al dueño) |
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

Recorrido que avanza con el scroll (aire → puerta → barra → secciones; el comedor se quitó) como capa sobre la
portada de F1. El material real no entra en git durante la fase: en el repositorio solo hay un recorrido sintético
para las pruebas y la CI, y un manifiesto con las sumas SHA-256 del material real.

Hecho en `f2-recorrido`:
- Recorrido en español e inglés: barra «Ir a la carta», carga por tramos, ventana de fotogramas en memoria,
  versión estática (reducir movimiento, Save-Data, red lenta o primer tramo en más de 3 s) e interruptor al
  compilar (`RECORRIDO=apagado`). Probado con el material sintético en Chromium. VERIFICADO
- Prueba técnica en `/lab/scroll` (noindex, sin enlaces) con 3 s reales de IMG_4595, a 540×960 → canvas.
  Chromium con CPU 4x y 4G: canvas p95 36 ms, vídeo p95 72 ms. WebKit (sin limitar la CPU): canvas p95 47 ms; el
  vídeo no se puede medir (el WebKit de Playwright en Windows no lo decodifica). VERIFICADO; móviles reales, NO
  VERIFICABLE AÚN.
- Material real (fuera de git, sumas en el manifiesto, 119 archivos, 4,34 MB de 8): puerta (IMG_4595) y barra
  (IMG_4593, sin pantallas), regeneradas el 3-11 y sin reprocesar después; ortofoto PNOA de 2023 en el tramo
  aéreo con su atribución visible; 3 nubes de IA (Higgsfield, solo texto) aceptadas tras ajustarlas y revisarlas,
  declaradas en los créditos (es/en). Comedor quitado: caras en todos los fotogramas de IMG_4592 (para F4).
  VERIFICADO; visto bueno de Kara, pendiente.
- Lighthouse en local con el material real: rendimiento 1,00, LCP 1,67 s, CLS 0, TBT 0 ms, 302 KB antes del
  recorrido, JS 4,7 KB (transferido). VERIFICADO
- Pipeline del material, ortofoto (`npm run media:ortofoto`), `media:check` y despliegue de la demo
  (`npm run demo:desplegar`), probados con el material real. VERIFICADO
- Demo privada desplegada con el recorrido real: noindex comprobado y `recorrido.json` igual al del manifiesto.
  VERIFICADO
- `check:media` rechaza vídeos con audio y el material del recorrido versionado. VERIFICADO
- Rótulo del aire con el nombre completo y paradas con acción al final de la puerta y de la barra, en español e
  inglés y con las mismas acciones si se reduce el movimiento. Tramos de 1 pantalla como mucho, paradas de 0,5 y 5
  pantallas de total como mucho. Pruebas en verde con el sintético y contra la demo con la maqueta (Chromium y WebKit
  a 390 px). VERIFICADO; con el material real, sin probar desde que existen las paradas, NO VERIFICADO.
- Maqueta 2 para la demo al dueño (variante aparte, `RECORRIDO_VARIANTE=maqueta`, fuera de git): 6 imágenes creadas con
  IA a partir de fotogramas reales de IMG_4593, 4594 y 4595, con el OK del dueño que comunicó Kara (excepción ampliada
  en `CLAUDE.md`). Usadas fijas con recorte progresivo, 5,89 MB de 8 y 5 pantallas; todas con `"ia": "local"`, etiqueta
  visible y créditos. 16 intentos, cada uno con su motivo en el inventario. Desplegada en la demo privada con noindex y
  `recorrido.json` igual al del manifiesto. VERIFICADO; visto bueno de Kara, imagen a imagen, dado el 2026-11-04.
  Pregunta al dueño, «¿es tu local?», pendiente.
- `build:produccion` falla con la variante maqueta y con cualquier pieza `"ia": "local"` o `"origen": "creada"`, también
  con la variante real; una pieza creada sin `"ia": "local"` hace fallar el ensamblado; `check:media` bloquea
  `recorrido-maqueta/`. VERIFICADO
- Fotogramas decodificados: lo que llega después de soltar un tramo ya se cierra. Con tramos cortos, WebKit llegaba a 30
  vivos frente a un límite de 22. VERIFICADO con la maqueta en local.
- Pruebas con la maqueta 2 en local: 138 de 138 en Chromium y WebKit a 390 px. VERIFICADO. Con el material real, sin
  probar desde que existen las paradas, NO VERIFICADO.
- Lighthouse en local con la maqueta 2: portada dentro del presupuesto (rendimiento 0,99, LCP 1,97 s, CLS 0, TBT 0 ms,
  363 KB). VERIFICADO
- `lab:medir`, mismo comando en local y en la demo: Chromium con CPU 4x, canvas p95 34,5 y 35,8 ms. **WebKit, canvas p95
  50 ms en local, justo en el límite, y 78 ms en la demo, por encima.** Con el mismo código, la diferencia es de servir
  por red; sin arreglar, se decide con el iPhone real. VERIFICADO; móviles reales, NO VERIFICABLE AÚN.

## A medias

- Sesión de comprobación de Kara con los móviles, preparada: visto bueno de la puerta, la barra, la ortofoto y cada
  nube de IA; las imágenes de la maqueta en el móvil; paradas; el tramo aéreo termina sobre el local; p95 en móviles reales; y lo
  pendiente de F1 (VoiceOver y los botones).
- Probar las paradas con el material real.
- **Retirar la maqueta después de la demo al dueño.**
- Las coordenadas de la ortofoto son las de `src/data/restaurante.json`, sin confirmar: si cambian, se regenera.

## Siguiente paso

Sesión de comprobación de Kara y demo al dueño. Después: retirar la maqueta y, con el visto bueno de Kara, el último
commit con el material real (se quita la regla de `check:media` que hoy lo bloquea, decisión de Kara) y la fusión
sin aplastar, con su OK.

## Cómo trabajamos

- Un cambio, un commit. Nada a producción sin aprobación de Kara.
- Antes de cada push, PR, fusión o despliegue, Claude Code lo resume en el chat en 3 líneas y espera el
  OK explícito de Kara (las reglas `ask` siguen sin verificar, A-06). En F2, Kara dio por adelantado su OK al
  push a `f2-recorrido`, a abrir la PR y a desplegar la demo privada; fusionar no está autorizado.
- `npm run test:datos` compila en `node_modules/.cache` y deja la configuración de despliegue apuntando allí:
  `npm run build` antes de `preview` o de desplegar.
