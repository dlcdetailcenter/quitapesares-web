// Rellena «Platos de hoy» en la portada y en las paradas. En el HTML solo hay «Ver carta»: si la ruta falla o no hay
// platos, se queda así. Con platos, la lista sustituye al enlace (la barra «Ir a la carta» ya está en pantalla).
const bloques = document.querySelectorAll<HTMLElement>('[data-hoy]');

async function rellenar(): Promise<void> {
  const idioma = document.documentElement.lang === 'en' ? 'en' : 'es';
  const r = await fetch(`/recorrido/hoy?idioma=${idioma}`, { cache: 'no-store' });
  if (!r.ok) return;
  const { platos } = (await r.json()) as { platos?: unknown };
  if (!Array.isArray(platos) || platos.length === 0) return;
  for (const bloque of bloques) {
    const lista = bloque.querySelector('ul');
    const enlace = bloque.querySelector('a');
    if (!lista || !enlace) continue;
    lista.replaceChildren(
      ...platos.map((plato) => {
        const li = document.createElement('li');
        li.textContent = String(plato);
        return li;
      }),
    );
    lista.hidden = false;
    // El panel del menú lleva siempre «Ver carta».
    if (!bloque.hasAttribute('data-hoy-fija')) enlace.hidden = true;
  }
}

// Después de cargar la página: no compite con el primer pintado.
const pedir = () => void rellenar().catch(() => {});
if (bloques.length > 0) {
  if (document.readyState === 'complete') pedir();
  else addEventListener('load', pedir, { once: true });
}
