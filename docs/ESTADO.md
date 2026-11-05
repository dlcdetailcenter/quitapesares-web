# Estado del proyecto

Reglas de este archivo:
- Es **público**. Nada sobre la cuenta de GitHub ni sus ajustes.
- Ni datos personales, ni rutas locales, ni datos del restaurante (esos solo en `src/data/restaurante.json`).
- Ni la URL de la hoja de la carta ni la de la demo.
- Si contradice al repositorio o a GitHub, manda lo comprobado y se corrige este archivo.

| | |
|---|---|
| Actualizado | 2026-11-05 (demo final, ajuste tras la revisión de Kara: recorrido más corto y acciones integradas) |
| `main` al escribirlo | `06312b0` |
| Fase | **F2** (recorrido con el scroll, demo privada, material provisional), en curso en `f2-recorrido` y, para la demo final, en `f2-demo-final` |

## Ramas y PR

- `main`: protegida por la regla de repositorio «main protegida», activa y sin excepciones. VERIFICADO
- `f0-base`, `f0-contexto` y `f1-carta`: fusionadas (PR #1, #5 y #6). VERIFICADO
- `f2-recorrido`: en curso (PR #7). Se fusiona sin aplastar, después de la sesión de comprobación de Kara.
- `f2-demo-final`: demo final para el dueño, PR #8 en borrador con base `f2-recorrido`. Sin fusionar. VERIFICADO

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

## F2: demo final, en `f2-demo-final`

- Diseño nuevo de portada, recorrido y /carta: crema y burdeos, marcos, tarjetas con flecha, cabecera con Llamar, carta con
  pestañas y desplegables, y tres fuentes propias alojadas en el proyecto. Sin scroll horizontal a 360 y 390 px en
  Chromium y WebKit, con y sin «reducir movimiento». VERIFICADO
- Ajuste tras la revisión de Kara: recorrido de 4 pantallas de scroll (la pista mide 5 ventanas, con el escenario fijo) y
  portada entera de 5,83 ventanas a 390×844. Cada grupo de acciones queda fijo en su zona, 1 pantalla de scroll seguida
  como mínimo: Cómo llegar en el aire; menú, platos de hoy y Ver carta en la entrada; Llamar y horario de hoy en la barra y
  la cafetera; Dejar reseña e idioma en la salida. Debajo, solo horario y pie. Con «reducir movimiento», la portada
  estática con todas las acciones. VERIFICADO
- Platos de hoy: ruta de solo lectura. Si la hoja falla sale la última versión válida; si cae la ruta, solo «Ver carta».
  VERIFICADO
- Maqueta final (fuera de git): entrada con fotogramas reales de la puerta, mismas sumas, y efecto de empuje en el canvas;
  barra, cafetera y salida, creadas con IA, con etiqueta, créditos, `"ia": "local"` y `"origen": "creada"`. 113 archivos y
  3,06 MB de 8. Detalle en el inventario. Desplegada en la demo privada con noindex y `recorrido.json` igual al local.
  VERIFICADO; verla en móviles reales y la pregunta al dueño, «¿es tu local?», pendientes.
- Pruebas: `npm test` 324 de 324 con el sintético y 162 de 162 con la maqueta a 390 px; `test:datos` 61 de 61. VERIFICADO
- Lighthouse en local con la maqueta: portada rendimiento 0,98, accesibilidad 1,00, LCP 2,28 s, CLS 0, TBT 0 ms, 379 KB, JS
  13 KB; /carta 1,00 y 1,00, LCP 1,67 s, 130 KB. VERIFICADO
- Recorrido real, intervalo entre fotogramas al bajar, p95: WebKit 31 ms en local y en la demo; Chromium 17 ms. `lab:medir`,
  canvas p95: Chromium 35 ms; **WebKit 68 ms en local y en la demo, por encima de los 50 ms**, en una página de prueba que no
  usa estas piezas y que ya oscilaba entre 46 y 78 ms. VERIFICADO; móviles reales, NO VERIFICABLE AÚN.

## A medias

- Sesión de comprobación de Kara con los móviles, preparada: visto bueno de la puerta, la barra, la ortofoto y cada
  nube de IA; las imágenes de la maqueta en el móvil; paradas; el tramo aéreo termina sobre el local; p95 en móviles reales; y lo
  pendiente de F1 (VoiceOver y los botones).
- Probar las paradas con el material real.
- **Retirar la maqueta después de la demo al dueño.**
- Decidir con Kara qué del diseño de `f2-demo-final` pasa a `f2-recorrido`.
- Las coordenadas de la ortofoto son las de `src/data/restaurante.json`, sin confirmar: si cambian, se regenera.

## Siguiente paso

Sesión de comprobación de Kara con la demo final y demo al dueño. Después: retirar la maqueta y, con el visto bueno de Kara, el último
commit con el material real (se quita la regla de `check:media` que hoy lo bloquea, decisión de Kara) y la fusión
sin aplastar, con su OK.

## Cómo trabajamos

- Un cambio, un commit. Nada a producción sin aprobación de Kara.
- Antes de cada push, PR, fusión o despliegue, Claude Code lo resume en el chat en 3 líneas y espera el
  OK explícito de Kara (las reglas `ask` siguen sin verificar, A-06). En F2, Kara dio por adelantado su OK al
  push a `f2-recorrido`, a abrir la PR y a desplegar la demo privada; fusionar no está autorizado.
- `npm run test:datos` compila en `node_modules/.cache` y deja la configuración de despliegue apuntando allí:
  `npm run build` antes de `preview` o de desplegar.
