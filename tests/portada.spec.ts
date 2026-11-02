// Portada en los dos idiomas: foto real con texto alternativo, botones que abren lo correcto y datos del local
// tal como están en src/data/restaurante.json (la prueba los lee del archivo, no los escribe).
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const datos = JSON.parse(readFileSync(new URL('../src/data/restaurante.json', import.meta.url), 'utf8'));
const placeId: string = datos.placeId.valor;
const telefono = `tel:${String(datos.telefono.valor).replace(/[^\d+]/g, '')}`;

const PORTADAS = [
  { ruta: '/', carta: '/carta', botones: ['Llamar', 'Ver carta', 'Cómo llegar', 'Dejar reseña'] },
  { ruta: '/en/', carta: '/en/carta', botones: ['Call', 'See the menu', 'Directions', 'Write a review'] },
] as const;

for (const { ruta, carta, botones } of PORTADAS) {
  test.describe(`Portada ${ruta}`, () => {
    test('foto real con texto alternativo, servida en AVIF o WebP desde el propio sitio', async ({ page }) => {
      await page.goto(ruta);
      const foto = page.locator('picture img');
      await expect(foto).toHaveCount(1);
      await expect(foto).toHaveAttribute('alt', /\S{10,}/);
      await expect(page.locator('picture source[type="image/avif"]')).toHaveCount(1);
    });

    test('Llamar, Ver carta, Cómo llegar y Dejar reseña llevan al sitio correcto', async ({ page }) => {
      await page.goto(ruta);
      const [llamar, verCarta, comoLlegar, resena] = botones.map((texto) => page.getByRole('link', { name: texto, exact: true }));
      await expect(llamar).toHaveAttribute('href', telefono);
      await expect(verCarta).toHaveAttribute('href', carta);
      const maps = new URL((await comoLlegar.getAttribute('href')) ?? '');
      expect(maps.origin + maps.pathname).toBe('https://www.google.com/maps/search/');
      expect(maps.searchParams.get('query_place_id')).toBe(placeId);
      expect(maps.searchParams.get('query')).toBe(`${datos.coordenadas.valor.lat},${datos.coordenadas.valor.lng}`);
      const formularioResena = new URL((await resena.getAttribute('href')) ?? '');
      expect(formularioResena.origin + formularioResena.pathname).toBe('https://search.google.com/local/writereview');
      expect(formularioResena.searchParams.get('placeid')).toBe(placeId);
    });

    test('muestra los dos precios de menú y el horario de los siete días del archivo de datos', async ({ page }) => {
      await page.goto(ruta);
      const idioma = ruta === '/' ? 'es-ES' : 'en-GB';
      const formato = (n: number) => new Intl.NumberFormat(idioma, { style: 'currency', currency: 'EUR' }).format(n);
      const pizarra = page.locator('.pizarra');
      await expect(pizarra).toContainText(formato(datos.menuDiario.valor.precio));
      await expect(pizarra).toContainText(formato(datos.menuFinDeSemana.valor.precio));
      const dias = page.locator('.portada__horario dd');
      await expect(dias).toHaveCount(7);
      for (const horas of Object.values(datos.horario.valor) as string[]) {
        if (/\d/.test(horas)) await expect(page.locator('.portada__horario')).toContainText(horas);
      }
    });

    test('cambio de idioma a la portada del otro idioma', async ({ page }) => {
      await page.goto(ruta);
      const otro = page.locator('nav a[hreflang]');
      await expect(otro).toHaveAttribute('href', ruta === '/' ? '/en/' : '/');
    });
  });
}
