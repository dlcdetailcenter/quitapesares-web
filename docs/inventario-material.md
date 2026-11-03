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
