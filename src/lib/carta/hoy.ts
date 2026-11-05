// Los platos de hoy para la portada y el recorrido: los disponibles de la carta que ve /carta. No lee la hoja por su
// cuenta: usa cartaParaMostrar, así que si la hoja falla salen los de la última versión válida.
import { cartaParaMostrar, type EntornoCarta } from './fuente.ts';
import { agrupar, type Carta, type Idioma } from './hoja.ts';

const MAXIMO = 4;

/** Hasta `maximo` platos disponibles, repartidos entre categorías: uno de cada una y vuelta a empezar. */
export function platosDeHoy(carta: Carta | null, idioma: Idioma, maximo = MAXIMO): string[] {
  if (!carta) return [];
  const colas = agrupar(carta, idioma).map((grupo) => grupo.platos.filter((p) => p.disponible).map((p) => p.nombre));
  const platos: string[] = [];
  for (let i = 0; platos.length < maximo && colas.some((c) => i < c.length); i++) {
    for (const cola of colas) if (i < cola.length && platos.length < maximo) platos.push(cola[i]);
  }
  return platos;
}

/** Lo que contesta la ruta /recorrido/hoy. */
export async function platosParaMostrar(
  entorno: EntornoCarta,
  url: URL,
  plantilla: string,
  esperar: (promesa: Promise<unknown>) => void,
  idioma: Idioma,
): Promise<string[]> {
  return platosDeHoy(await cartaParaMostrar(entorno, url, plantilla, esperar), idioma);
}
