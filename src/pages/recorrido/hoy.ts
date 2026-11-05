// Platos de hoy para la portada, que es estática: src/recorrido/hoy.ts los pide aquí. Si esta ruta falla, en la página
// queda solo «Ver carta». Solo lectura: la carta sale de cartaParaMostrar, igual que en /carta.
import { env } from 'cloudflare:workers';
import type { APIRoute } from 'astro';
import plantilla from '../../../docs/carta/plantilla-hoja-carta.csv?raw';
import { platosParaMostrar } from '../../lib/carta/hoy.ts';

export const prerender = false;

export const GET: APIRoute = async ({ url, locals }) => {
  const idioma = url.searchParams.get('idioma') === 'en' ? 'en' : 'es';
  const platos = await platosParaMostrar(env, url, plantilla, (promesa) => locals.cfContext.waitUntil(promesa), idioma);
  return new Response(JSON.stringify({ platos }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
};
