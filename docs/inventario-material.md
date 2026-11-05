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

## F2: maqueta 2, imágenes creadas con IA

Estado al 2026-11-04. Sustituye a las 4 piezas de la maqueta anterior, que quedan arriba como historial. Excepción
ampliada, solo para la demo privada (`CLAUDE.md`). **Producción sigue solo con material real y la maqueta se retira
después de la demo al dueño.** `recorrido-maqueta/` no entra en git (176 archivos, 5,89 MB de 8); sumas en
`scripts/media/manifiesto-maqueta.json`, proceso en `scripts/media/tramos-maqueta.json`. Aire y nubes, los del material
real. Longitud: aire 1 + 6 piezas de 0,5 + 2 paradas de 0,5 = 5 pantallas.

OK del dueño, tal como lo comunicó Kara el 2026-11-04: «crear lo necesario con el local para un resultado óptimo».
Canal y forma: por anotar.

Entradas: 8 recortes de fotogramas reales, sin texto legible, caras, matrículas ni pantallas, en SDR y sin metadatos
(`procesar.mjs foto r-…`, lista en `tramos.json` → `fotos`). Solo estos 8 se subieron a Higgsfield, con el OK de Kara del
2026-11-04 y las sumas comprobadas antes de subir.

| Referencia | Clip y segundo | Recorte (x, y, ancho×alto) | SHA-256 |
|---|---|---|---|
| `r-fachada` | IMG_4595, 2,4 | 0, 0, 640×1138 | `4223ffde…` |
| `r-ladrillo` | IMG_4594, 0,0 | 0, 1400, 1080×440 | `b8409c1a…` |
| `r-umbral` | IMG_4595, 2,4 | 205, 480, 695×1180 | `9af2fc0e…` |
| `r-suelo` | IMG_4595, 4,3 | 0, 1450, 590×470 | `a65a0bd4…` |
| `r-barrica` | IMG_4595, 4,3 | 435, 0, 645×795 | `f82b3547…` |
| `r-escalera` | IMG_4595, 3,3 | 640, 240, 400×1130 | `6429ff66…` |
| `r-granito` | IMG_4593, 2,5 | 0, 1600, 1080×320 | `1a8d8a93…` |
| `r-cafetera` | IMG_4593, 2,5 | 570, 930, 340×370 | `cb1010d0…` |

Todas las piezas son **IA** (`"ia": "local"`, `"origen": "creada"`) y se declaran con la etiqueta visible «Imagen creada
con IA a partir de fotogramas reales del local» / «AI image created from real frames of the venue», en los créditos del
recorrido (es/en) y en esta tabla. Se usan fijas: 28 fotogramas a 8 fps con recorte progresivo, WebP 55, sin imagen a
vídeo. Modelo: `nano_banana_2_1`, 2k, 9:16, `thinking_level` alto; semilla 4112026 en los primeros intentos y 4112027 en
los segundos. Aceptadas por Claude y con el visto bueno de Kara del 2026-11-04 («todo ok»), a la vista de las hojas de contacto. **Falta la respuesta del dueño: «¿es tu local?».**

| Pieza | Parada | Referencias | Variante aceptada | Trabajo | Uso |
|---|---|---|---|---|---|
| `llegada` | Puerta | r-fachada, r-umbral, r-ladrillo | Libre, intento 2 | `14f86da4-90bb-48f6-ac42-80a6bd4e4240` | Recorte 1536×2731 |
| `umbral` | Puerta | r-umbral, r-suelo | Libre, intento 1 | `b94098cd-8fb0-434b-8b8a-97111674c327` | Recorte 1536×2731 |
| `barrica` | Puerta | r-barrica, r-umbral | Fiel, intento 1 | `3e9ad380-dc52-4aab-949f-ee93b1b4cf13` | Recorte 1536×2731 |
| `escalera` | Puerta, se queda en la parada | r-escalera, r-barrica | Fiel, intento 1 | `9e9c56d3-b85c-4eeb-bcdb-2739181b186f` | Recorte 1536×2731 |
| `barra` | Barra | r-granito, r-cafetera | Libre, intento 1 | `674600b8-fe26-44b6-9cc3-d6bbb4d6313d` | Recorte 1536×2731 |
| `cafetera` | Barra, se queda en la parada | r-cafetera, r-granito | Libre, intento 2 | `d2569651-b4ae-4486-9522-f6df7ba0b691` | Recorte 1200×2133 desde y = 60: quita el microtexto junto al mando |

16 intentos, 2 créditos cada uno (32 en total), de los 36 posibles. Los envíos rechazados por el servicio (429 y 503) no
se cobraron y no cuentan como intentos.

