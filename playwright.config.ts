import { defineConfig } from '@playwright/test';

// 4321 por defecto (CI). En local se puede usar otro si ese puerto ya está ocupado: PUERTO_PRUEBAS=4330 npm test
const PUERTO = Number(process.env.PUERTO_PRUEBAS ?? 4321);

// Móvil: anchos de 360 y 390 px en Chromium y WebKit.
const pantallas = [
  { ancho: 360, alto: 800 },
  { ancho: 390, alto: 844 },
];
const motores = ['chromium', 'webkit'] as const;

export default defineConfig({
  testDir: './tests',
  // Un `test.only` olvidado haría que se saltaran las demás pruebas: se prohíbe siempre.
  forbidOnly: true,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PUERTO}`,
  },
  projects: motores.flatMap((motor) =>
    pantallas.map(({ ancho, alto }) => ({
      name: `${motor}-${ancho}`,
      use: {
        browserName: motor,
        viewport: { width: ancho, height: alto },
        isMobile: true,
        hasTouch: true,
      },
    })),
  ),
  // Sirve la compilación (npm run build antes) con `astro preview`, que usa workerd como Cloudflare.
  webServer: {
    command: `npm run preview -- --port ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    // Si ya hay una previsualización abierta en el puerto, se usa esa; en la CI no la hay y se arranca.
    reuseExistingServer: true,
    timeout: 120_000,
    // Astro 7 manda la previsualización a segundo plano si detecta un agente de IA; aquí debe quedarse en primer plano.
    env: { ASTRO_PREVIEW_BACKGROUND: '0' },
  },
});
