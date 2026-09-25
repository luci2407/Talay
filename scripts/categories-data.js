// ============================================================
// Talay — Datos de categorías (ahora desde Supabase)
// ============================================================
// Mismo patrón que products-data.js: window.TALAY_CATEGORIES
// empieza vacío, se llena con lo que responda Supabase, y al
// terminar se dispara "talay:categories-ready".
// ============================================================

window.TALAY_CATEGORIES = [];

(async function loadCategories() {
  try {
    var client = window.supabaseClient;
    if (!client) throw new Error('supabaseClient no está definido. Revisa que supabase-client.js se cargue antes que este archivo.');

    var result = await client
      .from('categories')
      .select('id, name, image, description');

    if (result.error) throw result.error;

    window.TALAY_CATEGORIES = (result.data || []).map(function (row) {
      return {
        id: row.id,
        name: row.name,
        image: row.image,
        description: row.description
      };
    });
  } catch (err) {
    console.error('No se pudieron cargar las categorías desde Supabase:', err);
    window.TALAY_CATEGORIES = [];
  } finally {
    document.dispatchEvent(new CustomEvent('talay:categories-ready'));
  }
})();