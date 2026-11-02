// Barrera de la regla «Datos solo en el JSON»: ningún teléfono, precio ni horario (ni la dirección o el place_id)
// escrito en un archivo del repositorio que no sea src/data/restaurante.json. Revisa todos los archivos de texto
// versionados (git ls-files) y los preparados para el commit. Los valores a buscar salen del propio JSON, así que
// este archivo no los contiene.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const RAIZ = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const ARCHIVO_DATOS = 'src/data/restaurante.json';
const datos = JSON.parse(readFileSync(join(RAIZ, ARCHIVO_DATOS), 'utf8'));
const BINARIOS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.gif', '.ico', '.ttf', '.otf', '.woff', '.woff2', '.pdf', '.xlsx']);
const MAX_BYTES = 2 * 1024 * 1024;

const escapar = (texto) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Los dígitos de un valor con cualquier separador (espacio, punto, guion) entre ellos. */
const digitosConSeparadores = (digitos) => digitos.split('').map(escapar).join('[\\s.\\-]?');

/** Detectores: cada uno busca una forma de escribir un dato del local. */
export function detectores(d) {
  const lista = [];
  const telefono = d.telefono.valor.replace(/\D/g, '');
  const nacional = telefono.startsWith('34') ? telefono.slice(2) : telefono;
  lista.push({ dato: 'teléfono', patron: new RegExp(digitosConSeparadores(nacional)) });
  lista.push({ dato: 'teléfono (enlace tel: escrito a mano)', patron: /tel:\s*\+?\d/ });

  for (const clave of ['menuDiario', 'menuFinDeSemana']) {
    const [enteros, decimales] = d[clave].valor.precio.toFixed(2).split('.');
    const formas = [`${enteros}[.,]${decimales}`, `${enteros}[.,]${decimales.replace(/0$/, '')}(?!\\d)`];
    if (decimales === '00') formas.push(`${enteros}\\s?€`, `€\\s?${enteros}(?![\\d.,])`);
    lista.push({ dato: `precio (${clave})`, patron: new RegExp(`(?<![\\d.,])(?:${formas.join('|')})`) });
  }
  lista.push({ dato: 'precio (cualquier importe en euros)', patron: /\d+[.,]\d{2}\s?€|€\s?\d+[.,]\d{2}|\d+[.,]\d{2}\s?EUR\b/ });

  lista.push({ dato: 'horario (franja HH:MM–HH:MM)', patron: /\b\d{1,2}:\d{2}\s?[–—-]\s?\d{1,2}:\d{2}\b/ });
  for (const franja of new Set(Object.values(d.horario.valor).filter((v) => /\d/.test(v)))) {
    const [desde, hasta] = franja.split(/[–—-]/);
    lista.push({ dato: `horario (${franja.length} caracteres)`, patron: new RegExp(`${escapar(desde)}\\s*(?:[–—-]|a|to|hasta)\\s*${escapar(hasta)}`) });
  }

  lista.push({ dato: 'dirección', patron: new RegExp(escapar(d.direccion.valor.split(',')[0])) });
  lista.push({ dato: 'place_id', patron: new RegExp(escapar(d.placeId.valor)) });
  const { lat, lng } = d.coordenadas.valor;
  lista.push({ dato: 'coordenadas', patron: new RegExp(`${escapar(String(lat))}|${escapar(String(lng))}`) });
  return lista;
}

function archivosDelRepositorio() {
  const salida = (args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf8' }).split('\0').filter(Boolean);
  const versionados = salida(['ls-files', '-z']);
  const preparados = salida(['diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR']);
  return [...new Set([...versionados, ...preparados])];
}

test('los detectores encuentran cada dato escrito de varias formas (control de la propia prueba)', () => {
  const d = datos;
  const tel = d.telefono.valor.replace(/\D/g, '').slice(2);
  const [e, c] = d.menuDiario.valor.precio.toFixed(2).split('.');
  const franja = Object.values(d.horario.valor).find((v) => /\d/.test(v));
  // Los ejemplos se montan por partes para que este archivo no contenga ningún dato reconocible: así la prueba
  // de abajo, que también lo revisa a él, no se señala a sí misma.
  const euro = '€';
  const ejemplos = [
    `Llámanos al ${tel.slice(0, 3)} ${tel.slice(3, 5)} ${tel.slice(5, 7)} ${tel.slice(7)}`,
    `Llámanos al ${tel.slice(0, 3)}.${tel.slice(3, 6)}.${tel.slice(6)}`,
    ['<a href="tel', ':+34600000000">'].join(''),
    `Menú: ${e},${c} ${euro}`,
    `Menu: ${euro}${e}.${c}`,
    `Precio ${9},${50} ${euro}`,
    `Abrimos de ${franja}`,
    `Abrimos de ${franja.replace('–', ' a ')}`,
    d.direccion.valor,
    d.placeId.valor,
  ];
  const lista = detectores(d);
  for (const ejemplo of ejemplos) {
    assert.ok(lista.some(({ patron }) => patron.test(ejemplo)), `no se detecta: ${ejemplo}`);
  }
  for (const limpio of ['Sopa de cocido', 'versión 14.4.3', 'commit 6c1dbe27', 'a las 18:29:05']) {
    assert.ok(!lista.some(({ patron }) => patron.test(limpio)), `falso positivo: ${limpio}`);
  }
});

test(`ningún teléfono, precio ni horario escrito fuera de ${ARCHIVO_DATOS}`, () => {
  const lista = detectores(datos);
  const hallazgos = [];
  for (const ruta of archivosDelRepositorio()) {
    if (ruta === ARCHIVO_DATOS || BINARIOS.has(extname(ruta).toLowerCase())) continue;
    let contenido;
    try {
      if (statSync(join(RAIZ, ruta)).size > MAX_BYTES) continue;
      contenido = readFileSync(join(RAIZ, ruta), 'utf8');
    } catch {
      continue; // borrado en la copia de trabajo
    }
    contenido.split(/\r?\n/).forEach((linea, i) => {
      for (const { dato, patron } of lista) if (patron.test(linea)) hallazgos.push(`${ruta}:${i + 1}: ${dato}`);
    });
  }
  assert.deepEqual(hallazgos, [], `Datos del local fuera de ${ARCHIVO_DATOS}:\n${hallazgos.join('\n')}`);
});
