// ============================================================
// Talay — Datos de reseñas (desde Supabase)
// ============================================================
// Mismo patrón que products-data.js y categories-data.js:
// window.TALAY_REVIEWS empieza vacío, se llena con las reseñas
// aprobadas (creadas desde el panel de administrador) y al
// terminar se dispara "talay:reviews-ready".
// ============================================================

window.TALAY_REVIEWS = [];

(async function loadReviews() {
  try {
    var client = window.supabaseClient;
    if (!client) throw new Error('supabaseClient no está definido. Revisa que supabase-client.js se cargue antes que este archivo.');

    var result = await client
      .from('reviews')
      .select('id, customer_name, rating, comment, photo_url, created_at')
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (result.error) throw result.error;

    window.TALAY_REVIEWS = result.data || [];
  } catch (err) {
    console.error('No se pudieron cargar las reseñas desde Supabase:', err);
    window.TALAY_REVIEWS = [];
  } finally {
    document.dispatchEvent(new CustomEvent('talay:reviews-ready'));
  }
})();