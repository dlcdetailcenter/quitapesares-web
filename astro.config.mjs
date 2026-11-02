// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import datosRestaurante from './scripts/datos/integracion-astro.mjs';

export default defineConfig({
  adapter: cloudflare(),
  // Web sin sesiones: así el adaptador no reserva un KV de Cloudflare al desplegar.
  session: false,
  // Español sin prefijo (/ y /carta) e inglés en /en/ (/en/ y /en/carta).
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: { prefixDefaultLocale: false },
  },
  // Barrera: `astro build` en modo producción falla si algún dato del restaurante no está CONFIRMADO.
  integrations: [datosRestaurante()],
});
