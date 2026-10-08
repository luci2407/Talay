// ============================================================
// Talay — Datos del blog / artículos (desde Supabase)
// ============================================================
// Mismo patrón que reviews-data.js y products-data.js:
// window.TALAY_ARTICLES empieza vacío, se llena con los artículos
// publicados (creados desde el panel de administrador) y al
// terminar se dispara "talay:articles-ready".
// ============================================================

window.TALAY_ARTICLES = [];

(async function loadArticles() {
  try {
    var client = window.supabaseClient;
    if (!client) throw new Error('supabaseClient no está definido. Revisa que supabase-client.js se cargue antes que este archivo.');

    var result = await client
      .from('articles')
      .select('id, slug, title, excerpt, content, cover_image, author, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (result.error) throw result.error;

    window.TALAY_ARTICLES = result.data || [];
  } catch (err) {
    console.error('No se pudieron cargar los artículos desde Supabase:', err);
    window.TALAY_ARTICLES = [];
  } finally {
    document.dispatchEvent(new CustomEvent('talay:articles-ready'));
  }
})();
