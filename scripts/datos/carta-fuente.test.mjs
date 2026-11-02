// Pruebas de la tarea programada y de la carta que ve /carta (src/lib/carta/fuente.ts), con KV y fetch falsos.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { actualizarCarta, cartaParaMostrar, CLAVE_KV } from '../../src/lib/carta/fuente.ts';

const PLANTILLA = readFileSync(new URL('../../docs/carta/plantilla-hoja-carta.csv', import.meta.url), 'utf8');
const URL_HOJA = 'https://docs.google.com/spreadsheets/d/prueba/gviz/tq?tqx=out:csv&gid=1';
const AHORA = new Date('2026-11-02T18:00:00Z');

function kvFalso(inicial = null) {
  const datos = new Map(inicial ? [[CLAVE_KV, JSON.stringify(inicial)]] : []);
  return {
    escrituras: 0,
    async get(clave, tipo) {
      assert.equal(tipo, 'json');
      return datos.has(clave) ? JSON.parse(datos.get(clave)) : null;
    },
    async put(clave, valor) {
      this.escrituras++;
      datos.set(clave, valor);
    },
  };
}
function registroFalso() {
  const lineas = [];
  const anotar = (nivel) => (texto) => lineas.push({ nivel, ...JSON.parse(texto) });
  return { lineas, info: anotar('info'), warn: anotar('warn'), error: anotar('error') };
}
const responde = (texto, status = 200) => async (url, opciones) => {
  assert.equal(url, URL_HOJA);
  assert.equal(opciones.cache, 'no-store');
  return new Response(texto, { status });
};
const falla = async () => {
  throw new TypeError('fetch failed');
};

test('la primera lectura guarda la carta en KV', async () => {
  const kv = kvFalso();
  const registro = registroFalso();
  const { resultado, carta } = await actualizarCarta({ CARTA: kv, URL_HOJA }, AHORA, responde(PLANTILLA), registro);
  assert.equal(resultado.estado, 'actualizada');
  assert.equal(carta.platos.length, 23);
  assert.equal(kv.escrituras, 1);
  assert.ok(registro.lineas.some((l) => l.carta === 'sin-nombre-en' && l.platos.length === 23));
});

test('sin cambios en la hoja no se escribe en KV', async () => {
  const kv = kvFalso();
  await actualizarCarta({ CARTA: kv, URL_HOJA }, AHORA, responde(PLANTILLA), registroFalso());
  const { resultado } = await actualizarCarta({ CARTA: kv, URL_HOJA }, AHORA, responde(PLANTILLA), registroFalso());
  assert.equal(resultado.estado, 'sin-cambios');
  assert.equal(kv.escrituras, 1);
});

test('una fila rota no tumba la carta: se sirve la última versión válida de ese plato y queda registrado', async () => {
  const kv = kvFalso();
  const anterior = (await actualizarCarta({ CARTA: kv, URL_HOJA }, AHORA, responde(PLANTILLA), registroFalso())).carta;
  const rota = PLANTILLA.replace('sopa-de-cocido,Primeros,Sopa de cocido,,TRUE,1', 'sopa-de-cocido,Bebidas,Sopa de cocido,,FALSE,1').replace(
    'mero-a-la-plancha,Segundos · Pescados,Mero a la plancha,,TRUE,4',
    'mero-a-la-plancha,Segundos · Pescados,Mero a la plancha,,FALSE,4',
  );
  assert.notEqual(rota, PLANTILLA);
  const registro = registroFalso();
  const { resultado, carta } = await actualizarCarta({ CARTA: kv, URL_HOJA }, AHORA, responde(rota), registro);
  assert.equal(resultado.estado, 'actualizada');
  assert.equal(resultado.rechazadas, 1);
  assert.equal(carta.platos.length, 23);
  assert.deepEqual(carta.platos.find((p) => p.id === 'sopa-de-cocido'), anterior.platos.find((p) => p.id === 'sopa-de-cocido'));
  assert.equal(carta.platos.find((p) => p.id === 'mero-a-la-plancha').disponible, false);
  const aviso = registro.lineas.find((l) => l.carta === 'fila-rechazada');
  assert.equal(aviso.nivel, 'warn');
  assert.equal(aviso.id, 'sopa-de-cocido');
  assert.match(aviso.motivo, /categoría desconocida "Bebidas"/);
});

test('hoja caída, redirigida a la página de acceso o con error: se sirve la última versión válida y queda registrado', async () => {
  for (const pedir of [falla, responde('', 302), responde('Error', 500), responde('<!doctype html><title>Acceso</title>')]) {
    const kv = kvFalso();
    const anterior = (await actualizarCarta({ CARTA: kv, URL_HOJA }, AHORA, responde(PLANTILLA), registroFalso())).carta;
    const registro = registroFalso();
    const { resultado, carta } = await actualizarCarta({ CARTA: kv, URL_HOJA }, AHORA, pedir, registro);
    assert.equal(resultado.estado, 'hoja-no-disponible');
    assert.deepEqual(carta, anterior);
    assert.equal(kv.escrituras, 1);
    const error = registro.lineas.find((l) => l.carta === 'hoja-no-disponible');
    assert.equal(error.seSirve, 'última versión válida');
  }
});

test('sin ninguna versión válida y con la hoja caída no hay carta (la página muestra Llámanos)', async () => {
  const registro = registroFalso();
  const { carta } = await actualizarCarta({ CARTA: kvFalso(), URL_HOJA }, AHORA, falla, registro);
  assert.equal(carta, null);
  assert.equal(registro.lineas[0].seSirve, 'nada (Llámanos)');
});

test('sin URL de la hoja, o con una que no es de Google Sheets, no se pide nada', async () => {
  for (const url of [undefined, '', 'https://ejemplo.com/hoja.csv']) {
    const registro = registroFalso();
    const { resultado } = await actualizarCarta({ CARTA: kvFalso(), URL_HOJA: url }, AHORA, falla, registro);
    assert.equal(resultado.estado, 'sin-url');
    assert.equal(registro.lineas[0].carta, 'sin-url');
  }
});

test('lo guardado en KV que no es una carta se ignora y queda registrado', async () => {
  const registro = registroFalso();
  const kv = kvFalso({ version: 1, actualizada: 'x', platos: [{ id: 'X' }] });
  const carta = await cartaParaMostrar({ CARTA: kv }, new URL('https://demo.workers.dev/carta'), PLANTILLA, () => {}, registro);
  assert.equal(carta, null);
  assert.ok(registro.lineas.some((l) => l.carta === 'kv-no-valido'));
});

test('/carta: la plantilla de prueba solo se usa en localhost y sin URL de la hoja', async () => {
  const local = await cartaParaMostrar({ CARTA: kvFalso() }, new URL('http://localhost:4321/carta'), PLANTILLA, () => {}, registroFalso());
  assert.equal(local.platos.length, 23);
  const desplegada = await cartaParaMostrar({ CARTA: kvFalso() }, new URL('https://demo.workers.dev/carta'), PLANTILLA, () => {}, registroFalso());
  assert.equal(desplegada, null);
});

test('/carta: con KV lleno se sirve KV sin pedir la hoja', async () => {
  const kv = kvFalso();
  const guardada = (await actualizarCarta({ CARTA: kv, URL_HOJA }, AHORA, responde(PLANTILLA), registroFalso())).carta;
  const carta = await cartaParaMostrar({ CARTA: kv, URL_HOJA }, new URL('https://demo.workers.dev/carta'), '', () => assert.fail('no debe leer la hoja'), registroFalso());
  assert.deepEqual(carta, guardada);
});
