window.TALAY_EVENTS = [];

(async function loadEvents() {
  try {
    var client = window.supabaseClient;
    if (!client) throw new Error('supabaseClient no está definido. Revisa que supabase-client.js se cargue antes que este archivo.');

    var result = await client
      .from('events')
      .select('id, title, event_date, event_time, location, registration_url')
      .order('event_date', { ascending: true });

    if (result.error) throw result.error;

    window.TALAY_EVENTS = result.data || [];
  } catch (err) {
    console.error('No se pudieron cargar los eventos desde Supabase:', err);
    window.TALAY_EVENTS = [];
  } finally {
    document.dispatchEvent(new CustomEvent('talay:events-ready'));
  }
})();