| Intento | Trabajo | Resultado | Motivo |
|---|---|---|---|
| llegada fiel 1 | `c63e8a39-8c3a-4ea0-931d-825985ac7198` | Rechazado | Balcón inventado, puertas de madera con paneles e interior que no es el del local |
| llegada libre 1 | `3fca0236-7df3-4a84-957c-ec30eb1274b1` | Rechazado | Inventa una calle, edificios y un tejado: zona no filmada |
| llegada fiel 2 | `cf9c8856-058f-470b-b49d-6eda0c54ca48` | Válido, no elegido | Muy fiel, pero la escalera del fondo pierde el granito; la libre 2 aporta el punto de vista nuevo |
| llegada libre 2 | `14f86da4-90bb-48f6-ac42-80a6bd4e4240` | **Aceptado** | Sin texto a tamaño completo; puerta, toldo, escalera y barrica coherentes |
| umbral fiel 1 | `92492646-d026-40d5-a309-a0eca1114f7b` | Rechazado | Marco de madera con bisagras doradas en lugar del burdeos y mesa plegada sin su color |
| umbral libre 1 | `b94098cd-8fb0-434b-8b8a-97111674c327` | **Aceptado** | Limpio; suelo, cenefa, mueble, arco y escalera coherentes |
| barrica fiel 1 | `3e9ad380-dc52-4aab-949f-ee93b1b4cf13` | **Aceptado** | Espejo sin texto. El mueble de debajo desaparece (recomposición permitida). Marcas leves en las duelas, ilegibles |
| barrica libre 1 | `c4c5cfef-78bc-4ea8-a4bf-5ee1486bbf62` | Rechazado | El espejo pasa a ser un paso abierto y aparece una repisa: cambia la distribución |
| escalera fiel 1 | `9e9c56d3-b85c-4eeb-bcdb-2739181b186f` | **Aceptado** | Luces sin glifos; granito, pasamanos y zócalo coherentes |
| escalera libre 1 | `2dfa30fd-cab7-4974-b21b-260c7d8c29b2` | Rechazado | Glifos parecidos a letras en las luces de los peldaños |
| barra fiel 1 | `6dab5d63-7034-4120-a31e-47fb779830cd` | Rechazado | Inventa un suelo de cemento bajo la barra |
| barra libre 1 | `674600b8-fe26-44b6-9cc3-d6bbb4d6313d` | **Aceptado** | Cafetera desenfocada, marcas ilegibles. Granito algo más saturado que el real |
| cafetera fiel 1 | `5068484b-3c93-4c9a-a260-d25a4a676801` | Rechazado | Sobre granito, no sobre acero; platillos y un indicador inventado |
| cafetera libre 1 | `058c5579-391f-43be-b474-e0a090b97344` | Rechazado | Pared parda en lugar de gris oscuro, caja de colores y platillos |
| cafetera fiel 2 | `a47c7a3c-7640-4ac2-a57d-f5b59cc5cbb1` | Rechazado | Pizarra con cifras arriba y cajas en una estantería |
| cafetera libre 2 | `d2569651-b4ae-4486-9522-f6df7ba0b691` | **Aceptado con recorte** | El microtexto junto al mando queda fuera del recorte |

