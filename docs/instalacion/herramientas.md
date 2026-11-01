# Instalar gitleaks y exiftool

Las dos herramientas que necesitan los hooks de pre-commit para **bloquear antes de publicar**:

- **gitleaks** busca secretos en lo preparado para el commit (`scripts/hooks/gitleaks.mjs`).
- **exiftool** comprueba que ninguna imagen ni vídeo lleve coordenadas GPS (`scripts/check-media.mjs`).

Si falta alguna de las dos, el commit se bloquea. No es una molestia evitable: en un repositorio
público, lo que llega a cualquier rama ya es visible aunque la CI falle después. **La CI impide
fusionar, no publicar.** Antes de publicar solo frenan estos hooks y push protection de GitHub.

## Qué se instala

Versiones fijadas a propósito: una versión sorpresa cambia lo que detecta la barrera. Antes de
descomprimir nada se comprueba su **SHA-256** contra la suma que publica la fuente oficial. Si no
coincide, no se instala: el archivo no es el que publicó el fabricante.

| Archivo | Versión | Fuente oficial de la descarga | Fuente oficial de la suma | SHA-256 |
|---|---|---|---|---|
| `gitleaks_8.30.1_windows_x64.zip` | 8.30.1 | [release v8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) | `gitleaks_8.30.1_checksums.txt` del mismo release | `d29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e` |
| `gitleaks_8.30.1_linux_x64.tar.gz` | 8.30.1 | [release v8.30.1](https://github.com/gitleaks/gitleaks/releases/tag/v8.30.1) | `gitleaks_8.30.1_checksums.txt` del mismo release | `551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb` |
| `exiftool-13.60_64.zip` | 13.60 | [exiftool.org](https://exiftool.org/) (descarga alojada en SourceForge, el canal del proyecto) | [`exiftool.org/checksums-13.60.txt`](https://exiftool.org/checksums-13.60.txt) | `548b1f4e0b713cd2a26824b34080c35db4e2d2edd166468eb38b1d55ada90c2e` |
| `Image-ExifTool-13.60.tar.gz` | 13.60 | [exiftool.org](https://exiftool.org/) (ídem) | [`exiftool.org/checksums-13.60.txt`](https://exiftool.org/checksums-13.60.txt) | `c8e3c42576f46d862e4cd9c192989776e7363931e890c95056bcd6293e83ea36` |

La misma versión de gitleaks (8.30.1) que usa la CI, para que local y CI detecten lo mismo.

## Windows

Sin permisos de administrador y sin instaladores: los dos programas se copian en
`%USERPROFILE%\bin`. En PowerShell, de una vez:

```powershell
# Carpeta de binarios del usuario y comprobación de que está en el PATH
$bin = Join-Path $HOME 'bin'
New-Item -ItemType Directory -Force $bin | Out-Null
if (($env:Path -split ';') -notcontains $bin) {
  Write-Warning "$bin no está en el PATH de esta terminal: mira la nota del final de este apartado."
}

$tmp = Join-Path $env:TEMP 'herramientas-quitapesares'
New-Item -ItemType Directory -Force $tmp | Out-Null

function Get-Verificado($url, $destino, $esperada) {
  # curl.exe viene con Windows 10 y 11. Con Invoke-WebRequest, SourceForge responde su página
  # intermedia en HTML en vez del archivo y la descarga sale mal (lo cazaría la SHA-256, pero
  # para entonces ya has perdido el rato).
  & curl.exe -fsSL -o $destino $url
  if ($LASTEXITCODE -ne 0) { throw "la descarga de $url ha fallado (curl $LASTEXITCODE)" }
  $real = (Get-FileHash $destino -Algorithm SHA256).Hash.ToLower()
  if ($real -ne $esperada) { throw "SHA-256 distinta de la oficial en $destino`n  esperada: $esperada`n  real:     $real" }
  Write-Host "SHA-256 correcta: $(Split-Path $destino -Leaf)"
}

# gitleaks 8.30.1
$zip = Join-Path $tmp 'gitleaks_8.30.1_windows_x64.zip'
Get-Verificado 'https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_windows_x64.zip' $zip 'd29144deff3a68aa93ced33dddf84b7fdc26070add4aa0f4513094c8332afc4e'
Expand-Archive -Path $zip -DestinationPath (Join-Path $tmp 'gitleaks') -Force
Copy-Item (Join-Path $tmp 'gitleaks\gitleaks.exe') $bin -Force

# exiftool 13.60: el .zip trae "exiftool(-k).exe" y la carpeta exiftool_files, que tienen que
# quedar juntas. Renombrar el .exe a exiftool.exe es lo que indica su propio readme_windows.txt.
$zip = Join-Path $tmp 'exiftool-13.60_64.zip'
Get-Verificado 'https://sourceforge.net/projects/exiftool/files/exiftool-13.60_64.zip/download' $zip '548b1f4e0b713cd2a26824b34080c35db4e2d2edd166468eb38b1d55ada90c2e'
Expand-Archive -Path $zip -DestinationPath (Join-Path $tmp 'exiftool') -Force
Copy-Item (Join-Path $tmp 'exiftool\exiftool-13.60_64\exiftool(-k).exe') (Join-Path $bin 'exiftool.exe') -Force
Copy-Item (Join-Path $tmp 'exiftool\exiftool-13.60_64\exiftool_files') $bin -Recurse -Force

# Comprobación
gitleaks version
exiftool -ver
```

Tiene que responder `8.30.1` y `13.60`.

Si el aviso dijo que `%USERPROFILE%\bin` no está en el PATH, añádela **solo a tu usuario** (no al
sistema) y vuelve a abrir la terminal:

```powershell
[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path','User') + ";$HOME\bin", 'User')
```

## Nube (Ubuntu u otro Linux)

Igual de fijado, en `~/bin`, sin tocar nada del sistema:

```bash
mkdir -p ~/bin ~/herramientas && cd "$(mktemp -d)"

# gitleaks 8.30.1
curl -fsSLO https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks_8.30.1_linux_x64.tar.gz
echo '551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb  gitleaks_8.30.1_linux_x64.tar.gz' | sha256sum -c -
tar xzf gitleaks_8.30.1_linux_x64.tar.gz gitleaks && mv gitleaks ~/bin/ && chmod +x ~/bin/gitleaks

# exiftool 13.60 (es Perl: se ejecuta desde donde se descomprime; Ubuntu ya trae perl)
curl -fsSL -o Image-ExifTool-13.60.tar.gz https://sourceforge.net/projects/exiftool/files/Image-ExifTool-13.60.tar.gz/download
echo 'c8e3c42576f46d862e4cd9c192989776e7363931e890c95056bcd6293e83ea36  Image-ExifTool-13.60.tar.gz' | sha256sum -c -
tar xzf Image-ExifTool-13.60.tar.gz -C ~/herramientas
ln -sf ~/herramientas/Image-ExifTool-13.60/exiftool ~/bin/exiftool

export PATH="$HOME/bin:$PATH"   # añádelo a ~/.bashrc si no estaba
gitleaks version && exiftool -ver
```

Si `sha256sum -c` dice `FAILED`, se para ahí: no se descomprime nada.

Alternativa para exiftool si no hace falta versión fijada y hay `sudo`: la misma línea que usa la
CI, `sudo apt-get install -y --no-install-recommends libimage-exiftool-perl`. Instala la versión
que traiga la distribución, no la 13.60.

## Si están instaladas fuera del PATH

Los dos scripts aceptan una ruta por variable de entorno, sin tocar el PATH:

```bash
GITLEAKS=/ruta/a/gitleaks EXIFTOOL=/ruta/a/exiftool git commit -m "…"
```

## En la CI

No hace falta instalar nada a mano: `.github/workflows/ci.yml` trae gitleaks con la acción oficial
fijada por SHA y `GITLEAKS_VERSION: 8.30.1`, y exiftool por `apt`. El trabajo `media` falla si
exiftool no está, aunque no haya imágenes: así una instalación rota no pasa desapercibida.

## Al subir de versión

1. Coger la suma nueva de su fuente oficial: para gitleaks, el `..._checksums.txt` del release;
   para exiftool, `exiftool.org/checksums-<versión>.txt`.
2. Cambiar versión y suma en la tabla de arriba, en los bloques de órdenes y en `GITLEAKS_VERSION`
   de `.github/workflows/ci.yml`.
3. Un commit solo para eso, con la suma en el mensaje.
