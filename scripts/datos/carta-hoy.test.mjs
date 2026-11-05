// Pruebas de «Platos de hoy» (src/lib/carta/hoy.ts), con KV y hoja falsos. Lo que pasa en la página cuando la ruta
// falla (solo queda «Ver carta») se prueba en tests/recorrido.spec.ts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { actualizarCarta, CLAVE_KV } from '../../src/lib/carta/fuente.ts';
import { fusionar, leerHoja } from '../../src/lib/carta/hoja.ts';
import { platosDeHoy, platosParaMostrar } from '../../src/lib/carta/hoy.ts';

const PLANTILLA = readFileSync(new URL('../../docs/carta/plantilla-hoja-carta.csv', import.meta.url), 'utf8');
const URL_HOJA = 'https://docs.google.com/spreadsheets/d/prueba/gviz/tq?tqx=out:csv&gid=1';
const DEMO = new URL('https://demo.workers.dev/recorrido/hoy');
const AHORA = new Date('2026-11-05T12:00:00Z');
const carta = fusionar(null, leerHoja(PLANTILLA), AHORA).carta;
const silencio = { info() {}, warn() {}, error() {} };

function kvFalso(inicial = null) {
  const datos = new Map(inicial ? [[CLAVE_KV, JSON.stringify(inicial)]] : []);
  return {
    async get(clave) {
      return datos.has(clave) ? JSON.parse(datos.get(clave)) : null;
    },
    async put(clave, valor) {
      datos.set(clave, valor);
    },
  };
}

test('platos de hoy: hasta 4, repartidos entre categorías y solo los disponibles', () => {
  const platos = platosDeHoy(carta, 'es');
  assert.equal(platos.length, 4);
  assert.equal(new Set(platos).size, 4);
  const categorias = new Set(platos.map((nombre) => carta.platos.find((p) => p.nombre_es === nombre).categoria));
  assert.ok(categorias.size >= 3, `solo ${categorias.size} categorías`);

  const primero = platos[0];
  const conAgotado = { ...carta, platos: carta.platos.map((p) => (p.nombre_es === primero ? { ...p, disponible: false } : p)) };
  assert.ok(!platosDeHoy(conAgotado, 'es').includes(primero));
});

test('platos de hoy: sin carta o sin nombres en inglés no hay lista', () => {
  assert.deepEqual(platosDeHoy(null, 'es'), []);
  assert.deepEqual(platosDeHoy(carta, 'en'), []);
});

test('con la hoja rota, la ruta sigue dando la última versión válida', async () => {
  const kv = kvFalso(carta);
  const hojaRota = async () => new Response('<html>acceso denegado</html>', { status: 403 });
  const { resultado } = await actualizarCarta({ CARTA: kv, URL_HOJA }, AHORA, hojaRota, silencio);
  assert.equal(resultado.estado, 'hoja-no-disponible');

  const conKv = await platosParaMostrar({ CARTA: kv, URL_HOJA }, DEMO, '', () => assert.fail('no debe leer la hoja'), 'es');
  assert.deepEqual(conKv, platosDeHoy(carta, 'es'));
  assert.equal(conKv.length, 4);
});

test('con KV vacío y sin hoja no hay platos: la página se queda con «Ver carta»', async () => {
  const original = console.error;
  console.error = () => {};
  try {
    assert.deepEqual(await platosParaMostrar({ CARTA: kvFalso() }, DEMO, PLANTILLA, () => {}, 'es'), []);
  } finally {
    console.error = original;
  }
});
