# Inventario de material

Todo lo que entra al repositorio es material **procesado**: real, sin GPS ni metadatos, sin audio y sin caras
ni matrículas legibles. Los originales viven fuera del repositorio y nunca entran en él.

| Archivo | Origen | Fecha del original | Real o IA | Proceso | Comprobaciones | Uso |
|---|---|---|---|---|---|---|
| `src/assets/portada/entrada.jpg` | Fotograma del clip IMG_4595 (iPhone 16), en el segundo 3,00 | 2026-10-28 | **Real**, sin IA | Fotograma extraído a 1080×1920 con Chrome (decodificación HEVC); recorte 1080×1440 (desde y = 40); JPEG calidad 86 con sharp, que no copia metadatos | Sin GPS ni metadatos EXIF, XMP o IPTC (exiftool 13.60 y `check:media`); sin caras ni matrículas: revisado por Claude y aprobado por Kara el 2026-11-02 al aprobar el plan de F1 | Portada (`/` y `/en/`), en AVIF y WebP generados en la compilación |

Descartados para la portada (F1):
- IMG_4595, segundo 1,1: se lee la placa de «Especialidades», con platos que no están en la hoja de la carta.
- IMG_4595, desde el segundo 4,5: salen personas.
- IMG_4593: el plano principal son pantallas con fotos de comida de origen sin confirmar.

## F2: recorrido con el scroll

Estado al 2026-11-03 (cierre de F2 desde el PC de Kara). El material del recorrido **no entra en git** durante la
fase (se sirve desde `public/recorrido/`, ignorada); aquí se inventaría igual. Sumas SHA-256 del material real:
`scripts/media/manifiesto-real.json` (119 archivos, 4,34 MB de 8). Proceso de cada tramo: `scripts/media/tramos.json`.

Material regenerado el 2026-11-03: la puerta (53 fotogramas) y la barra (58) se regeneraron ese día desde los
originales con `tramos.json` sin cambios. Al cerrar F2 se copiaron tal cual a la carpeta de material
(`f2/05-export/canvas/`) y **no se volvieron a procesar**: otra máquina daría otros bytes y anularía la revisión
fotograma a fotograma. Sus 111 sumas son las del manifiesto de `d4d3229`, sin cambios.

