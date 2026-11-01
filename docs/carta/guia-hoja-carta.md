# Guía: crear la hoja de la carta en Google

Plantilla: [`plantilla-hoja-carta.csv`](./plantilla-hoja-carta.csv). Tiene los 23 platos de la carta de Google Sites del 28-10-2026, con la ortografía normalizada.

- Columnas: `id`, `categoria`, `nombre_es`, `nombre_en` (vacía de momento), `disponible` y `orden` (posición dentro de su categoría).
- **Los precios no van en la hoja:** están en `src/data/restaurante.json`.
- **No publiques ni compartas la hoja todavía.**

Los nombres de los menús son los de Google Sheets en español. Si alguno no coincide exactamente, busca el más parecido.

## 1. Crea una hoja vacía y privada
En Google Drive: **Nuevo** → **Hojas de cálculo de Google** → **Hoja de cálculo en blanco**. Llámala `Carta Quitapesares`. No la compartas con nadie.

## 2. Importa la plantilla
1. Descarga `plantilla-hoja-carta.csv`: en GitHub, abre el archivo y pulsa el botón de descarga, o cógelo de tu copia local.
2. En la hoja: **Archivo** → **Importar** → **Subir** y elige el archivo.
3. En el cuadro de importación elige:
   - Ubicación: **Reemplazar hoja actual**.
   - Tipo de separador: **Coma**.
   - **Convertir texto en números, fechas y fórmulas**: marcado.
4. Pulsa **Importar datos**.

Comprueba que salen 6 columnas y 24 filas (la cabecera y 23 platos).

## 3. Lista cerrada en «categoria» (columna B)
1. Selecciona `B2:B1000` → **Datos** → **Validación de datos** → **Añadir regla**.
2. En Criterios elige **Desplegable** y escribe una opción por casilla, exactamente así:
   - `Primeros`
   - `Segundos · Carnes y pollo`
   - `Segundos · Pescados`
   - `Postres`
3. En **Opciones avanzadas** → «Si los datos no son válidos» elige **Rechazar la entrada**.
4. Pulsa **Hecho**.

## 4. Casilla en «disponible» (columna E)
1. Selecciona `E2:E1000` → **Insertar** → **Casilla de verificación**.
2. Ve a **Datos** → **Validación de datos**, abre la regla de `E2:E1000` → **Opciones avanzadas** → **Rechazar la entrada** → **Hecho**.
3. Los platos importados deben verse marcados. Si alguno no lo está, selecciónalo y pulsa la barra espaciadora.

## 5. Comprueba que la hoja rechaza lo que no vale
- En `B25` escribe `Bebidas` y pulsa Intro: tiene que salir un aviso y **no** guardarse.
- En `E2` escribe `sí` y pulsa Intro: tampoco debe guardarse.

Si alguno de los dos se guarda, revisa el paso 3 o el 4. Después cuéntale el resultado a Claude: es el criterio 7 de la fase 0.

## 6. Déjala privada
No la compartas ni uses **Archivo** → **Compartir** → **Publicar en la Web**. Guarda el enlace de la hoja; en F1 se decide cómo la lee la web.
