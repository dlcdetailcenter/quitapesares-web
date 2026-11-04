// Datos del local para las páginas, leídos de src/data/restaurante.json (única fuente: CLAUDE.md, «Datos del
// restaurante»). Aquí solo se les da forma (enlaces, precios con formato); ningún valor se escribe a mano.
import datos from '../data/restaurante.json';
import { DIAS, type Dia } from '../i18n/textos.ts';
import type { Idioma } from './carta/hoja.ts';

const telefono = datos.telefono.valor;
const { lat, lng } = datos.coordenadas.valor;
const placeId = datos.placeId.valor;
// El nombre en dos trozos, como en la placa de la fachada: «Restaurante» en pequeño y «Quitapesares» en gótica.
// Juntos (con un espacio) son exactamente el nombre del archivo de datos.
const nombreCorto = datos.nombre.valor.replace(/^(bar-)?restaurante\s+/i, '');
const tipoDeLocal = datos.nombre.valor.slice(0, datos.nombre.valor.length - nombreCorto.length).trim();

const FORMATO_PRECIO: Record<Idioma, string> = { es: 'es-ES', en: 'en-GB' };

function precio(cantidad: number, moneda: string, idioma: Idioma): string {
  return new Intl.NumberFormat(FORMATO_PRECIO[idioma], { style: 'currency', currency: moneda }).format(cantidad);
}

export const local = {
  nombre: datos.nombre.valor,
  /** El nombre sin «Restaurante» delante: es lo que dice el rótulo gótico. */
  nombreCorto,
  /** Lo que va delante del nombre corto («Restaurante»), en pequeño; vacío si el nombre no lo lleva. */
  tipoDeLocal,
  direccion: datos.direccion.valor,
  telefono,
  /** Enlace tel: con el número sin espacios. */
  telefonoHref: `tel:${telefono.replace(/[^\d+]/g, '')}`,
  /** Google Maps con las coordenadas y la ficha del local (enlace, nada incrustado). */
  comoLlegarHref: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}&query_place_id=${encodeURIComponent(placeId)}`,
  /** Formulario de reseña de la ficha de Google del local. */
  resenaHref: `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`,
  menuIncluye: datos.menuDiario.valor.incluye,
  precioMenuDiario: (idioma: Idioma) => precio(datos.menuDiario.valor.precio, datos.menuDiario.valor.moneda, idioma),
  precioMenuFinDeSemana: (idioma: Idioma) => precio(datos.menuFinDeSemana.valor.precio, datos.menuFinDeSemana.valor.moneda, idioma),
  horario: DIAS.map((dia: Dia) => ({ dia, horas: datos.horario.valor[dia] })),
};