| Pieza | Origen | Real o IA | Licencia | Dónde se declara la IA | Estado |
|---|---|---|---|---|---|
| Recorrido de prueba (`public/recorrido/`, generado al compilar) | `scripts/media/preparar.mjs`: PNG de colores lisos | Sintético, sin IA | Propio | — | Solo para pruebas y CI; los créditos del recorrido dicen que es de prueba |
| Nubes dibujadas y cielo | `src/recorrido/aire.ts`: degradados en canvas | Código, sin IA | Propio | — | Alternativa sin IA: solo se usa si el material no trae nubes aceptadas (el cielo, si no trae ortofoto). Con el material real de hoy no se usa |
| Tramo aéreo | Ortofoto PNOA máxima actualidad del IGN por WMTS (`npm run media:ortofoto -- --anio 2023`), capa `OI.OrthoimageCoverage`, zooms 15 a 18, 540×960, WebP 70: `aire/nivel-0…3.webp`, 0,38 MB | Real (ortofoto), sin IA | CC-BY 4.0 scne.es: «Obra derivada de PNOA 2023 CC-BY 4.0 scne.es», visible al pie del tramo con enlace a scne.es (es/en) | — | En uso. **Año 2023**: vuelo de julio de 2023, 25 cm, según los metadatos del servicio (WMS `pnoa-ma`, capa `OI.MosaicElement`, `GetFeatureInfo` en el centro y en las cuatro esquinas del nivel más lejano: todo «2023-07»). Centrada en las coordenadas de `src/data/restaurante.json` tal como están, **sin confirmar**: si cambian, se regenera. Termina sobre la nave del local. Revisada por Claude: polígono industrial, sin matrículas ni personas distinguibles a 25 cm |
| Puerta | IMG_4595 (iPhone 16, HEVC 10 bits HLG, 1080×1920, 30 fps), fotogramas 40–126 | **Real**, sin IA | Propio del restaurante | — | En la demo local: HDR → SDR (hable), sin audio ni metadatos, estabilizado, mismo ajuste de color, ruido y nitidez suaves, barrido final con fotogramas reales (tmix), 540×960, 20 fps, WebP 60: 53 fotogramas, 2,0 MB. Sin la placa de especialidades (0–43) ni personas (desde el 134): revisado fotograma a fotograma por Claude. Falta el visto bueno de Kara |
| Barra | IMG_4593 (ídem), entero, recorte fijo de la mitad inferior | **Real**, sin IA | Propio del restaurante | — | En la demo local: mismo proceso, recorte 540×960 desde x=420, y=930, 15 fps, WebP 60: 58 fotogramas, 1,9 MB. Las pantallas (hasta la fila 920) y el cartel de la derecha no entran: revisado fotograma a fotograma. Nivel visual medio (mucha encimera). Falta el visto bueno de Kara |
| Comedor | IMG_4592 | Real | Propio del restaurante | — | **Quitado**: caras reconocibles en todos los fotogramas. Para F4: grabar el comedor vacío |
| Nubes, capa lejana (`nubes/nubes-1.webp`) | Higgsfield, trabajo `996fb547-5def-4626-b094-68547776cd30`, modelo pedido `nano_banana_pro` (el trabajo figura como `nano_banana_2`), 9:16, 1536×2752, solo texto | **IA** | Términos de Higgsfield | Créditos del recorrido: «Generado con IA: nubes (Higgsfield)» / «AI-generated: clouds (Higgsfield)», y esta tabla | **Aceptada**, en uso. Ajustes (sharp): escala de grises y negros recortados al 9 % (el original tenía fondo azul marino), 540×960, WebP 92, sin metadatos: 24 KB |
| Nubes, capa media (`nubes/nubes-2.webp`) | Higgsfield, trabajo `4605e657-e426-4a3e-b111-f19b85f1cee9`, ídem | **IA** | Ídem | Ídem | **Aceptada solo recortada**, en uso. Arriba el original tenía horizonte y cielo: se usa solo la parte de abajo (recorte 928×1650 desde x = 304, y = 1102) y en escala de grises (como las otras dos, para no teñir la ortofoto), 540×960, WebP 92: 33 KB. Revisada a tamaño completo: ni horizonte, ni suelo, ni nada que parezca terreno |
| Nubes, capa cercana (`nubes/nubes-3.webp`) | Higgsfield, trabajo `1eab2ccd-1e00-4695-8c6e-ba8713ef8029`, ídem | **IA** | Ídem | Ídem | **Aceptada**, en uso. Escala de grises y negros recortados al 3 %, 540×960, WebP 92: 21 KB |

Las tres nubes, revisadas el 2026-11-03: el original, por Claude en la sesión en la nube; el resultado, a tamaño
completo, por Claude Code en el PC de Kara. Solo nubes sobre negro (se mezclan en modo «screen»): ni edificios, ni
personas, ni comida, ni logos, ni texto. Las tres juntas pesan 78 KB (límite 0,6 MB). **Falta el visto bueno de
Kara.** Por su encargo del 2026-11-03 ya se usan en la demo privada para que pueda juzgarlas en el móvil; sin su
visto bueno no pasan a la fusión. Las sumas están en el manifiesto y en `f2/ia/aceptadas.json` de la carpeta de
material.

Descartados en F2:
- IMG_4594: la placa de especialidades, legible en todos los fotogramas.
- Una grabación de pantalla de Google Maps en 3D: prohibida (nada de Google en ningún paso). No se usa ni como referencia.

