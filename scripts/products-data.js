// ============================================================
// Talay — Datos de productos (ahora desde Supabase)
// ============================================================
// window.TALAY_PRODUCTS empieza vacío y se llena cuando responde
// Supabase. El resto del sitio (tarjetas, ventana rápida, carrito)
// no cambia: sigue leyendo de window.TALAY_PRODUCTS igual que antes.
//
// Cuando el arreglo ya está listo, se dispara el evento
// "talay:products-ready" — las páginas que renderizan productos al
// cargar (como categoria-productos.html) escuchan ese evento para
// saber cuándo ya pueden dibujar las tarjetas.
// ============================================================

window.TALAY_PRODUCTS = [];

(async function loadProducts() {
  try {
    var client = window.supabaseClient;
    if (!client) throw new Error('supabaseClient no está definido. Revisa que supabase-client.js se cargue antes que este archivo.');

    var result = await client
      .from('products')
      .select('id, name, price, category_id, image, description, categories ( name )');

    if (result.error) throw result.error;

    window.TALAY_PRODUCTS = (result.data || []).map(function (row) {
      return {
        id: row.id,
        name: row.name,
        price: Number(row.price),
        categoryId: row.category_id,
        category: row.categories ? row.categories.name : '',
        image: row.image,
        description: row.description
      };
    });
  } catch (err) {
    console.error('No se pudieron cargar los productos desde Supabase:', err);
    window.TALAY_PRODUCTS = [];
  } finally {
    document.dispatchEvent(new CustomEvent('talay:products-ready'));
  }
})();