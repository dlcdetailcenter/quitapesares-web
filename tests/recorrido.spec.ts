// Recorrido de F2 sobre la portada, con el material SINTÉTICO (colores lisos) que genera scripts/media/preparar.mjs.
// Comprueba: barra «Ir a la carta» en 1 s y de un toque; versión estática con «reducir movimiento», Save-Data o red
// lenta, con las mismas funciones; el recorrido avanza con el scroll; solo una ventana de fotogramas en memoria;
// créditos de IA y atribución del PNOA cuando el material los lleva; noindex en las rutas nuevas; axe.
// El interruptor apagado (portada de F1) se prueba al compilar: scripts/media/interruptor.test.mjs.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const PORTADAS = [
  { ruta: '/', carta: '/carta', barra: 'Ir a la carta', botones: ['Llamar', 'Ver carta', 'Cómo llegar', 'Dejar reseña'] },
  { ruta: '/en/', carta: '/en/carta', barra: 'Go to the menu', botones: ['Call', 'See the menu', 'Directions', 'Write a review'] },
] as const;

async function estado(page: Page) {
  return page.evaluate(() => ({
    clases: document.documentElement.className,
    motivo: document.documentElement.dataset.estadoRecorrido ?? null,
  }));
}

/** Pide del material del recorrido (no la página): para comprobar que la versión estática no descarga nada. */
function peticionesDeMaterial(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (r) => {
    const { pathname } = new URL(r.url());
    if (pathname.startsWith('/recorrido/') && pathname !== '/recorrido/estado') urls.push(pathname);
  });
  return urls;
}

/** Lleva el scroll a un punto del recorrido, en pantallas desde el principio (la pista mide la suma de todas). */
async function irA(page: Page, pantalla: number) {
  await page.evaluate((p) => {
    const caja = (document.querySelector('[data-recorrido-pista]') as HTMLElement).getBoundingClientRect();
    const total = caja.height / innerHeight;
    const desplazable = caja.height - innerHeight;
    scrollTo(0, caja.top + scrollY + (p / total) * desplazable);
  }, pantalla);
  await page.waitForTimeout(200);
}

interface ParteRecorrido {
  nombre: string;
  inicio: number;
  pantallas: number;
  ia: boolean;
}

/**
 * Partes del recorrido tal como las monta cliente.ts, a partir del recorrido.json que se sirve: así las pruebas valen
 * con el material sintético (CI), con el real y con la maqueta. Tras el último tramo de cada zona con parada, su parada.
 */
async function partesDelRecorrido(page: Page): Promise<ParteRecorrido[]> {
  const config = (await (await page.request.get('/recorrido/recorrido.json')).json()) as {
    aire: { pantallas: number };
    tramos: { id: string; pantallas: number; zona?: string; ia?: string }[];
  };
  const partes: ParteRecorrido[] = [{ nombre: 'aire', inicio: 0, pantallas: config.aire.pantallas, ia: false }];
  let inicio = config.aire.pantallas;
  config.tramos.forEach((t, i) => {
    const zona = t.zona ?? t.id;
    partes.push({ nombre: t.id, inicio, pantallas: t.pantallas, ia: t.ia === 'local' });
    inicio += t.pantallas;
    const siguiente = config.tramos[i + 1];
    if ((zona === 'puerta' || zona === 'barra') && (!siguiente || (siguiente.zona ?? siguiente.id) !== zona)) {
      partes.push({ nombre: `parada-${zona}`, inicio, pantallas: 0.5, ia: t.ia === 'local' });
      inicio += 0.5;
    }
  });
  return partes;
}

/** Lleva el scroll a una parte del recorrido (por defecto, a su centro). */
async function irAParte(page: Page, nombre: string, fraccion = 0.5) {
  const parte = (await partesDelRecorrido(page)).find((p) => p.nombre === nombre);
  if (!parte) throw new Error(`no hay ninguna parte «${nombre}» en el recorrido`);
  await irA(page, parte.inicio + parte.pantallas * fraccion);
}

