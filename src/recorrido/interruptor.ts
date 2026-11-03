// Interruptor del recorrido de F2. Se decide al compilar:
//   npm run build                      → recorrido encendido (por defecto)
//   RECORRIDO=apagado npm run build    → portada de F1 tal cual: sin recorrido, sin barra y sin JavaScript
// Apagarlo no revierte nada: se vuelve a compilar y desplegar. El valor lo inyecta astro.config.mjs.
declare const __RECORRIDO__: boolean;

export const RECORRIDO_ENCENDIDO: boolean = __RECORRIDO__;
