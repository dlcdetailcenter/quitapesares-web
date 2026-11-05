// Recorrido de F2 sobre la portada, con el material SINTÉTICO (colores lisos) que genera scripts/media/preparar.mjs.
// Comprueba: barra «Ir a la carta» en 1 s y de un toque; versión estática con «reducir movimiento», Save-Data o red
// lenta, con las mismas funciones; el recorrido avanza con el scroll; solo una ventana de fotogramas en memoria;
// créditos de IA y atribución del PNOA cuando el material los lleva; noindex en las rutas nuevas; axe.
// El interruptor apagado (portada de F1) se prueba al compilar: scripts/media/interruptor.test.mjs.
import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const PORTADAS = [
  { ruta: '/', carta: '/carta', barra: 'Ir a la carta', botones: ['Cómo llegar', 'Dejar reseña'] },
  { ruta: '/en/', carta: '/en/carta', barra: 'Go to the menu', botones: ['Directions', 'Write a review'] },
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
    if (pathname.startsWith('/recorrido/') && pathname !== '/recorrido/estado' && pathname !== '/recorrido/hoy') urls.push(pathname);
  });
  return urls;
}

/** Lleva el scroll a un punto del recorrido, en las pantallas de sus partes desde el principio. */
async function irA(page: Page, pantalla: number) {
  await page.evaluate((p) => {
    const pista = document.querySelector('[data-recorrido-pista]') as HTMLElement;
    const caja = pista.getBoundingClientRect();
    scrollTo(0, caja.top + scrollY + (p / Number(pista.dataset.pantallas)) * (caja.height - innerHeight));
  }, pantalla);
  await page.waitForTimeout(200);
}

interface ParteRecorrido {
  nombre: string;
  inicio: number;
  pantallas: number;
  ia: boolean;
  panel?: string;
}

/**
 * Partes del recorrido tal como las monta cliente.ts, a partir del recorrido.json que se sirve: así las pruebas valen
 * con el material sintético (CI), con el real y con la maqueta. Con «panel», sin paradas; sin él, las de zona.
 */
async function partesDelRecorrido(page: Page): Promise<ParteRecorrido[]> {
  const config = (await (await page.request.get('/recorrido/recorrido.json')).json()) as {
    aire: { pantallas: number; panel?: string };
    tramos: { id: string; pantallas: number; zona?: string; ia?: string; panel?: string }[];
  };
  const conPaneles = Boolean(config.aire.panel);
  const partes: ParteRecorrido[] = [{ nombre: 'aire', inicio: 0, pantallas: config.aire.pantallas, ia: false, panel: config.aire.panel }];
  let inicio = config.aire.pantallas;
  config.tramos.forEach((t, i) => {
    const zona = t.zona ?? t.id;
    partes.push({ nombre: t.id, inicio, pantallas: t.pantallas, ia: t.ia === 'local', panel: t.panel });
    inicio += t.pantallas;
    const siguiente = config.tramos[i + 1];
    const ultimoDeZona = !siguiente || (siguiente.zona ?? siguiente.id) !== zona;
    if (!conPaneles && ultimoDeZona && (zona === 'puerta' || zona === 'barra')) {
      partes.push({ nombre: `parada-${zona}`, inicio, pantallas: 0.5, ia: t.ia === 'local' });
      inicio += 0.5;
    }
  });
  return partes;
}

const ALTO = 844;

