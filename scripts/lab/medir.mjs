// Prueba técnica de F2: mide los dos métodos de /lab/scroll con Playwright.
// Por cada método y motor: 3 ejecuciones a 390 px con un scroll programado de 10 s. En Chromium con la CPU 4 veces
// más lenta y 4G simulado (los valores de «4G lento» de Lighthouse aplicados a la red: 562,5 ms de latencia,
// 1474,56 kbit/s de bajada y 675 kbit/s de subida). En WebKit Playwright no puede limitar la CPU ni la red.
//
// Qué se mide:
//   - intervalo entre fotogramas: tiempo entre dos fotogramas NUEVOS listos para la pantalla mientras el
//     fotograma objetivo cambia. El scroll recorre el tramo 4 veces en 10 s (ida, vuelta, ida, vuelta) a
//     velocidad constante: el objetivo cambia más deprisa que la pantalla (≈ 28 ms por fotograma), así que un
//     método que va al día da intervalos de 17 a 33 ms y uno que se atasca, intervalos largos;
//   - bytes descargados del material;
//   - tiempo hasta el primer fotograma, desde el inicio de la navegación.
//
// Uso: npm run build && node scripts/lab/medir.mjs [chromium|webkit|todos] [salida.json]
//      (arranca `astro preview` en PUERTO_PRUEBAS o 4321 si no hay nada escuchando allí)
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { chromium, webkit } from '@playwright/test';

const PUERTO = Number(process.env.PUERTO_PRUEBAS ?? 4321);
const BASE = `http://localhost:${PUERTO}`;
const motores = (process.argv[2] ?? 'todos') === 'todos' ? ['chromium', 'webkit'] : [process.argv[2]];
const salida = process.argv[3];
const EJECUCIONES = 3;
const DURACION = 10_000;
const PASADAS = 4;

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
    stdio: 'ignore',
    detached: true,
  });
  for (let i = 0; i < 120 && !(await servidorListo()); i++) await new Promise((r) => setTimeout(r, 1000));
}

function percentil(valores, p) {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.floor((p / 100) * orden.length))];
}

function mediana(valores) {
  return percentil(valores, 50);
}

async function medirUna(navegador, motor, metodo) {
  const contexto = await navegador.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: motor === 'chromium',
    hasTouch: true,
  });
  const pagina = await contexto.newPage();
  if (motor === 'chromium') {
    const cdp = await contexto.newCDPSession(pagina);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 562.5,
      downloadThroughput: (1474.56 * 1024) / 8,
      uploadThroughput: (675 * 1024) / 8,
    });
  }
  await pagina.goto(`${BASE}/lab/scroll?metodo=${metodo}`, { waitUntil: 'load', timeout: 120_000 });
  await pagina.waitForFunction(() => window.__lab?.listo || window.__lab?.error, null, { timeout: 120_000 });
  const error = await pagina.evaluate(() => window.__lab.error);
  if (error) {
    await contexto.close();
    return { error };
  }
  // Scroll programado: triángulo a velocidad constante, PASADAS recorridos completos de la zona en DURACION ms.
  const r = await pagina.evaluate(
    async ({ duracion, pasadas }) => {
      const zona = document.querySelector('[data-lab-zona]');
      const arriba = zona.getBoundingClientRect().top + scrollY;
      const recorrido = zona.offsetHeight - innerHeight;
      scrollTo(0, arriba);
      await new Promise((ok) => setTimeout(ok, 500));
      const desde = performance.now();
      await new Promise((ok) => {
        const paso = (ahora) => {
          const t = Math.min(1, (ahora - desde) / duracion);
          const fase = (t * pasadas) % 2;
          const x = fase <= 1 ? fase : 2 - fase;
          scrollTo(0, arriba + x * recorrido);
          if (t < 1) requestAnimationFrame(paso);
          else ok();
        };
        requestAnimationFrame(paso);
      });
      const hasta = performance.now();
      const pintados = window.__lab.pintados.filter((p) => p.instante >= desde && p.instante <= hasta);
      const recursos = performance.getEntriesByType('resource').filter((e) => e.name.includes('/recorrido/lab/'));
      return {
        pintados,
        primerFotograma: window.__lab.primerFotograma,
        bytesMaterial: window.__lab.bytes,
        bytesTransferidos: recursos.reduce((t, e) => t + (e.transferSize || e.encodedBodySize || 0), 0),
      };
    },
    { duracion: DURACION, pasadas: PASADAS },
  );
  await contexto.close();
  const nuevos = r.pintados.filter((p, i, a) => i === 0 || p.indice !== a[i - 1].indice);
  const intervalos = nuevos.slice(1).map((p, i) => p.instante - nuevos[i].instante);
  return {
    fotogramasNuevos: nuevos.length,
    p50: percentil(intervalos, 50),
    p95: percentil(intervalos, 95),
    maximo: Math.max(...intervalos),
    primerFotograma: r.primerFotograma,
    bytesMaterial: r.bytesMaterial,
    bytesTransferidos: r.bytesTransferidos,
  };
}

const resultados = [];
try {
  for (const motor of motores) {
    const tipo = motor === 'chromium' ? chromium : webkit;
    let navegador;
    try {
      // CHROMIUM_PATH: otro Chromium si el de la versión de Playwright del proyecto no está instalado.
      const ruta = motor === 'chromium' ? process.env.CHROMIUM_PATH : undefined;
      navegador = await tipo.launch(ruta ? { executablePath: ruta } : {});
    } catch (e) {
      resultados.push({ motor, error: `no se puede abrir ${motor}: ${String(e).split('\n')[0]}` });
      console.log(motor, 'no se puede abrir');
      continue;
    }
    for (const metodo of ['canvas', 'video']) {
      const ejecuciones = [];
      for (let i = 0; i < EJECUCIONES; i++) ejecuciones.push(await medirUna(navegador, motor, metodo));
      const validas = ejecuciones.filter((e) => !e.error);
      const resumen = validas.length
        ? {
            p50: mediana(validas.map((e) => e.p50)),
            p95: mediana(validas.map((e) => e.p95)),
            maximo: mediana(validas.map((e) => e.maximo)),
            primerFotograma: mediana(validas.map((e) => e.primerFotograma)),
            bytesMaterial: mediana(validas.map((e) => e.bytesMaterial)),
          }
        : null;
      resultados.push({ motor, metodo, resumen, ejecuciones });
      console.log(motor, metodo, JSON.stringify(resumen ?? ejecuciones[0]));
    }
    await navegador.close();
  }
} finally {
  if (servidor) process.kill(-servidor.pid);
}
if (salida) writeFileSync(salida, `${JSON.stringify({ fecha: new Date().toISOString(), resultados }, null, 2)}\n`);
