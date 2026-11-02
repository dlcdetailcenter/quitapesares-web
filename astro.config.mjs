// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import datosRestaurante from './scripts/datos/integracion-astro.mjs';

export default defineConfig({
  // Imágenes procesadas con sharp en la compilación (la portada es estática): sin el enlace de Cloudflare
  // Images en el Worker.
  adapter: cloudflare({ imageService: 'compile' }),
  // Web sin sesiones: así el adaptador no reserva un KV de Cloudflare al desplegar.
  session: false,
  // Español sin prefijo (/ y /carta) e inglés en /en/ (/en/ y /en/carta).
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false },
  },
  // Fuentes alojadas en el propio sitio (origen y licencias en src/assets/fonts/ORIGEN.md): el navegador
  // no pide nada a Google.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Pirata One',
      cssVariable: '--fuente-rotulo',
      fallbacks: ['serif'],
      options: {
        variants: [{ weight: 400, style: 'normal', display: 'swap', src: ['./src/assets/fonts/PirataOne-Regular.ttf'] }],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Alegreya Sans',
      cssVariable: '--fuente-texto',
      fallbacks: ['sans-serif'],
      options: {
        variants: [
          { weight: 400, style: 'normal', display: 'swap', src: ['./src/assets/fonts/alegreya-sans-400-latin.woff2'] },
          { weight: 700, style: 'normal', display: 'swap', src: ['./src/assets/fonts/alegreya-sans-700-latin.woff2'] },
        ],
      },
    },
  ],
  // Barrera: `astro build` en modo producción falla si algún dato del restaurante no está CONFIRMADO.
  integrations: [datosRestaurante()],
});
