// Recorrido de F2 sobre la portada, con el material SINTÉTICO (colores lisos) que genera scripts/media/preparar.mjs.
// Comprueba: barra «Ir a la carta» en 1 s y de un toque; versión estática con «reducir movimiento», Save-Data o red
// lenta, con las mismas funciones; el recorrido avanza con el scroll; solo una ventana de fotogramas en memoria;
// créditos de IA y atribución del PNOA cuando el material los lleva; noindex en las rutas nuevas; axe.
// El interruptor apagado (portada de F1) se prueba al compilar: scripts/media/interruptor.test.mjs.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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

/** La portada de F1 entera: foto, nombre y los cuatro botones, más la pizarra y el horario. */
async function mismasFunciones(page: Page, botones: readonly string[]) {
  await expect(page.locator('picture img')).toBeVisible();
  await expect(page.locator('h1')).toBeVisible();
  for (const texto of botones) await expect(page.getByRole('link', { name: texto, exact: true })).toBeVisible();
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

    test('se activa con el primer tramo y avanza con el scroll: aire, puerta, barra, comedor', async ({ page }) => {
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const seccion = page.locator('[data-recorrido]');
      await expect(seccion).toHaveAttribute('data-parte', 'aire');
      const alto = await page.locator('[data-recorrido-pista]').evaluate((e) => e.getBoundingClientRect().height);
      expect(alto).toBeGreaterThan(5 * 800);
      const vistas: string[] = [];
      for (const f of [0.02, 0.3, 0.55, 0.8]) {
        await page.evaluate(([y]) => scrollTo(0, y), [alto * f]);
        await page.waitForTimeout(150);
        vistas.push((await seccion.getAttribute('data-parte')) ?? '');
      }
      expect(vistas).toEqual(['aire', 'puerta', 'barra', 'comedor']);
      // Material sintético: lo dice en los créditos.
      await expect(page.locator('[data-recorrido-sintetico]')).toBeVisible();
      // Después del recorrido sigue la portada de F1.
      await mismasFunciones(page, botones);
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
  const alto = await page.locator('[data-recorrido-pista]').evaluate((e) => e.getBoundingClientRect().height);
  await page.evaluate(([y]) => scrollTo(0, y), [alto * 0.3]);
  await expect(page.locator('[data-recorrido]')).toHaveAttribute('data-parte', 'puerta');
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
  // 72 fotogramas en el material sintético: la ventana es de 6 a cada lado (13) más los 3 niveles del aire.
  expect(maximo).toBeLessThanOrEqual(13 + 3 + 2);
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