/** Objetivo táctil de 44 px como mínimo y con el foco visible. */
async function comprobarObjetivo(enlace: ReturnType<Page['locator']>) {
  const caja = await enlace.boundingBox();
  expect(caja?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
  await enlace.focus();
  const contorno = await enlace.evaluate((e) => getComputedStyle(e).outlineStyle);
  expect(contorno).not.toBe('none');
}

/** La portada de F1 entera: foto, nombre y los cuatro botones, más la pizarra y el horario. */
async function mismasFunciones(page: Page, botones: readonly string[]) {
  await expect(page.locator('picture img')).toBeVisible();
  await expect(page.locator('h1')).toBeVisible();
  // Los de la portada (las paradas del recorrido repiten algunos: aquí se miran los de la portada).
  for (const texto of botones) await expect(page.locator('.portada').getByRole('link', { name: texto, exact: true })).toBeVisible();
  // La pizarra lleva el menú del día con su precio: la misma información que la parada de la barra.
  await expect(page.locator('.pizarra')).toBeVisible();
  await expect(page.locator('.portada__horario dd')).toHaveCount(7);
}

for (const { ruta, carta, barra, botones } of PORTADAS) {
  test.describe(`Recorrido en ${ruta}`, () => {
    test('«Ir a la carta» visible en 1 s o menos y lleva a la carta de un toque', async ({ page }) => {
      await page.goto(ruta, { waitUntil: 'commit' });
      const enlace = page.getByRole('navigation', { name: /carta|menu/i }).getByRole('link', { name: barra });
      await expect(enlace).toBeVisible({ timeout: 1000 });
      await enlace.tap();
      await expect(page).toHaveURL(new RegExp(`${carta}$`));
    });

    test('se activa con el primer tramo y avanza con el scroll: aire, puerta, parada, barra, parada', async ({ page }) => {
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const seccion = page.locator('[data-recorrido]');
      await expect(seccion).toHaveAttribute('data-parte', 'aire');
      // Se va al centro de cada parte, en el orden del recorrido.json servido (sintético: aire, puerta, parada,
      // barra, parada; la maqueta tiene varias piezas en la zona de la puerta).
      const partes = await partesDelRecorrido(page);
      expect(partes.map((p) => p.nombre)).toEqual(expect.arrayContaining(['aire', 'parada-puerta', 'parada-barra']));
      const vistas: string[] = [];
      for (const p of partes) {
        await irA(page, p.inicio + p.pantallas / 2);
        vistas.push((await seccion.getAttribute('data-parte')) ?? '');
      }
      expect(vistas).toEqual(partes.map((p) => p.nombre));
      // Con el material sintético (CI), lo dice en los créditos.
      const { material } = (await (await page.request.get('/recorrido/recorrido.json')).json()) as { material: string };
      if (material === 'sintetico') await expect(page.locator('[data-recorrido-sintetico]')).toBeVisible();
      // Después del recorrido sigue la portada de F1.
      await mismasFunciones(page, botones);
    });

    test('rótulo del aire: el nombre completo del archivo de datos, con su espacio y en dos líneas', async ({ page }) => {
      const nombre: string = JSON.parse(readFileSync(new URL('../src/data/restaurante.json', import.meta.url), 'utf8')).nombre.valor;
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const rotulo = page.locator('[data-rotulo="aire"]');
      const normalizar = (s: string) => s.replace(/\s+/g, ' ').trim();
      // En el DOM y tal como se lee: «Restaurante Quitapesares», no «RestauranteQuitapesares».
      expect(normalizar((await rotulo.textContent()) ?? '')).toBe(nombre);
      expect(normalizar(await rotulo.innerText())).toBe(nombre);
      // Pintado: «Restaurante» en su propia línea, encima del nombre en gótica, no pegado a él en la misma línea.
      // (Las cajas se tocan unos píxeles porque la gótica, con line-height 1, sobresale de su línea; las letras no.)
      const [tipo, gotica] = await rotulo
        .locator('span')
        .evaluateAll((s) => s.map((e) => e.getBoundingClientRect()).map((r) => ({ arriba: r.top, abajo: r.bottom, mitad: r.top + r.height / 2 })));
      expect(tipo.arriba).toBeLessThan(gotica.arriba);
      expect(tipo.abajo).toBeLessThan(gotica.mitad);
    });

    test('longitud: ningún tramo pasa de 1 pantalla, cada parada 0,5 y a 390×844 la pista mide 5 ventanas como mucho', async ({ page }) => {
      // Encargo de la maqueta (2026-11-03): tramos ≤ 1 pantalla, paradas de 0,5, total ≤ 5 (antes eran unas 7).
      await page.setViewportSize({ width: 390, height: 844 });
      const config = (await (await page.request.get('/recorrido/recorrido.json')).json()) as { aire: { pantallas: number }; tramos: { pantallas: number }[] };
      expect(config.aire.pantallas).toBeLessThanOrEqual(1);
      for (const t of config.tramos) expect(t.pantallas).toBeLessThanOrEqual(1);
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const alto = await page.locator('[data-recorrido-pista]').evaluate((e) => e.getBoundingClientRect().height);
      const partes = await partesDelRecorrido(page);
      expect(partes.filter((p) => p.nombre.startsWith('parada-')).map((p) => p.pantallas)).toEqual([0.5, 0.5]);
      const pantallas = partes.reduce((a, p) => a + p.pantallas, 0);
      expect(alto).toBeCloseTo(pantallas * 844, 0);
      expect(alto).toBeLessThanOrEqual(5 * 844);
    });

    test('paradas: tras la puerta, Cómo llegar y Llamar; tras la barra, Ver carta y el menú del día con su precio', async ({ page }) => {
      const datos = JSON.parse(readFileSync(new URL('../src/data/restaurante.json', import.meta.url), 'utf8'));
      const telefono = `tel:${String(datos.telefono.valor).replace(/[^\d+]/g, '')}`;
      const precio = new Intl.NumberFormat(ruta === '/' ? 'es-ES' : 'en-GB', { style: 'currency', currency: 'EUR' }).format(datos.menuDiario.valor.precio);
      const [comoLlegar, llamar, verCarta, menu] = ruta === '/' ? ['Cómo llegar', 'Llamar', 'Ver carta', 'Menú del día'] : ['Directions', 'Call', 'See the menu', 'Set menu of the day'];
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const puerta = page.locator('[data-parada="puerta"]');
      const barra = page.locator('[data-parada="barra"]');
      // Fuera de su media pantalla no se ven ni se pueden enfocar (en el primer tramo, por ejemplo).
      await irAParte(page, (await partesDelRecorrido(page))[1].nombre);
      await expect(puerta).toBeHidden();
      await expect(barra).toBeHidden();

      await irAParte(page, 'parada-puerta');
      await expect(page.locator('[data-recorrido]')).toHaveAttribute('data-parte', 'parada-puerta');
      // Enlaces reales y accesibles (por su rol y su nombre, nada de aria-hidden).
      const enlaceLlegar = puerta.getByRole('link', { name: comoLlegar, exact: true });
      const enlaceLlamar = puerta.getByRole('link', { name: llamar, exact: true });
      await expect(enlaceLlegar).toBeVisible();
      await expect(enlaceLlegar).toHaveAttribute('href', new RegExp(`query_place_id=${datos.placeId.valor}`));
      await expect(enlaceLlamar).toHaveAttribute('href', telefono);
      await expect(barra).toBeHidden();
      for (const enlace of [enlaceLlegar, enlaceLlamar]) await comprobarObjetivo(enlace);

      await irAParte(page, 'parada-barra');
      await expect(page.locator('[data-recorrido]')).toHaveAttribute('data-parte', 'parada-barra');
      const enlaceCarta = barra.getByRole('link', { name: verCarta, exact: true });
      const enlaceMenu = barra.getByRole('link', { name: new RegExp(`^${menu}`) });
      await expect(enlaceCarta).toHaveAttribute('href', carta);
      await expect(enlaceMenu).toHaveAttribute('href', `${carta}#menu-del-dia`);
      // El precio sale del archivo de datos, con sus espacios: «Menú del día: <precio del JSON>».
      // (Intl pone un espacio duro antes de «€»: se normalizan los dos lados.)
      const normalizar = (s: string) => s.replace(/\s+/g, ' ').trim();
      expect(normalizar((await enlaceMenu.textContent()) ?? '')).toBe(normalizar(`${menu}: ${precio}`));
      await expect(puerta).toBeHidden();
      for (const enlace of [enlaceCarta, enlaceMenu]) await comprobarObjetivo(enlace);
    });

    test('maqueta: la etiqueta «Imagen creada con IA…» se ve mientras se ve una pieza «ia: local», y en los créditos', async ({ page }) => {
      // El último tramo pasa a ser una pieza «ia: local» (en la maqueta ya lo son todos).
      await page.route('**/recorrido/recorrido.json', async (r) => {
        const config = await (await r.fetch()).json();
        config.tramos[config.tramos.length - 1].ia = 'local';
        config.ia = [{ es: 'nubes', en: 'clouds', herramienta: 'Higgsfield' }];
        await r.fulfill({ json: config });
      });
      const [etiqueta, creditos, soloReal] =
        ruta === '/'
          ? ['Imagen creada con IA a partir de fotogramas reales del local', 'Imágenes creadas con IA a partir de fotogramas reales del local', 'solo en vídeo real']
          : ['AI image created from real frames of the venue', 'AI images created from real frames of the venue', 'only in real video'];
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const marca = page.locator('[data-recorrido-etiqueta-ia]');
      const partes = await partesDelRecorrido(page);
      const tramosDelRecorrido = partes.filter((p) => p.nombre !== 'aire' && !p.nombre.startsWith('parada-'));
      const ultimo = tramosDelRecorrido[tramosDelRecorrido.length - 1];
      // En el aire y en cualquier tramo que no sea IA del local, la etiqueta no está.
      await irAParte(page, 'aire');
      await expect(marca).toBeHidden();
      for (const t of tramosDelRecorrido.filter((p) => !p.ia && p !== ultimo)) {
        await irAParte(page, t.nombre);
        await expect(marca).toBeHidden();
      }
      await irAParte(page, ultimo.nombre); // la pieza «ia: local»
      await expect(marca).toBeVisible();
      await expect(marca).toHaveText(etiqueta);
      await irAParte(page, 'parada-barra'); // su parada deja quieta la pieza: la etiqueta sigue
      await expect(marca).toBeVisible();
      await expect(page.locator('[data-recorrido-ia-local]')).toContainText(creditos);
      await expect(page.locator('[data-recorrido-ia]')).not.toContainText(soloReal);
    });

    test('con «reducir movimiento»: sin canvas animado ni vídeo, sin material y con las mismas funciones', async ({ browser }) => {
      const contexto = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await contexto.newPage();
      const material = peticionesDeMaterial(page);
      await page.goto(ruta, { waitUntil: 'networkidle' });
      const { clases } = await estado(page);
      expect(clases).not.toMatch(/recorrido-(pendiente|activo)/);
      await expect(page.locator('[data-recorrido]')).toBeHidden();
      await expect(page.locator('video')).toHaveCount(0);
      expect(material).toEqual([]);
      await mismasFunciones(page, botones);
      await expect(page.getByRole('link', { name: barra })).toBeVisible();
      await contexto.close();
    });

    test('con la cabecera Save-Data: versión estática', async ({ browser }) => {
      const contexto = await browser.newContext({ extraHTTPHeaders: { 'Save-Data': 'on' } });
      const page = await contexto.newPage();
      await page.goto(ruta, { waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveClass(/recorrido-estatico/);
      expect((await estado(page)).motivo).toBe('servidor');
      await expect(page.locator('[data-recorrido]')).toBeHidden();
      await mismasFunciones(page, botones);
      await contexto.close();
    });

    test('con red lenta (el primer tramo tarda más de 3 s): versión estática', async ({ page }) => {
      await page.route('**/recorrido/aire/**', async (r) => {
        await new Promise((ok) => setTimeout(ok, 4000));
        await r.continue().catch(() => {});
      });
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-estatico/, { timeout: 6000 });
      expect((await estado(page)).motivo).toBe('lento');
      await expect(page.locator('[data-recorrido]')).toBeHidden();
      await mismasFunciones(page, botones);
    });

    test('créditos: IA declarada y atribución del PNOA con enlace al pie del tramo aéreo', async ({ page }) => {
      await page.route('**/recorrido/recorrido.json', async (r) => {
        const config = await (await r.fetch()).json();
        config.aire.pnoa = { anio: '2099' };
        config.ia = [{ es: 'nubes', en: 'clouds', herramienta: 'Higgsfield' }];
        await r.fulfill({ json: config });
      });
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const pnoa = page.locator('[data-recorrido-pnoa] a');
      await expect(pnoa).toBeVisible();
      await expect(pnoa).toHaveAttribute('href', 'https://www.scne.es/');
      await expect(pnoa).toContainText('PNOA 2099 CC-BY 4.0 scne.es');
      // Tal como se pinta, no solo en el DOM: con un enlace flex se perdían los espacios a los dos lados del año
      // («PNOA2099CC-BY»). Se mide el hueco entre el texto anterior y el año, y entre el año y el texto siguiente.
      const huecos = await page.locator('[data-recorrido-pnoa] [data-anio]').evaluate((anio) => {
        const caja = anio.getBoundingClientRect();
        /** Caja de un carácter de un nodo de texto. */
        const caracter = (texto: Text, i: number) => {
          const r = document.createRange();
          r.setStart(texto, i);
          r.setEnd(texto, i + 1);
          return r.getBoundingClientRect();
        };
        // Último carácter visible antes del año y primero después (los textos llevan el espacio en el borde).
        const antes = anio.previousSibling as Text;
        const despues = anio.nextSibling as Text;
        const ultimo = caracter(antes, antes.data.trimEnd().length - 1);
        const primero = caracter(despues, despues.data.length - despues.data.trimStart().length);
        return { izquierda: caja.left - ultimo.right, derecha: primero.left - caja.right };
      });
      expect(huecos.izquierda).toBeGreaterThan(1);
      expect(huecos.derecha).toBeGreaterThan(1);
      const ia = page.locator('[data-recorrido-ia]');
      await expect(ia).toContainText(ruta === '/' ? 'nubes (Higgsfield)' : 'clouds (Higgsfield)');
      // Fuera del tramo aéreo, la atribución se va.
      const alto = await page.locator('[data-recorrido-pista]').evaluate((e) => e.getBoundingClientRect().height);
      await page.evaluate(([y]) => scrollTo(0, y), [alto * 0.5]);
      await expect(pnoa).toBeHidden();
    });
  });
}

test('sin ortofoto: el aire es cielo con nubes, sin atribución del PNOA, y el recorrido sigue', async ({ page }) => {
  // Es el caso del material real mientras el servicio del IGN no se pueda usar (aire.ts, ensamblar.mjs).
  await page.route('**/recorrido/recorrido.json', async (r) => {
    const config = await (await r.fetch()).json();
    config.aire.niveles = [];
    config.aire.pnoa = null;
    await r.fulfill({ json: config });
  });
  const niveles: string[] = [];
  page.on('request', (p) => {
    if (new URL(p.url()).pathname.startsWith('/recorrido/aire/')) niveles.push(p.url());
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
  await expect(page.locator('[data-recorrido-pnoa]')).toBeHidden();
  // El lienzo tiene el cielo pintado: el píxel de arriba es azul, no el negro del lienzo vacío.
  const [r, g, b] = await page.locator('[data-recorrido-lienzo]').evaluate((c: HTMLCanvasElement) => [
    ...(c.getContext('2d')?.getImageData(c.width / 2, 2, 1, 1).data ?? []),
  ]);
  expect(b).toBeGreaterThan(r);
  expect(b).toBeGreaterThan(100);
  expect(g).toBeGreaterThan(0);
  // La primera parte después del aire: «puerta» en el sintético y en el real, «llegada» en la maqueta.
  const primerTramo = (await partesDelRecorrido(page))[1];
  await irAParte(page, primerTramo.nombre, 0.5);
  await expect(page.locator('[data-recorrido]')).toHaveAttribute('data-parte', primerTramo.nombre);
  expect(niveles).toEqual([]);
});

test('memoria: solo una ventana de fotogramas decodificados, no todos', async ({ page }) => {
  // Cuenta los ImageBitmap vivos (creados menos cerrados) mientras se recorre todo.
  await page.addInitScript(() => {
    const w = window as unknown as { __vivos: number; __maximo: number };
    w.__vivos = 0;
    w.__maximo = 0;
    const crear = window.createImageBitmap.bind(window);
    window.createImageBitmap = (async (...args: Parameters<typeof createImageBitmap>) => {
      const b = await crear(...args);
      w.__vivos++;
      w.__maximo = Math.max(w.__maximo, w.__vivos);
      const cerrar = b.close.bind(b);
      b.close = () => {
        w.__vivos--;
        cerrar();
      };
      return b;
    }) as typeof createImageBitmap;
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
  const alto = await page.locator('[data-recorrido-pista]').evaluate((e) => e.getBoundingClientRect().height);
  for (let y = 0; y <= alto; y += 120) {
    await page.evaluate(([v]) => scrollTo(0, v), [y]);
    await page.waitForTimeout(20);
  }
  const { maximo } = await page.evaluate(() => ({ maximo: (window as unknown as { __maximo: number }).__maximo }));
  expect(maximo).toBeGreaterThan(3); // el contador funciona: se han decodificado fotogramas
  // La ventana es de 6 a cada lado (13) más lo que el aire tiene siempre decodificado: sus niveles y sus nubes, que
  // cambian con el material (el del recorrido.json servido). Los 2 de margen son los que están llegando.
  const { aire } = (await (await page.request.get('/recorrido/recorrido.json')).json()) as {
    aire: { niveles: unknown[]; nubes?: unknown[] };
  };
  expect(maximo).toBeLessThanOrEqual(13 + aire.niveles.length + (aire.nubes?.length ?? 0) + 2);
});

test('rutas nuevas con noindex: /recorrido/estado y /lab/scroll', async ({ request }) => {
  for (const ruta of ['/recorrido/estado', '/lab/scroll']) {
    const r = await request.get(ruta);
    expect(r.status()).toBe(200);
    expect(r.headers()['x-robots-tag']).toMatch(/\bnoindex\b/);
  }
});

test('axe sin fallos graves con el recorrido activo y en el tramo aéreo', async ({ page }) => {
  await page.route('**/recorrido/recorrido.json', async (r) => {
    const config = await (await r.fetch()).json();
    config.aire.pnoa = { anio: '2099' };
    config.ia = [{ es: 'nubes', en: 'clouds', herramienta: 'Higgsfield' }];
    await r.fulfill({ json: config });
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
  const { violations } = await new AxeBuilder({ page }).analyze();
  const graves = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id);
  expect(graves).toEqual([]);
});