/** Grupo de acciones a la vista y enlaces en pantalla, fuera de la cabecera. */
async function aLaVista(page: Page, pantallaDeScroll: number) {
  await page.evaluate(([y]) => scrollTo(0, y), [pantallaDeScroll * ALTO]);
  await page.waitForTimeout(40);
  return page.evaluate(() => {
    const seVe = (a: Element) => {
      const r = a.getBoundingClientRect();
      const estilo = getComputedStyle(a);
      return estilo.visibility === 'visible' && estilo.display !== 'none' && r.height > 0 && r.bottom > 56 && r.top < innerHeight;
    };
    const enlaces = [...document.querySelectorAll('a')].filter((a) => !a.closest('.cabecera') && !a.classList.contains('saltar') && seVe(a));
    return {
      panel: document.querySelector<HTMLElement>('.recorrido__parada--visible')?.dataset.parada ?? null,
      enPanel: enlaces.filter((a) => a.closest('[data-parada]')).length,
      total: enlaces.length,
    };
  });
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

/** La portada entera: foto, nombre, Llamar en la cabecera, sus tarjetas, la pizarra y el horario. */
async function mismasFunciones(page: Page, botones: readonly string[]) {
  await expect(page.locator('picture img')).toBeVisible();
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.cabecera__llamar')).toBeVisible();
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

    test('se activa con el primer tramo y avanza con el scroll, parte a parte', async ({ page }) => {
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const seccion = page.locator('[data-recorrido]');
      await expect(seccion).toHaveAttribute('data-parte', 'aire');
      // Se va al centro de cada parte, en el orden del recorrido.json servido.
      const partes = await partesDelRecorrido(page);
      const vistas: string[] = [];
      for (const p of partes) {
        await irA(page, p.inicio + p.pantallas / 2);
        vistas.push((await seccion.getAttribute('data-parte')) ?? '');
      }
      expect(vistas).toEqual(partes.map((p) => p.nombre));
      // Con el material sintético (CI), lo dice en los créditos.
      const { material } = (await (await page.request.get('/recorrido/recorrido.json')).json()) as { material: string };
      if (material === 'sintetico') await expect(page.locator('[data-recorrido-sintetico]')).toBeVisible();
      // Después del recorrido, el horario.
      await expect(page.locator('.portada__horario dd')).toHaveCount(7);
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

    test('longitud a 390×844: 4 pantallas de scroll como mucho y la portada entera, 7', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: ALTO });
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const partes = await partesDelRecorrido(page);
      for (const p of partes) expect(p.pantallas).toBeLessThanOrEqual(1);
      const pantallas = partes.reduce((a, p) => a + p.pantallas, 0);
      expect(pantallas).toBeLessThanOrEqual(4);
      const pista = await page.locator('[data-recorrido-pista]').evaluate((e) => e.getBoundingClientRect().height);
      // El escenario fijo mide 1 ventana: la pista mide esa más lo que se desplaza.
      expect(pista - ALTO).toBeCloseTo(pantallas * ALTO, 0);
      const pagina = await page.evaluate(() => document.documentElement.scrollHeight);
      expect(pagina).toBeLessThanOrEqual(7 * ALTO);
    });

    test('paneles a 390×844: el menú antes de 1,5 pantallas, cada grupo 1 pantalla seguida y siempre una acción a la vista', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: ALTO });
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const partes = await partesDelRecorrido(page);
      const fin = partes.reduce((a, p) => a + p.pantallas, 0);

      // Cada 0,05 pantallas por el recorrido: ningún punto sin acciones del panel.
      const seguidas = new Map<string, number>();
      let anterior: string | null = null;
      let racha = 0;
      for (let i = 0; i <= Math.round(fin / 0.05); i++) {
        const { panel, enPanel } = await aLaVista(page, i * 0.05);
        expect(panel, `pantalla ${(i * 0.05).toFixed(2)}`).not.toBeNull();
        expect(enPanel, `pantalla ${(i * 0.05).toFixed(2)}`).toBeGreaterThan(0);
        racha = panel === anterior ? racha + 1 : 1;
        anterior = panel;
        if (panel) seguidas.set(panel, Math.max(seguidas.get(panel) ?? 0, racha));
      }
      expect([...seguidas.keys()]).toEqual(['llegar', 'menu', 'llamar', 'resena']);
      for (const [panel, muestras] of seguidas) expect(muestras * 0.05, panel).toBeGreaterThanOrEqual(1);

      // Cada 0,25 pantallas por toda la página: siempre una acción además de la cabecera.
      const pagina = await page.evaluate(() => document.documentElement.scrollHeight / innerHeight);
      for (let s = 0; s <= pagina - 1; s += 0.25) {
        const { total } = await aLaVista(page, s);
        expect(total, `pantalla ${s}`).toBeGreaterThan(0);
      }
    });

    test('acciones de cada panel: solo las que ya existen, con datos del archivo', async ({ page }) => {
      const datos = JSON.parse(readFileSync(new URL('../src/data/restaurante.json', import.meta.url), 'utf8'));
      const telefono = `tel:${String(datos.telefono.valor).replace(/[^\d+]/g, '')}`;
      const precio = new Intl.NumberFormat(ruta === '/' ? 'es-ES' : 'en-GB', { style: 'currency', currency: 'EUR' }).format(datos.menuDiario.valor.precio);
      const [comoLlegar, llamar, menu, verCarta, hoy, resena, otroIdioma] =
        ruta === '/'
          ? ['Cómo llegar', 'Llamar', 'Menú del día', 'Ver carta', 'Hoy', 'Dejar reseña', 'English']
          : ['Directions', 'Call', 'Set menu of the day', 'See the menu', 'Today', 'Write a review', 'Español'];
      await page.setViewportSize({ width: 390, height: ALTO });
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const normalizar = (s: string) => s.replace(/\s+/g, ' ').trim();
      const panel = (clave: string) => page.locator(`[data-parada="${clave}"]`);

      await aLaVista(page, 0.5);
      const llegar = panel('llegar').getByRole('link', { name: comoLlegar, exact: true });
      await expect(llegar).toHaveAttribute('href', new RegExp(`query_place_id=${datos.placeId.valor}`));
      await comprobarObjetivo(llegar);

      // El menú, antes de 1,5 pantallas.
      await aLaVista(page, 1.25);
      await page.waitForTimeout(300);
      const enlaceMenu = panel('menu').getByRole('link', { name: new RegExp(`^${menu}`) });
      const enlaceCarta = panel('menu').getByRole('link', { name: verCarta, exact: true });
      await expect(enlaceMenu).toBeInViewport();
      await expect(enlaceCarta).toBeInViewport();
      await expect(enlaceMenu).toHaveAttribute('href', `${carta}#menu-del-dia`);
      await expect(enlaceCarta).toHaveAttribute('href', carta);
      // Intl pone un espacio duro antes de «€»: se normalizan los dos lados.
      expect(normalizar((await enlaceMenu.textContent()) ?? '')).toBe(normalizar(`${menu}: ${precio}`));
      for (const enlace of [enlaceMenu, enlaceCarta]) await comprobarObjetivo(enlace);

      await aLaVista(page, 2.5);
      const enlaceLlamar = panel('llamar').getByRole('link', { name: llamar, exact: true });
      await expect(enlaceLlamar).toHaveAttribute('href', telefono);
      await comprobarObjetivo(enlaceLlamar);
      // El horario de hoy, en la hora de Madrid y del archivo de datos.
      const dia = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long' }).format(new Date()).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const horas: string = datos.horario.valor[dia];
      const visibles = panel('llamar').locator('.recorrido__horario:not([hidden])');
      await expect(visibles).toHaveCount(1);
      expect(normalizar((await visibles.textContent()) ?? '')).toMatch(new RegExp(`^${hoy}: `));
      if (/\d/.test(horas)) await expect(visibles).toContainText(horas);

      await aLaVista(page, 3.5);
      const enlaceResena = panel('resena').getByRole('link', { name: resena, exact: true });
      const enlaceIdioma = panel('resena').getByRole('link', { name: otroIdioma, exact: true });
      await expect(enlaceResena).toHaveAttribute('href', new RegExp(`placeid=${datos.placeId.valor}`));
      await expect(enlaceIdioma).toHaveAttribute('href', ruta === '/' ? '/en/' : '/');
      for (const enlace of [enlaceResena, enlaceIdioma]) await comprobarObjetivo(enlace);
    });

    test('la entrada es real: sin marca de IA ni etiqueta', async ({ page }) => {
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const config = (await (await page.request.get('/recorrido/recorrido.json')).json()) as { tramos: { id: string; ia?: string; origen?: string }[] };
      const entrada = config.tramos[0];
      expect(entrada.id).toBe('puerta');
      expect(entrada.ia).toBeUndefined();
      expect(entrada.origen).not.toBe('creada');
      await irAParte(page, 'puerta');
      await expect(page.locator('[data-recorrido-etiqueta-ia]')).toBeHidden();
    });

    test('debajo del recorrido, solo el horario y el pie: ninguna función repetida', async ({ page }) => {
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      await expect(page.locator('.portada__horario')).toBeVisible();
      await expect(page.locator('.pie')).toBeVisible();
      for (const repetido of ['.tarjeta', '.pizarra', '.portada__hoy', '.portada__foto']) await expect(page.locator(repetido).first()).toBeHidden();
      // El título sigue en la página para el lector de pantalla.
      await expect(page.locator('h1')).toHaveCount(1);
    });

    test('la última pieza se funde con la crema de la página', async ({ page }) => {
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const partes = await partesDelRecorrido(page);
      await irAParte(page, partes[partes.length - 1].nombre, 0.99);
      await expect(page.locator('[data-recorrido-fundido]')).toHaveCSS('opacity', '1');
      // Sobre la crema ya no se ve ninguna pieza: sin etiqueta de IA.
      await expect(page.locator('[data-recorrido-etiqueta-ia]')).toBeHidden();
      await irAParte(page, 'aire');
      await expect(page.locator('[data-recorrido-fundido]')).toHaveCSS('opacity', '0');
    });

    for (const movimiento of ['no-preference', 'reduce'] as const) {
      test(`platos de hoy con «${movimiento}»: con la ruta bien salen los platos; con la ruta caída, solo Ver carta`, async ({ browser }) => {
        const verCarta = ruta === '/' ? 'Ver carta' : 'See the menu';
        const contexto = await browser.newContext({ reducedMotion: movimiento });
        const page = await contexto.newPage();
        await page.route('**/recorrido/hoy*', (r) => r.fulfill({ json: { platos: ['Plato uno', 'Plato dos'] } }));
        await page.goto(ruta);
        const conRecorrido = movimiento === 'no-preference';
        // Con recorrido, en el panel del menú; sin él, en la portada.
        const bloque = page.locator(conRecorrido ? '[data-parada="menu"] [data-hoy]' : '.portada [data-hoy]');
        if (conRecorrido) {
          await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
          await irAParte(page, 'puerta');
        }
        await expect(bloque.locator('li')).toHaveText(['Plato uno', 'Plato dos']);
        // El panel lleva siempre Ver carta; la portada no lo repite con la barra fija en pantalla.
        await expect(bloque.getByRole('link', { name: verCarta })).toHaveCount(conRecorrido ? 1 : 0);

        await page.unroute('**/recorrido/hoy*');
        await page.route('**/recorrido/hoy*', (r) => r.abort());
        await page.goto(ruta);
        await expect(page.locator('html')).not.toHaveClass(/recorrido-pendiente/);
        if (conRecorrido) await irAParte(page, 'puerta');
        await expect(bloque.locator('ul')).toBeHidden();
        const enlace = bloque.getByRole('link', { name: verCarta });
        await expect(enlace).toBeVisible();
        await expect(enlace).toHaveAttribute('href', carta);
        await contexto.close();
      });
    }

    test('maqueta: la etiqueta «Creado con IA…» se ve mientras se ve una pieza «ia: local», y en los créditos', async ({ page }) => {
      // El penúltimo tramo pasa a ser una pieza «ia: local» (en la maqueta ya lo son todos); el último se funde con la crema.
      await page.route('**/recorrido/recorrido.json', async (r) => {
        const config = await (await r.fetch()).json();
        config.tramos[config.tramos.length - 2].ia = 'local';
        config.ia = [{ es: 'nubes', en: 'clouds', herramienta: 'Higgsfield' }];
        await r.fulfill({ json: config });
      });
      const [etiqueta, creditos, soloReal] =
        ruta === '/'
          ? ['Creado con IA a partir de fotogramas reales del local', 'Creado con IA a partir de fotogramas reales del local', 'solo en vídeo real']
          : ['Created with AI from real frames of the venue', 'Created with AI from real frames of the venue', 'only in real video'];
      await page.goto(ruta);
      await expect(page.locator('html')).toHaveClass(/recorrido-activo/);
      const marca = page.locator('[data-recorrido-etiqueta-ia]');
      const partes = await partesDelRecorrido(page);
      const tramosDelRecorrido = partes.filter((p) => p.nombre !== 'aire' && !p.nombre.startsWith('parada-'));
      const ultimo = tramosDelRecorrido[tramosDelRecorrido.length - 2];
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
      await expect(page.locator('[data-recorrido-ia-local]')).toContainText(creditos);
      await expect(page.locator('[data-recorrido-ia]')).not.toContainText(soloReal);
    });

    test('con «reducir movimiento»: sin canvas animado ni vídeo, sin material y con todas las acciones en la portada', async ({ browser }) => {
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
      // Idioma, menú con su precio y horario, también aquí.
      await expect(page.locator('.cabecera a[hreflang]')).toBeVisible();
      await expect(page.locator('.pizarra__precio')).toBeVisible();
      await expect(page.locator('.portada__hoy')).toBeVisible();
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
