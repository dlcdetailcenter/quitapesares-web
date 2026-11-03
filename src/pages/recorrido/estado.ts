// ¿Se muestra el recorrido? El Worker contesta que no si el navegador pide ahorrar datos (cabecera Save-Data: on).
// La portada es estática y no ve las cabeceras de la petición: por eso cliente.ts pregunta aquí antes de cargar nada.
import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  const ahorroDeDatos = (request.headers.get('Save-Data') ?? '').trim().toLowerCase() === 'on';
  return new Response(JSON.stringify({ recorrido: !ahorroDeDatos }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      Vary: 'Save-Data',
    },
  });
};
