// Demo privada: ninguna respuesta del Worker se indexa. Las páginas estáticas no pasan por aquí al servirse;
// para ellas está public/_headers. Las dos cabeceras van además con <meta name="robots"> en el HTML.
import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_contexto, siguiente) => {
  const respuesta = await siguiente();
  respuesta.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return respuesta;
});
