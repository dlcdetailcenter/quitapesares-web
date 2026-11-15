// Mide el recorrido de la portada tal como se sirve: el intervalo entre fotogramas NUEVOS pintados en el lienzo
// mientras se baja con el scroll, zona a zona. Es la medición del recorrido de verdad; `lab:medir` mide la página de
// prueba /lab/scroll, que no usa estas piezas.
//
// Cómo: se baja de arriba abajo del recorrido a velocidad constante, lo bastante deprisa para que el fotograma que
// toca cambie más rápido que la pantalla (unos 25 ms por fotograma). Se anota cada pintado del lienzo cuyo fotograma
// es distinto del pintado anterior (lo que va encima, nubes o barrido, no cuenta como fotograma) y se mira el tiempo
// entre dos seguidos, solo donde los fotogramas avanzan: las pausas de cada pieza (su «ritmo» en recorrido.json), los
// intervalos que cruzan una pausa y el aire no cuentan. Un recorrido que va al día da de 17 a 33 ms; uno que se
// atasca, intervalos largos.
//
// En Chromium se puede limitar la CPU (CPU=4). En WebKit, Playwright no puede limitar ni la CPU ni la red.
//
// Uso: npm run build && node scripts/lab/medir-recorrido.mjs [chromium|webkit|todos] [salida.json]
//      LAB_BASE=https://… para medir otra dirección (la demo); PUERTO_PRUEBAS para otro puerto local.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium, webkit } from '@playwright/test';

const PUERTO = Number(process.env.PUERTO_PRUEBAS ?? 4321);
const BASE = process.env.LAB_BASE ?? `http://localhost:${PUERTO}`;
const CPU = Number(process.env.CPU ?? 1);
const motores = (process.argv[2] ?? 'todos') === 'todos' ? ['chromium', 'webkit'] : [process.argv[2]];
const salida = process.argv[3];
const EJECUCIONES = 3;
/** Milisegundos por pantalla de scroll: con ~30 fotogramas por pieza, el que toca cambia cada ~25 ms. */
const MS_POR_PANTALLA = 1100;
const VENTANA = { width: 390, height: 844 };

async function servidorListo() {
  try {
    return (await fetch(BASE)).ok;
  } catch {
    return false;
  }
}

let servidor = null;
if (!(await servidorListo())) {
  servidor = spawn('npm', ['run', 'preview', '--', '--port', String(PUERTO)], {
    env: { ...process.env, ASTRO_PREVIEW_BACKGROUND: '0' },
    shell: process.platform === 'win32',
    stdio: 'ignore',
  });
  for (let i = 0; i < 120 && !(await servidorListo()); i++) await new Promise((ok) => setTimeout(ok, 500));
  if (!(await servidorListo())) throw new Error(`no responde ${BASE}`);
}

const percentil = (valores, p) => {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, b) => a - b);
  return Number(orden[Math.min(orden.length - 1, Math.ceil((p / 100) * orden.length) - 1)].toFixed(1));
};

/** Lo mismo que hace cliente.ts con el «ritmo» de un tramo. */
function avance(ritmo, t) {
  if (!ritmo || ritmo.length === 0) return t;
  let [t0, f0] = [0, 0];
  for (const [t1, f1] of ritmo) {
    if (t <= t1) return t1 > t0 ? f0 + ((f1 - f0) * (t - t0)) / (t1 - t0) : f1;
    [t0, f0] = [t1, f1];
  }
  return f0;
}

