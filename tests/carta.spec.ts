// /carta y /en/carta servidas por el Worker (astro preview con workerd). En local no hay URL de la hoja: la carta
// sale de la plantilla de docs/carta/ (dato de prueba), que hoy tiene 23 platos y ninguno con nombre en inglés.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const plantilla = readFileSync(new URL('../docs/carta/plantilla-hoja-carta.csv', import.meta.url), 'utf8')
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((linea) => linea.split(','));

test.describe('Carta en español (/carta)', () => {
  test('no se guarda en caché del navegador: un agotado se ve en la siguiente visita', async ({ page }) => {
    const respuesta = await page.goto('/carta');
    expect(respuesta?.headers()['cache-control']).toBe('no-cache');
  });

  test('cada plato de la plantilla aparece con su nombre, en su categoría y sin textos vacíos', async ({ page }) => {
    await page.goto('/carta');
    const nombres = await page.locator('.carta__nombre').allTextContents();
    expect(nombres.map((n) => n.trim())).toEqual(expect.arrayContaining(plantilla.map((fila) => fila[2])));
    expect(nombres).toHaveLength(plantilla.length);
    expect(nombres.every((n) => n.trim() !== '')).toBe(true);
    const categorias = await page.locator('.carta__grupo h2').allTextContents();
    expect(categorias).toEqual([...new Set(plantilla.map((fila) => fila[1]))]);
  });

  test('una categoría sin platos no se muestra (Postres)', async ({ page }) => {
    await page.goto('/carta');
    await expect(page.getByRole('heading', { name: 'Postres' })).toHaveCount(0);
  });

  test('alérgenos: desplegable con el aviso, sin lista', async ({ page }) => {
    await page.goto('/carta');
    const alergenos = page.locator('details.alergenos');
    await expect(alergenos.locator('summary')).toHaveText('Alérgenos');
    await alergenos.locator('summary').click();
    await expect(alergenos).toContainText('Consulta los alérgenos con el personal');
    await expect(alergenos.locator('li')).toHaveCount(0);
  });

  test('el orden de lectura es el de la carta: título, menú del día y categorías con sus platos', async ({ page }) => {
    await page.goto('/carta');
    const titulos = await page.locator('main h1, main h2').allTextContents();
    expect(titulos.slice(0, 3)).toEqual(['Carta', 'Menú del día', 'Primeros']);
  });
});

test.describe('Carta en inglés (/en/carta)', () => {
  test('sin nombres en inglés en la hoja: aviso, enlace a la carta en español y ningún plato vacío', async ({ page }) => {
    const respuesta = await page.goto('/en/carta');
    expect(respuesta?.headers()['cache-control']).toBe('no-cache');
    await expect(page.locator('.carta__nombre')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'The menu in English isn’t ready yet.' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'See the menu in Spanish' })).toHaveAttribute('href', '/carta');
  });

  test('alérgenos en inglés', async ({ page }) => {
    await page.goto('/en/carta');
    await page.locator('details.alergenos summary').click();
    await expect(page.locator('details.alergenos')).toContainText('Please ask our staff about allergens.');
  });
});