Prompts, en inglés. Inicio común: «Images 1 and 2 define the place, materials, colours and light; do not copy their
framing.» Final común: «Realistic photograph, vertical 9:16. Exclude text, letters, numbers, logos, signs, people, hands,
plates, food, drinks, labelled bottles, screens.»
- **llegada fiel 1**: «Open burgundy double doors under the striped awning, seen from the terracotta pavement, three-quarter angle from the left, eye level, 35 mm. Clear sun with soft diagonal shadows on the brick.»
- **llegada libre 1**: «Low camera close along the brick wall toward the open burgundy door and awning, 24 mm, deep perspective. Warm low sun raking the brick, the feeling of arriving at golden hour; fine grain.»
- **llegada fiel 2** (tres referencias, «Images 1, 2 and 3…», y además excluye «balconies, upper floors, streets, other buildings»): «The entrance from the terracotta pavement, straight on, eye level, 35 mm, framed tightly on the doorway: striped awning at the top, burgundy metal-framed glass doors wide open, brick at the sides, the staircase and barrel visible inside. Clear sun with soft diagonal shadows on the brick.»
- **llegada libre 2** (ídem): «Low camera on the terracotta pavement just outside the doorway, 24 mm, looking through the open burgundy metal-framed doors toward the staircase and barrel inside, awning edge at the top of the frame. Warm low sun raking the brick and doors, the feeling of arriving; fine grain.»
- **umbral fiel 1**: «From just inside the doorway at standing height, 28 mm: staircase, barrel and wrought-iron arch, terracotta floor with its tile border in the foreground. Calm daylight from the door.»
- **umbral libre 1**: «Camera a few centimetres above the terracotta, 24 mm, the tile border leading to the foot of the staircase, soft focus far away. A patch of sun crossing the tiles, a quiet morning before opening.»
- **barrica fiel 1**: «The wooden barrel on the ochre block with the wrought-iron arch below it, seen from the floor looking slightly up, 50 mm, centred. The mirror shows only a plain warm ochre blur. Soft even light.»
- **barrica libre 1**: «Across soft-focus wooden balusters in the foreground, the barrel sharp behind them, 85 mm, high angle from the stairs. Warm side light glinting on the iron hoops, intimate and still.»
- **escalera fiel 1**: «Foot of the granite staircase looking up, centred, 28 mm, wooden handrail on the left, small square step lights, ochre wall at the top. Soft daylight.»
- **escalera libre 1**: «Low camera beside the carved newel post in the foreground, 35 mm, looking up along the handrail and granite steps. Warm light falling down the ochre wall, an invitation to go up; fine grain.»
- **barra fiel 1**: «Long speckled granite bar counter receding, camera at counter height, 35 mm, white espresso machine softly out of focus far away, dark grey stone wall behind. Bright even interior light.»
- **barra libre 1**: «Camera almost resting on the granite, 50 mm at f/1.4, speckled stone sharp in the foreground, the white machine and stone wall dissolving into soft bokeh. Gleam along the polished stone.»
- **cafetera fiel 1**: «Three-quarter view of the white espresso machine with stacked white cups on top, steel group heads, dark grey stone wall, counter level, 50 mm. Plain unbranded surfaces. Bright even light.»
- **cafetera libre 1**: «Close on the stacked white cups on top of the machine, 85 mm, shallow depth of field, stone wall blurred. Warm highlights on the porcelain and steel, the calm of the first coffee of the day.»
- **cafetera fiel 2** (excluye además «gauges, saucers»): «Three-quarter view of the white espresso machine standing on a stainless steel counter, white cups stacked on top, steel group heads, dark grey stone wall behind, counter level, 50 mm. Plain unbranded surfaces. Bright even light.»
- **cafetera libre 2** (excluye además «gauges, saucers, boxes»): «Close on the white cups stacked on top of the white machine, 85 mm, shallow depth of field, the dark grey stone wall behind softly blurred and clearly grey. Warm highlights on the porcelain and steel, the calm of the first coffee of the day.»

## F2: demo final, vídeos e imágenes creados con IA

Estado al 2026-11-05. Sustituye a las piezas de la maqueta 2, que quedan arriba como historial. Excepción ampliada otra
vez, solo para la demo privada (`CLAUDE.md`). **Producción sigue solo con material real y la maqueta se retira después
de la demo al dueño.** `recorrido-maqueta/` no entra en git (212 archivos, 6,08 MB de 8); sumas en
`scripts/media/manifiesto-maqueta.json`, proceso en `scripts/media/tramos-maqueta.json`. Aire y nubes, los del material
real. Longitud: 7,25 pantallas.

Entradas: solo lo que ya estaba en Higgsfield, las 8 referencias y las 6 imágenes aceptadas de la maqueta 2, y las
imágenes nuevas generadas a partir de ellas. **No se subió nada nuevo.**

Todas las piezas son **IA** (`"ia": "local"`, `"origen": "creada"`) y se declaran con la etiqueta visible «Creado con IA
a partir de fotogramas reales del local» / «Created with AI from real frames of the venue», en los créditos del recorrido
(es/en) y en esta tabla. Fotogramas WebP de 540×960, sin audio ni metadatos. Falta verlas en un móvil real y la respuesta
del dueño: «¿es tu local?».

| Pieza | Tipo | Entradas | Trabajo | Fotogramas | Parada que sigue |
|---|---|---|---|---|---|
| `barrido-entrada` | Vídeo, 3 s | Inicio `llegada`, final `umbral` | `4e353c49-2769-4c42-9ed5-ac0312f0a25e` | 37 | — |
| `barrica` | Imagen de la maqueta 2 | — | `3e9ad380-dc52-4aab-949f-ee93b1b4cf13` | 20 | Platos de hoy |
| `escalera` | Imagen de la maqueta 2 | — | `9e9c56d3-b85c-4eeb-bcdb-2739181b186f` | 20 | — |
| `barra` | Vídeo, 4 s | Inicio `barra`, final `cafetera-frente` | `e8273960-bc05-439b-a4a1-1909654f37ed` | 40 | Menú del día |
| `cafetera` | Vídeo, 5 s | Inicio `cafetera-frente` | `1aa445c3-4070-407b-a506-4b958bfd0838` | 50 | Llamar |
| `barrido-salida` | Vídeo, 3 s | Inicio `barrica`, final `salida` | `9e026a44-2a74-43e1-a055-800a7d4becf7` | 37 | Dejar reseña e idioma |

Antes de la primera pieza va la parada Cómo llegar, sobre la ortofoto. `barra` y `cafetera` se recortan a 650×1156 desde
x = 31, y = 110: quita la banda oscura de arriba de `cafetera-frente`. `barrica` y `escalera`, con recorte progresivo.

