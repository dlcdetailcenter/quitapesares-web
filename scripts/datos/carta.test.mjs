// Pruebas de la lectura de la hoja de la carta (src/lib/carta/hoja.ts). Node quita los tipos al importar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { agrupar, esCarta, fusionar, leerHoja, parsearCsv } from '../../src/lib/carta/hoja.ts';

const PLANTILLA = readFileSync(new URL('../../docs/carta/plantilla-hoja-carta.csv', import.meta.url), 'utf8');
const CABECERA = '"id","categoria","nombre_es","nombre_en","disponible","orden"';
const AHORA = new Date('2026-11-02T18:00:00Z');
const DESPUES = new Date('2026-11-02T18:01:00Z');

/** Hoja con el formato de gviz: todo entre comillas y filas vacías con la casilla a FALSE. */
function hoja(...filas) {
  const vacias = Array.from({ length: 5 }, () => '"","","","","FALSE",""');
  return [CABECERA, ...filas, ...vacias].join('\n');
}
const fila = (id, categoria, es, en, disponible, orden) =>
  [id, categoria, es, en, disponible, orden].map((c) => `"${String(c).replaceAll('"', '""')}"`).join(',');

test('la plantilla de docs/carta se lee entera: 23 platos válidos y sin nombre en inglés', () => {
  const lectura = leerHoja(PLANTILLA);
  assert.equal(lectura.legible, true);
  assert.equal(lectura.platos.length, 23);
  assert.deepEqual(lectura.rechazadas, []);
  assert.equal(lectura.sinIngles.length, 23);
});

test('formato gviz: las filas vacías con la casilla a FALSE se ignoran sin registrarlas', () => {
  const lectura = leerHoja(hoja(fila('sopa-de-cocido', 'Primeros', 'Sopa de cocido', 'Stew soup', 'TRUE', 1)));
  assert.equal(lectura.platos.length, 1);
  assert.deepEqual(lectura.rechazadas, []);
  assert.deepEqual(lectura.sinIngles, []);
});

test('CSV: comas, comillas y saltos de línea dentro de una celda', () => {
  assert.deepEqual(parsearCsv('a,"b,c","d ""e""","f\ng"\r\nh,,i'), [
    ['a', 'b,c', 'd "e"', 'f\ng'],
    ['h', '', 'i'],
  ]);
});

test('una fila rota no tumba la carta: ese plato conserva su última versión válida y el resto se actualiza', () => {
  const antes = fusionar(
    null,
    leerHoja(hoja(fila('sopa-de-cocido', 'Primeros', 'Sopa de cocido', 'Stew soup', 'TRUE', 1), fila('mero-a-la-plancha', 'Segundos · Pescados', 'Mero a la plancha', 'Grilled grouper', 'TRUE', 1))),
    AHORA,
  ).carta;

  // La sopa llega con una categoría que no existe (escrita por la API, que se salta la validación de la hoja);
  // el mero se agota.
  const lectura = leerHoja(hoja(fila('sopa-de-cocido', 'Bebidas', 'Sopa de cocido', 'Stew soup', 'FALSE', 1), fila('mero-a-la-plancha', 'Segundos · Pescados', 'Mero a la plancha', 'Grilled grouper', 'FALSE', 1)));
  assert.equal(lectura.rechazadas.length, 1);
  assert.equal(lectura.rechazadas[0].id, 'sopa-de-cocido');
  assert.equal(lectura.rechazadas[0].fila, 2);
  assert.match(lectura.rechazadas[0].motivo, /categoría desconocida/);

  const { carta, cambio } = fusionar(antes, lectura, DESPUES);
  assert.equal(cambio, true);
  const porId = Object.fromEntries(carta.platos.map((p) => [p.id, p]));
  assert.deepEqual(porId['sopa-de-cocido'], antes.platos.find((p) => p.id === 'sopa-de-cocido'));
  assert.equal(porId['mero-a-la-plancha'].disponible, false);
});

test('una fila rota de un plato nuevo no aparece', () => {
  const lectura = leerHoja(hoja(fila('plato-nuevo', 'Primeros', '', 'New', 'TRUE', 1)));
  assert.equal(lectura.platos.length, 0);
  assert.equal(lectura.rechazadas.length, 1);
  assert.equal(fusionar(null, lectura, AHORA).carta?.platos.length ?? 0, 0);
});

