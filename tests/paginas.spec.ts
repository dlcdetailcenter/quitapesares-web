// Las páginas de la demo en cada proyecto (Chromium y WebKit, 360 y 390 px): idioma, noindex, sin scroll
// horizontal, objetivos táctiles de 44 px, axe sin fallos graves ni críticos, ninguna petición a terceros y una
// captura de cada una en test-results/capturas/.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGINAS = [
  { ruta: '/', idioma: 'es', nombre: 'portada-es' },
  { ruta: '/en/', idioma: 'en', nombre: 'portada-en' },
  { ruta: '/carta', idioma: 'es', nombre: 'carta-es' },
  { ruta: '/en/carta', idioma: 'en', nombre: 'carta-en' },
  // F2: prueba técnica del recorrido (sin enlaces desde ninguna página).
  { ruta: '/lab/scroll', idioma: 'es', nombre: 'lab-scroll' },
] as const;

const MINIMO_TACTIL = 44;

/** Elementos con los que se interactúa y que se ven (el enlace «Saltar al contenido» solo aparece con el foco). */
async function objetivosTactiles(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('a[href], button, summary, input, select, textarea')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const estilo = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && r.bottom > 0 && estilo.visibility !== 'hidden' && !el.classList.contains('saltar');
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { texto: (el.textContent ?? '').trim().slice(0, 40), ancho: Math.round(r.width), alto: Math.round(r.height) };
      }),
  );
}

for (const { ruta, idioma, nombre } of PAGINAS) {
  test.describe(`${nombre} (${ruta})`, () => {
    test('responde 200 con X-Robots-Tag noindex, meta robots noindex e idioma correcto', async ({ page }) => {
      const respuesta = await page.goto(ruta);
      expect(respuesta?.status()).toBe(200);
      expect(respuesta?.headers()['x-robots-tag']).toMatch(/\bnoindex\b/);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /\bnoindex\b/);
      await expect(page.locator('html')).toHaveAttribute('lang', idioma);
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test('sin scroll horizontal', async ({ page }) => {
      await page.goto(ruta);
      const { ancho, contenido } = await page.evaluate(() => ({ ancho: window.innerWidth, contenido: document.documentElement.scrollWidth }));
      expect(contenido).toBeLessThanOrEqual(ancho);
    });

    test(`botones y enlaces de ${MINIMO_TACTIL} px como mínimo`, async ({ page }) => {
      await page.goto(ruta);
      const objetivos = await objetivosTactiles(page);
      expect(objetivos.length).toBeGreaterThan(0);
      const pequenos = objetivos.filter((o) => o.ancho < MINIMO_TACTIL || o.alto < MINIMO_TACTIL);
      expect(pequenos).toEqual([]);
    });

    test('sin fallos de accesibilidad graves ni críticos (axe)', async ({ page }) => {
      await page.goto(ruta);
      const { violations } = await new AxeBuilder({ page }).analyze();
      const graves = violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => ({ regla: v.id, impacto: v.impact, elementos: v.nodes.length, ayuda: v.helpUrl }));
      expect(graves).toEqual([]);
    });

    test('el navegador no pide nada fuera del propio sitio (ni Google, ni analítica, ni fuentes externas)', async ({ page, baseURL }) => {
      const externas: string[] = [];
      page.on('request', (peticion) => {
        if (!peticion.url().startsWith(baseURL ?? '') && !peticion.url().startsWith('data:')) externas.push(peticion.url());
      });
      await page.goto(ruta, { waitUntil: 'networkidle' });
      expect(externas).toEqual([]);
    });

    test('captura de pantalla completa', async ({ page }, info) => {
      await page.goto(ruta, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `test-results/capturas/${info.project.name}-${nombre}.png`, fullPage: true });
    });
  });
}
