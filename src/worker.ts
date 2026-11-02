// Punto de entrada del Worker (wrangler.jsonc → "main").
// - fetch: las páginas de Astro, con el manejador del adaptador de Cloudflare.
// - scheduled: la tarea programada (cada minuto, "triggers" en wrangler.jsonc) que lee la hoja de la carta
//   y actualiza KV solo si algo cambió.
import { handle } from '@astrojs/cloudflare/handler';
import { actualizarCarta } from './lib/carta/fuente.ts';

export default {
  fetch: handle,
  async scheduled(controlador, entorno, contexto) {
    contexto.waitUntil(actualizarCarta(entorno, new Date(controlador.scheduledTime)));
  },
} satisfies ExportedHandler<Env>;