test('cada tipo de fila rota se rechaza con su motivo', () => {
  const casos = [
    [fila('Sopa de Cocido', 'Primeros', 'Sopa', '', 'TRUE', 1), /id/],
    [fila('sopa', 'Primeros', 'Sopa', '', 'sí', 1), /disponible/],
    [fila('sopa', 'Primeros', 'Sopa', '', 'TRUE', 0), /orden/],
    [fila('sopa', 'Primeros', 'Sopa', '', 'TRUE', '1.5'), /orden/],
    [fila('sopa', 'Primeros', 'x'.repeat(121), '', 'TRUE', 1), /120/],
    [fila('sopa', 'Primeros', 'Sopa\u0007', '', 'TRUE', 1), /control/],
    ['"sopa","Primeros","Sopa","","TRUE"', /columnas/],
  ];
  for (const [linea, motivo] of casos) {
    const { platos, rechazadas } = leerHoja(hoja(linea));
    assert.equal(platos.length, 0, linea);
    assert.match(rechazadas[0].motivo, motivo, linea);
  }
});

test('id repetido: vale la primera fila y la segunda queda registrada', () => {
  const lectura = leerHoja(hoja(fila('sopa', 'Primeros', 'Sopa 1', '', 'TRUE', 1), fila('sopa', 'Primeros', 'Sopa 2', '', 'TRUE', 2)));
  assert.equal(lectura.platos.length, 1);
  assert.equal(lectura.platos[0].nombre_es, 'Sopa 1');
  assert.match(lectura.rechazadas[0].motivo, /repetido/);
});

test('hoja vacía, caída o que no es la carta: se conserva la última versión válida entera', () => {
  const anterior = fusionar(null, leerHoja(PLANTILLA), AHORA).carta;
  for (const texto of ['', CABECERA, hoja(), '<!doctype html><html>Iniciar sesión</html>', '"a","b"\n"1","2"']) {
    const lectura = leerHoja(texto);
    assert.equal(lectura.legible, false, JSON.stringify(texto.slice(0, 30)));
    const { carta, cambio } = fusionar(anterior, lectura, DESPUES);
    assert.equal(carta, anterior);
    assert.equal(cambio, false);
  }
  // Sin ninguna versión anterior no hay carta: la página muestra «Llámanos».
  assert.equal(fusionar(null, leerHoja(''), AHORA).carta, null);
});

test('si nada cambia, no hay que escribir en KV', () => {
  const primera = fusionar(null, leerHoja(PLANTILLA), AHORA);
  assert.equal(primera.cambio, true);
  const segunda = fusionar(primera.carta, leerHoja(PLANTILLA), DESPUES);
  assert.equal(segunda.cambio, false);
  assert.equal(segunda.carta, primera.carta);
});

test('nombre_en vacío: el plato sale en español y no en inglés, y queda registrado', () => {
  const lectura = leerHoja(hoja(fila('sopa-de-cocido', 'Primeros', 'Sopa de cocido', '', 'TRUE', 1), fila('ensalada-mixta', 'Primeros', 'Ensalada mixta', 'Mixed salad', 'TRUE', 2)));
  assert.deepEqual(lectura.sinIngles, ['sopa-de-cocido']);
  const carta = fusionar(null, lectura, AHORA).carta;
  assert.deepEqual(agrupar(carta, 'es')[0].platos.map((p) => p.nombre), ['Sopa de cocido', 'Ensalada mixta']);
  assert.deepEqual(agrupar(carta, 'en')[0].platos.map((p) => p.nombre), ['Mixed salad']);
});

test('agrupar: orden de categorías fijo, sin categorías vacías y platos por su orden', () => {
  const carta = fusionar(null, leerHoja(PLANTILLA), AHORA).carta;
  const grupos = agrupar(carta, 'es');
  assert.deepEqual(grupos.map((g) => g.categoria), ['Primeros', 'Segundos · Carnes y pollo', 'Segundos · Pescados']);
  assert.equal(grupos[0].platos[0].id, 'sopa-de-cocido');
  assert.ok(grupos.every((g) => g.platos.every((p) => p.nombre.trim() !== '')));
  // Hoy ningún plato tiene nombre en inglés: la carta en inglés sale vacía.
  assert.deepEqual(agrupar(carta, 'en'), []);
});

test('esCarta: solo acepta lo que escribe la tarea programada', () => {
  const carta = fusionar(null, leerHoja(PLANTILLA), AHORA).carta;
  assert.equal(esCarta(JSON.parse(JSON.stringify(carta))), true);
  assert.equal(esCarta(null), false);
  assert.equal(esCarta({ version: 2, actualizada: '', platos: [] }), false);
  assert.equal(esCarta({ ...carta, platos: [{ ...carta.platos[0], categoria: 'Bebidas' }] }), false);
  assert.equal(esCarta({ ...carta, platos: [{ ...carta.platos[0], disponible: 'TRUE' }] }), false);
});