Prompts de las nubes (sin imágenes de entrada, nada real subido a Higgsfield):
1. «Photographic layer of thin wispy high-altitude clouds seen from an airplane window looking down, scattered soft white and pale grey wisps, isolated on a solid pure black background (#000000). Only clouds and black: no ground, no landscape, no sea, no buildings, no people, no animals, no aircraft, no sun, no text, no logos, no watermark. Soft neutral daylight, fine natural detail, vertical composition with the wisps spread over the whole frame and plenty of black between them.»
2. «Photographic layer of medium-density fluffy cumulus clouds seen from above, separate soft white puffs with gentle grey shading, isolated on a solid pure black background (#000000). Only clouds and black: no ground, no landscape, no sea, no buildings, no people, no animals, no aircraft, no sun, no text, no logos, no watermark. Soft neutral daylight, realistic volumetric detail, vertical composition, clouds distributed across the frame with black gaps.»
3. «Photographic close-up of large soft dense white cloud banks drifting past the camera, thick billowing volumes filling most of the frame with ragged edges, isolated on a solid pure black background (#000000) visible at the edges. Only clouds and black: no ground, no landscape, no buildings, no people, no animals, no aircraft, no sun, no text, no logos, no watermark. Soft neutral daylight, realistic volumetric detail, vertical composition.»

Una pieza de IA solo se usa si no muestra edificios, personas, comida, logos ni texto, no tiene artefactos a
tamaño de móvil, casa con el color de los tramos reales, cabe en 0,6 MB y tiene el visto bueno de Kara.

## F2: maqueta de la demo al dueño

Estado al 2026-11-04. Excepción a Fidelidad, solo para la demo privada (`CLAUDE.md`). **Producción nunca lleva
maqueta y se retira después de la demo al dueño.** `recorrido-maqueta/` no entra en git (178 archivos, 6,37 MB de 8);
sumas en `scripts/media/manifiesto-maqueta.json`, proceso en `scripts/media/tramos-maqueta.json`. El aire y las nubes
son los del material real, con las mismas sumas. Longitud: aire 1 + 4 piezas de 0,75 + 2 paradas de 0,5 = 5 pantallas.

Fotos de entrada: fotogramas fijos sin caras, matrículas, pantallas ni la lista de especialidades, en SDR y sin
metadatos ni GPS (`procesar.mjs foto <id>`, lista en `tramos.json` → `fotos`). Solo estas 4 se subieron a Higgsfield,
con el OK de Kara del 2026-11-03 y las sumas comprobadas antes de subir. IMG_4594 descartada (placa de especialidades).

| Pieza | Foto de entrada | SHA-256 de la foto | Resultado | Real o IA | Dónde se declara la IA | Estado |
|---|---|---|---|---|---|---|
| `fachada` | IMG_4595, segundo 1,6 | `8f5206ed…` | Kling 4.0, intento 1 de 1: 50 fotogramas a 10 fps | **IA** (`"ia": "local"`) | Etiqueta visible mientras se ve y en su parada: «Simulación con IA a partir de una foto real del local» / «AI simulation based on a real photo of the venue»; créditos del recorrido (es/en); esta tabla | Aceptada por Claude. Falta el visto bueno de Kara |
| `escalera` | IMG_4595, segundo 3,0 | `5fb722cb…` | 3 intentos rechazados: 40 fotogramas a 8 fps, recortes de la propia foto (acercamiento lento) | **Real**, sin IA | — | En uso sin IA. Falta el visto bueno de Kara |
| `ventana` | IMG_4595, segundo 3,9 | `f1eb019e…` | 2 intentos rechazados: ídem | **Real**, sin IA | — | En uso sin IA. Falta el visto bueno de Kara |
| `cafetera` | IMG_4593, segundo 1,0 | `d940cc3d…` | 3 intentos rechazados: ídem | **Real**, sin IA | — | En uso sin IA. Falta el visto bueno de Kara |

Se pararon en 9 intentos de los 24 posibles (hasta 6 por foto): los modelos redibujan el texto pequeño en cualquier
ajuste y cada intento gasta créditos. Todos con 5 s, 9:16, sin audio y sin preset de estilo. Higgsfield no expone la
semilla.

| Intento | Modelo y modo | Resolución | Trabajo | Resultado | Motivo |
|---|---|---|---|---|---|
| fachada 1 | `kling4_0`, imagen a vídeo | 720p | `0ec3a36d-a930-41dc-ac96-a026666cb461` | **Aceptado** | El primer fotograma es la foto (diferencia media 4,56 de 255: compresión y reescalado). El último coincide con la foto real de la escalera. Sin personas ni texto; EMPUJAR no aparece, porque la puerta se ve de canto. Solo cambia un poco la textura del granito |
| escalera 1 | ídem | 720p | `59c757db-0e94-4a11-be2f-8e7e338c574c` | Rechazado | EMPUJAR acaba en garabato |
| escalera 2 | ídem | 720p | `6575b03a-234e-4beb-a6ad-fc27b7462414` | Rechazado | EMPUJAR pasa a otras letras desde el fotograma del medio |
| escalera 3 | ídem | 1080p | `68160cf2-a98a-414f-a8e0-55abd60d5915` | Rechazado | EMPUJAR cambia de letras también a 1080p |
| ventana 1 | ídem | 720p | `46c02fba-5d1e-46db-9ee0-d7858df0c979` | Rechazado | EMPUJAR en garabato y Quitapesares emborronado en el espejo |
| ventana 2 | ídem | 1080p | `07a87063-633d-4fe7-9428-71fccad8f866` | Rechazado | Quitapesares aguanta, pero EMPUJAR cambia de letras (visto a 4×) |
| cafetera 1 | ídem | 720p | `c28fdb07-9df6-4ec1-82b8-8a29f48d5af8` | Rechazado | Texto inventado en el molinillo, contenido nuevo a la derecha y mancha con forma de letras en el granito |
| cafetera 2 | ídem | 720p | `338f9e81-03f5-4d29-aef7-2bb11dfaef08` | Rechazado | Logos y texto del paquete, borrosos en la foto, salen como letras nítidas que no están en ella |
| cafetera 3 | `seedance_2_5`, `omni_reference` | 720p | `ac41bdb9-8536-4386-bd87-4e9102219a1a` | Rechazado | El primer fotograma no es la foto: diferencia media 25,9 de 255, frente a unos 5 |

Prompts, en inglés:
- **fachada 1**: «Very slow, smooth camera push-in toward the open doorway, almost static. Keep everything in the photo exactly as it is: the same striped awning, burgundy doors, brick walls, staircase, floor tiles, colours and sunlight. No people, no animals, no new objects, no text, no changes to the building. Only the camera moves gently forward.»
- **escalera 1**: «Very slow, smooth camera push-in through the open burgundy doors toward the staircase, almost static. Keep everything in the photo exactly as it is: the same wooden barrel, wrought-iron arch, wooden counter, staircase, terracotta floor, doormat, colours and sunlight. No people, no animals, no new objects, no text, no changes to the room. Only the camera moves gently forward.»
- **ventana 1**: «Very slow, subtle camera push-in toward the wrought-iron arched mirror and the barrel, almost static. Keep everything in the photo exactly as it is: the same barrel, staircase, wooden counter, glass door, terracotta floor, colours and light. The engraved word on the wall and on the mirror and the small sign on the glass door must stay exactly identical and unchanged. No people, no animals, no new objects, no new text. Only the camera moves gently forward.»
- **cafetera 1**: «Very slow, smooth lateral camera move along the bar counter with a slight parallax, almost static. Keep everything in the photo exactly as it is: the same espresso machine, coffee grinders, cups, saucers, granite counter, colours and light. No people, no hands, no animals, no new objects, no text, no steam, no screens. Only the camera moves gently.»
- **Segundos y terceros intentos**: el prompt de su foto con menos movimiento y más control del texto. escalera 2: «Minimal, very slow camera push-in of only a few percent (…) The small white sign on the left glass door must stay exactly as it is». escalera 3, ventana 2 y cafetera 3: «Almost a still photograph: an extremely slow, barely perceptible camera push-in. Preserve every detail of the photo pixel for pixel (…) Do not redraw, sharpen or change any text.» cafetera 2: «Very slow, steady camera push-in straight toward the espresso machine, no sideways movement (…) Keep all small logos and labels blurred».
