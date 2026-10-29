// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  adapter: cloudflare(),
  // Web sin sesiones: así el adaptador no reserva un KV de Cloudflare al desplegar.
  session: false,
});