async function medir(motor) {
  const navegador = await { chromium, webkit }[motor].launch();
  const ejecuciones = [];
  for (let n = 0; n < EJECUCIONES; n++) {
    const contexto = await navegador.newContext({ viewport: VENTANA, isMobile: motor === 'chromium', hasTouch: true });
    const page = await contexto.newPage();
    if (motor === 'chromium' && CPU > 1) {
      const cdp = await contexto.newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
    }
    // Cada pintado del lienzo con un fotograma distinto del pintado anterior, con su instante. Un pintado son todas
    // las llamadas a drawImage seguidas, sin ceder el hilo; su fotograma es lo primero que se dibuja (después van las
    // nubes o el barrido, que no son fotogramas).
    await page.addInitScript(() => {
      const pintados = [];
      const original = CanvasRenderingContext2D.prototype.drawImage;
      let anterior = null;
      let enPintado = false;
      CanvasRenderingContext2D.prototype.drawImage = function (fuente, ...resto) {
        if (!enPintado) {
          enPintado = true;
          queueMicrotask(() => (enPintado = false));
          if (fuente !== anterior) {
            anterior = fuente;
            pintados.push(performance.now());
          }
        }
        return original.call(this, fuente, ...resto);
      };
      window.__pintados = pintados;
    });
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.classList.contains('recorrido-activo'), null, { timeout: 10_000 });
    const config = await (await page.request.get(`${BASE}/recorrido/recorrido.json`)).json();
    // Un primer paseo lento para descargar todo el material: aquí se mide el pintado, no la red.
    const pantallas = config.aire.pantallas + config.tramos.reduce((a, t) => a + t.pantallas, 0);
    for (let s = 0; s <= pantallas; s += 0.1) {
      await page.evaluate(([y]) => scrollTo(0, y), [s * VENTANA.height]);
      await page.waitForTimeout(150);
    }
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(800);
    // La bajada que se mide: velocidad constante, con el reloj de la página.
    const { inicio, fin } = await page.evaluate(
      ([distancia, duracion]) =>
        new Promise((ok) => {
          window.__pintados.length = 0;
          const inicio = performance.now();
          const paso = (ahora) => {
            const k = Math.min(1, (ahora - inicio) / duracion);
            scrollTo(0, k * distancia);
            if (k < 1) requestAnimationFrame(paso);
            else ok({ inicio, fin: ahora });
          };
          requestAnimationFrame(paso);
        }),
      [pantallas * VENTANA.height, pantallas * MS_POR_PANTALLA],
    );
    const pintados = await page.evaluate(() => window.__pintados);
    await contexto.close();

    // Zona y movimiento en cada instante: solo cuentan los intervalos en los que los fotogramas avanzan.
    const enMovimiento = (instante) => {
      const pantalla = ((instante - inicio) / (fin - inicio)) * pantallas;
      let desde = config.aire.pantallas;
      if (pantalla < desde) return null;
      for (const t of config.tramos) {
        if (pantalla <= desde + t.pantallas) {
          const local = (pantalla - desde) / t.pantallas;
          const d = 0.01;
          return avance(t.ritmo, Math.min(1, local + d)) > avance(t.ritmo, Math.max(0, local - d)) ? t.id : null;
        }
        desde += t.pantallas;
      }
      return null;
    };
    // El intervalo cuenta si los fotogramas avanzan en la misma zona en sus dos extremos y en los puntos intermedios
    // (si no, cruza una pausa y mide la pausa, no el pintado).
    const porZona = {};
    for (let i = 1; i < pintados.length; i++) {
      const [a, b] = [pintados[i - 1], pintados[i]];
      const zonas = [0, 0.25, 0.5, 0.75, 1].map((k) => enMovimiento(a + (b - a) * k));
      if (zonas[0] && zonas.every((z) => z === zonas[0])) (porZona[zonas[0]] ??= []).push(b - a);
    }
    const todos = Object.values(porZona).flat();
    ejecuciones.push({
      fotogramas: todos.length + Object.keys(porZona).length,
      p50: percentil(todos, 50),
      p95: percentil(todos, 95),
      maximo: percentil(todos, 100),
      zonas: Object.fromEntries(Object.entries(porZona).map(([zona, v]) => [zona, { fotogramas: v.length + 1, p50: percentil(v, 50), p95: percentil(v, 95), maximo: percentil(v, 100) }])),
    });
  }
  await navegador.close();
  return { motor, cpu: motor === 'chromium' ? CPU : 1, base: BASE, msPorPantalla: MS_POR_PANTALLA, ejecuciones, p95Peor: Math.max(...ejecuciones.map((e) => e.p95 ?? 0)) };
}

const resultados = [];
for (const motor of motores) {
  const r = await medir(motor);
  resultados.push(r);
  console.log(`${motor}${r.cpu > 1 ? ` (CPU ${r.cpu}x)` : ''} · ${BASE}`);
  r.ejecuciones.forEach((e, i) => {
    const zonas = Object.entries(e.zonas).map(([zona, z]) => `${zona} p95 ${z.p95} ms (${z.fotogramas})`).join(' · ');
    console.log(`  ${i + 1}: p50 ${e.p50} ms · p95 ${e.p95} ms · máx. ${e.maximo} ms · ${e.fotogramas} fotogramas · ${zonas}`);
  });
  console.log(`  peor p95: ${r.p95Peor} ms`);
}
if (salida) writeFileSync(salida, `${JSON.stringify({ fecha: new Date().toISOString(), resultados }, null, 2)}\n`);
servidor?.kill();
