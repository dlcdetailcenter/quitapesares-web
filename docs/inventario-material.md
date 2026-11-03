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

Estado al 2026-11-03 (con los clips). El material del recorrido **no entra en git** durante la fase (se sirve desde
`public/recorrido/`, ignorada); aquí se inventaría igual. Sumas SHA-256 del material real:
`scripts/media/manifiesto-real.json` (112 archivos, 3,89 MB). Proceso de cada tramo: `scripts/media/tramos.json`.

| Pieza | Origen | Real o IA | Licencia | Dónde se declara la IA | Estado |
|---|---|---|---|---|---|
| Recorrido de prueba (`public/recorrido/`, generado al compilar) | `scripts/media/preparar.mjs`: PNG de colores lisos | Sintético, sin IA | Propio | — | Solo para pruebas y CI; los créditos del recorrido dicen que es de prueba |
| Nubes dibujadas y cielo | `src/recorrido/aire.ts`: degradados en canvas | Código, sin IA | Propio | — | En uso: alternativa sin IA mientras no haya nubes de IA aceptadas; el cielo, mientras no haya ortofoto |
| Tramo aéreo | Ortofoto PNOA del IGN por WMTS (`scripts/media/ortofoto.mjs`), capa `OI.OrthoimageCoverage` | Real (ortofoto), sin IA | CC-BY 4.0 scne.es: «Obra derivada de PNOA <año> CC-BY 4.0 scne.es», visible al pie del tramo con enlace | — | Pendiente: sin generar (el servicio no era accesible desde la sesión). El año sale de la tabla de productos de scne.es |
| Puerta | IMG_4595 (iPhone 16, HEVC 10 bits HLG, 1080×1920, 30 fps), fotogramas 40–126 | **Real**, sin IA | Propio del restaurante | — | En la demo local: HDR → SDR (hable), sin audio ni metadatos, estabilizado, mismo ajuste de color, ruido y nitidez suaves, barrido final con fotogramas reales (tmix), 540×960, 20 fps, WebP 60: 53 fotogramas, 2,0 MB. Sin la placa de especialidades (0–43) ni personas (desde el 134): revisado fotograma a fotograma por Claude. Falta el visto bueno de Kara |
| Barra | IMG_4593 (ídem), entero, recorte fijo de la mitad inferior | **Real**, sin IA | Propio del restaurante | — | En la demo local: mismo proceso, recorte 540×960 desde x=420, y=930, 15 fps, WebP 60: 58 fotogramas, 1,9 MB. Las pantallas (hasta la fila 920) y el cartel de la derecha no entran: revisado fotograma a fotograma. Nivel visual medio (mucha encimera). Falta el visto bueno de Kara |
| Comedor | IMG_4592 | Real | Propio del restaurante | — | **Quitado**: caras reconocibles en todos los fotogramas. Para F4: grabar el comedor vacío |
| Nubes, capa lejana | Higgsfield, trabajo `996fb547-5def-4626-b094-68547776cd30`, modelo pedido `nano_banana_pro` (el trabajo figura como `nano_banana_2`), 9:16, 2K, solo texto | **IA** | Términos de Higgsfield | Créditos del recorrido (es/en) y esta tabla | Generada, **sin revisar** y sin usar |
| Nubes, capa media | Higgsfield, trabajo `4605e657-e426-4a3e-b111-f19b85f1cee9`, ídem | **IA** | Ídem | Ídem | Generada, **sin revisar** y sin usar |
| Nubes, capa cercana | Higgsfield, trabajo `1eab2ccd-1e00-4695-8c6e-ba8713ef8029`, ídem | **IA** | Ídem | Ídem | Generada, **sin revisar** y sin usar |

Descartados en F2:
- IMG_4594: la placa de especialidades, legible en todos los fotogramas.
- Una grabación de pantalla de Google Maps en 3D: prohibida (nada de Google en ningún paso). No se usa ni como referencia.

Prompts de las nubes (sin imágenes de entrada, nada real subido a Higgsfield):
1. «Photographic layer of thin wispy high-altitude clouds seen from an airplane window looking down, scattered soft white and pale grey wisps, isolated on a solid pure black background (#000000). Only clouds and black: no ground, no landscape, no sea, no buildings, no people, no animals, no aircraft, no sun, no text, no logos, no watermark. Soft neutral daylight, fine natural detail, vertical composition with the wisps spread over the whole frame and plenty of black between them.»
2. «Photographic layer of medium-density fluffy cumulus clouds seen from above, separate soft white puffs with gentle grey shading, isolated on a solid pure black background (#000000). Only clouds and black: no ground, no landscape, no sea, no buildings, no people, no animals, no aircraft, no sun, no text, no logos, no watermark. Soft neutral daylight, realistic volumetric detail, vertical composition, clouds distributed across the frame with black gaps.»
3. «Photographic close-up of large soft dense white cloud banks drifting past the camera, thick billowing volumes filling most of the frame with ragged edges, isolated on a solid pure black background (#000000) visible at the edges. Only clouds and black: no ground, no landscape, no buildings, no people, no animals, no aircraft, no sun, no text, no logos, no watermark. Soft neutral daylight, realistic volumetric detail, vertical composition.»

Una pieza de IA solo se usa si no muestra edificios, personas, comida, logos ni texto, no tiene artefactos a
tamaño de móvil, casa con el color de los tramos reales, cabe en 0,6 MB y tiene el visto bueno de Kara.
