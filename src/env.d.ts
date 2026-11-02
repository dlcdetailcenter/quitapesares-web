// Secretos del Worker: no están en wrangler.jsonc, así que `wrangler types` no los conoce.
interface Env {
  /** URL gviz de la hoja de la carta (wrangler secret put URL_HOJA). Sin ella, /carta usa KV o muestra «Llámanos». */
  URL_HOJA?: string;
}
