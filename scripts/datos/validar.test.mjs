// Pruebas de la validación de datos (node --test). Sin dependencias.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validarDatos } from './validar.mjs';

const pendiente = {
  valor: 'dato de prueba',
  fuente: 'fuente de prueba',
  fechaConsulta: '2026-10-28',
  estado: 'NO VERIFICABLE AÚN',
  confirmadoPor: null,
};
const confirmado = {
  ...pendiente,
  estado: 'CONFIRMADO',
  confirmadoPor: { quien: 'persona de prueba', fecha: '2026-11-02' },
};

test('todo confirmado: sin errores ni pendientes', () => {
  assert.deepEqual(validarDatos({ a: confirmado, b: confirmado }), { errores: [], pendientes: [], total: 2 });
});

test('un dato sin CONFIRMADO queda pendiente, aunque esté VERIFICADO', () => {
  const { errores, pendientes } = validarDatos({ a: confirmado, b: pendiente, c: { ...pendiente, estado: 'VERIFICADO' } });
  assert.deepEqual(errores, []);
  assert.deepEqual(pendientes, ['b', 'c']);
});

test('CONFIRMADO sin quién o sin fecha válida es un error', () => {
  for (const confirmadoPor of [null, 'alguien', { quien: '' , fecha: '2026-11-02' }, { quien: 'x', fecha: '02/11/2026' }, { quien: 'x' }]) {
    const { errores } = validarDatos({ a: { ...confirmado, confirmadoPor } });
    assert.equal(errores.length, 1, JSON.stringify(confirmadoPor));
  }
});

test('confirmadoPor relleno sin estado CONFIRMADO es un error', () => {
  const { errores } = validarDatos({ a: { ...pendiente, confirmadoPor: { quien: 'x', fecha: '2026-11-02' } } });
  assert.equal(errores.length, 1);
});

test('estado desconocido, clave que falta o clave desconocida son errores', () => {
  assert.equal(validarDatos({ a: { ...pendiente, estado: 'confirmado' } }).errores.length, 1);
  const { fuente: _fuente, ...sinFuente } = pendiente;
  assert.equal(validarDatos({ a: sinFuente }).errores.length, 1);
  assert.equal(validarDatos({ a: { ...pendiente, precio: 1 } }).errores.length, 1);
});

test('fecha de consulta imposible es un error', () => {
  assert.equal(validarDatos({ a: { ...pendiente, fechaConsulta: '2026-02-30' } }).errores.length, 1);
});

test('el archivo real tiene una estructura válida', () => {
  const datos = JSON.parse(readFileSync(new URL('../../src/data/restaurante.json', import.meta.url), 'utf8'));
  assert.deepEqual(validarDatos(datos).errores, []);
});
