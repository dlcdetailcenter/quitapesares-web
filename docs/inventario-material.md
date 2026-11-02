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
