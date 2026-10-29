// Lighthouse CI con el presupuesto aprobado por Kara. No se rebaja sin su aprobación.
// Móvil con 4G simulado: son los valores por defecto de Lighthouse, así que no se cambian aquí.
// Tamaños en bytes transferidos, en las mismas unidades que muestra Lighthouse (1 KB = 1024 bytes).
// Cada valor es la mediana de 3 ejecuciones.

// Astro 7 manda `astro preview` a segundo plano si detecta un agente de IA; aquí debe quedarse en primer plano.
process.env.ASTRO_PREVIEW_BACKGROUND = '0';

const BASE = 'http://localhost:4321';
const KB = 1024;
const MB = 1024 * KB;

// /carta se activa en F1: poner `true` cuando exista la página.
const CARTA_ACTIVA = false;

/** @param {number} max */
const maximo = (max) => ['error', { maxNumericValue: max, aggregationMethod: 'median' }];
/** @param {number} min */
const minimo = (min) => ['error', { minScore: min, aggregationMethod: 'median' }];

const presupuestoPortada = {
  'largest-contentful-paint': maximo(2500),
  'cumulative-layout-shift': maximo(0.1),
  'total-blocking-time': maximo(200),
  'resource-summary:script:size': maximo(100 * KB),
  // «≤ 1 MB antes del recorrido»: peso total de la carga inicial, sin desplazar ni interactuar.
  'total-byte-weight': maximo(1 * MB),
  'categories:performance': minimo(0.8),
  'categories:accessibility': minimo(0.95),
};

const presupuestoCarta = {
  'largest-contentful-paint': maximo(2000),
  'cumulative-layout-shift': maximo(0.1),
  'total-blocking-time': maximo(150),
  'resource-summary:script:size': maximo(30 * KB),
  'total-byte-weight': maximo(300 * KB),
  'categories:performance': minimo(0.9),
  'categories:accessibility': minimo(0.95),
};

module.exports = {
  ci: {
    collect: {
      url: CARTA_ACTIVA ? [`${BASE}/`, `${BASE}/carta`] : [`${BASE}/`],
      // Necesita compilar antes (`npm run build`); `astro preview` sirve la compilación con workerd.
      startServerCommand: 'npm run preview',
      numberOfRuns: 3,
    },
    assert: {
      assertMatrix: [
        { matchingUrlPattern: '^http://localhost:4321/$', assertions: presupuestoPortada },
        ...(CARTA_ACTIVA ? [{ matchingUrlPattern: '/carta/?$', assertions: presupuestoCarta }] : []),
      ],
    },
    upload: {
      // Informes solo en local (.lighthouseci/): no se publican en servidores externos.
      target: 'filesystem',
      outputDir: '.lighthouseci',
    },
  },
};
