import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Portada marcador', () => {
  test('responde 200', async ({ page }) => {
    const respuesta = await page.goto('/');
    expect(respuesta?.status()).toBe(200);
  });

  test('declara el idioma español', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  });

  test('no se indexa (meta robots noindex)', async ({ page }) => {
    await page.goto('/');
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveCount(1);
    await expect(robots).toHaveAttribute('content', /\bnoindex\b/);
  });

  test('sin fallos de accesibilidad graves ni críticos (axe)', async ({ page }) => {
    await page.goto('/');
    const { violations } = await new AxeBuilder({ page }).analyze();
    const graves = violations
      .filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => ({ regla: v.id, impacto: v.impact, elementos: v.nodes.length, ayuda: v.helpUrl }));
    expect(graves).toEqual([]);
  });
});
