// Clip SINTÉTICO con la forma de un clip del iPhone, para probar scripts/media/procesar.mjs sin material real:
// HEVC 10 bits en HLG/BT.2020, 1080×1920 (vertical), 30 fps, con pista de audio y con coordenadas GPS
// falsas en los metadatos. El pipeline tiene que quitar el audio y los metadatos y pasar a SDR.
// La imagen es un fractal en movimiento con grano y un temblor de cámara simulado: no muestra nada real.
//
// Uso: node scripts/media/clip-prueba.mjs [segundos]   → $MATERIAL/originales/SINTETICO.mov
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const MATERIAL = resolve(process.env.MATERIAL ?? join(homedir(), 'proyectos', 'quitapesares-material'));
const segundos = Number(process.argv[2] ?? 8);
const destino = join(MATERIAL, 'originales');
mkdirSync(destino, { recursive: true });
const salida = join(destino, 'SINTETICO.mov');

const video =
  `mandelbrot=s=2048x1152:r=30:start_scale=3:end_scale=0.2:end_pts=${segundos * 30}:inner=convergence,` +
  // Temblor de cámara: un recorte que se mueve unos píxeles cada fotograma (vidstab lo tiene que corregir).
  "crop=1920:1080:'64+12*sin(n/3)':'36+9*cos(n/4)'," +
  'noise=alls=10:allf=t+u,format=yuv420p10le';
const r = spawnSync(
  'ffmpeg',
  [
    '-hide_banner', '-loglevel', 'error', '-y',
    // Vertical (1080×1920). Con ffmpeg 6.1, -display_rotation en la entrada lavfi gira la imagen al codificar.
    '-display_rotation', '90', '-f', 'lavfi', '-i', video,
    '-f', 'lavfi', '-i', `sine=frequency=440:sample_rate=48000:duration=${segundos}`,
    '-t', String(segundos),
    '-c:v', 'libx265', '-preset', 'fast', '-x265-params', 'log-level=error:colorprim=bt2020:transfer=arib-std-b67:colormatrix=bt2020nc',
    '-color_primaries', 'bt2020', '-color_trc', 'arib-std-b67', '-colorspace', 'bt2020nc', '-tag:v', 'hvc1',
    '-c:a', 'aac', '-b:a', '64k',
    '-metadata', 'location=+40.0000-003.0000/', '-metadata', 'com.apple.quicktime.make=SINTETICO',
    salida,
  ],
  { stdio: 'inherit' },
);
if (r.status !== 0) process.exit(1);
console.log(`✓ ${salida}`);