Imágenes nuevas, modelo `nano_banana_2_1`, 2k, 9:16, `thinking_level` alto, semilla 5112026. Inicio común: «Images 1 and 2
define the place, materials, colours and light; do not copy their framing.» Final común: «Realistic photograph, vertical
9:16. Exclude text, letters, numbers, logos, signs, people, hands, plates, food, labelled bottles, screens, boards,
shelves.»

| Intento | Entradas | Trabajo | Resultado | Motivo |
|---|---|---|---|---|
| cafetera-frente fiel 1 | `cafetera` aceptada, `r-cafetera` | `39eb5a67-050a-4fd6-b698-a45187f9fadc` | **Aceptado** | Máquina blanca, tazas, acero y piedra, sin texto. La banda oscura de arriba se recorta |
| cafetera-frente libre 1 | Ídem | `5861e72e-511d-4843-b100-46a34c101c2b` | Válido, no elegido | Limpio, pero el detalle del grupo no sirve de final para la barra |
| salida fiel 1 | `umbral` aceptada, `r-fachada` | `5520e35d-5dce-4fb9-bc88-b423ceebdf69` | Rechazado | Puertas macizas de madera: las reales son de cristal |
| salida libre 1 | Ídem | `56d1aa7e-9a20-4aa5-ab1a-b9fdc8cede1e` | **Aceptado** | Puertas de cristal, umbral de piedra y arranque de la escalera; fuera, solo luz |

Prompts de las imágenes:
- **cafetera-frente fiel**: «Front view of the white espresso machine on a stainless steel counter, one empty white cup under the group head, dark grey stone wall, counter level, 50 mm. Bright even light.»
- **cafetera-frente libre**: «Close three-quarter view of the group head above one white cup on the steel drip tray, 70 mm, shallow depth of field, dark grey stone wall blurred. Warm highlights on the steel.»
- **salida fiel**: «From inside at standing height, 28 mm: the open burgundy doors from behind, terracotta floor in the foreground, and beyond the doorway only pure white overexposed sunlight.»
- **salida libre**: «From low on the terracotta floor, 24 mm, the open burgundy doors and threshold, sunlight flooding in and blooming to pure white beyond the doorway, no exterior visible.»

Vídeos, modelo `kling4_0`, imagen a vídeo, 720p, 9:16, sin audio pedido. Kling devuelve una pista de audio y el pipeline
la quita (`check:media` lo comprueba).

| Intento | Trabajo | Resultado | Motivo | Prompt |
|---|---|---|---|---|
| barrido-entrada 1 | `3efb812a-d553-4195-9ac4-69bf0bed27d7` | Rechazado | Atraviesa el espejo e inventa otra puerta con toldo, vigas y un arco | Very fast single dolly forward through the open burgundy doors with strong motion blur; the camera rushes inside, drops low and stops sharply over the terracotta floor. One continuous shot. |
| barrido-entrada 2 | `4e353c49-2769-4c42-9ed5-ac0312f0a25e` | **Aceptado** | Cruza el umbral, baja al suelo y no sale de la entrada | One quick short dolly just across the threshold, tilting down toward the terracotta floor with motion blur, camera lands low and stops. Stays in this one room. |
| barrido-interior 1 | `00062f8a-ff6c-4e61-9b18-45cadaa5414e` | Rechazado | Pasa por un comedor inventado, con cuadro y muebles. Decisión de Kara: corte directo, con `escalera` en su lugar | Very fast whip pan to the right with strong horizontal motion blur, one continuous move that settles sharply on the granite counter. Camera only, nothing else moves. |
| barra 1 | `e8273960-bc05-439b-a4a1-1909654f37ed` | **Aceptado** | Avance continuo por el granito hasta la cafetera | Smooth fast glide low along the granite counter toward the white espresso machine, focus pulling onto it, stopping steady in front of the machine. One continuous shot. |
| cafetera 1 | `1aa445c3-4070-407b-a506-4b958bfd0838` | **Aceptado** | Café en dos hilos, vapor y acercamiento a la taza, sin texto ni comida | Locked camera, then a slow push-in that stops on the cup. Coffee runs from the group head into the white cup and soft steam rises. |
| barrido-salida 1 | `9e026a44-2a74-43e1-a055-800a7d4becf7` | **Aceptado** | No sale del vestíbulo y acaba en la luz de la puerta. La escalera pasa desenfocada, sin sus luces | Very fast single dolly backward with strong motion blur, the camera pulls through the room toward the open doors and ends in bright white sunlight. One continuous shot. |

10 generaciones, 55,25 créditos: 4 imágenes a 2 y 6 vídeos (6,75, 6,75, 6,75, 6,75, 9 y 11,25).
