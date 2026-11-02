// Los textos de la interfaz existen en los dos idiomas y ninguno está vacío (src/i18n/textos.ts).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CATEGORIAS } from '../../src/lib/carta/hoja.ts';
import { CATEGORIAS_TRADUCIDAS, DIAS, NOMBRES_DIAS, PALABRAS_DATOS_EN, TEXTOS } from '../../src/i18n/textos.ts';

const datos = JSON.parse(readFileSync(new URL('../../src/data/restaurante.json', import.meta.url), 'utf8'));
const lleno = (texto) => typeof texto === 'string' && texto.trim() !== '';

test('mismas claves de interfaz en español e inglés, y ningún texto vacío', () => {
  assert.deepEqual(Object.keys(TEXTOS.en).sort(), Object.keys(TEXTOS.es).sort());
  for (const idioma of ['es', 'en']) {
    for (const [clave, texto] of Object.entries(TEXTOS[idioma])) assert.ok(lleno(texto), `${idioma}.${clave} vacío`);
  }
});

test('ningún texto en inglés es una copia del español', () => {
  const iguales = Object.keys(TEXTOS.es).filter((clave) => TEXTOS.es[clave] === TEXTOS.en[clave]);
  assert.deepEqual(iguales, []);
});

test('cada categoría de la hoja tiene nombre en los dos idiomas', () => {
  for (const idioma of ['es', 'en']) {
    for (const categoria of CATEGORIAS) assert.ok(lleno(CATEGORIAS_TRADUCIDAS[idioma][categoria]), `${idioma}: ${categoria}`);
  }
});

test('cada día del horario de restaurante.json tiene nombre en los dos idiomas', () => {
  assert.deepEqual(Object.keys(datos.horario.valor), [...DIAS]);
  for (const idioma of ['es', 'en']) for (const dia of DIAS) assert.ok(lleno(NOMBRES_DIAS[idioma][dia]));
});

test('las palabras de restaurante.json que se muestran tienen traducción al inglés', () => {
  const palabras = [...datos.menuDiario.valor.incluye, ...Object.values(datos.horario.valor).filter((v) => !/\d/.test(v))];
  for (const palabra of palabras) assert.ok(lleno(PALABRAS_DATOS_EN[palabra]), `sin traducción: "${palabra}"`);
});
