document.addEventListener('DOMContentLoaded', function () {
  var form = document.getElementById('login-form');
  var messageEl = document.getElementById('login-message');
  var btn = document.getElementById('login-btn');

  // Si ya hay una sesión de administrador activa, saltamos directo al dashboard
  (async function checkExistingSession() {
    var sessionResult = await window.supabaseClient.auth.getSession();
    var session = sessionResult.data ? sessionResult.data.session : null;
    if (!session) return;

    var adminResult = await window.supabaseClient
      .from('admins')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle();

    if (adminResult.data) {
      window.location.href = 'admin-dashboard.html';
    }
  })();

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    messageEl.textContent = '';
    messageEl.className = 'form-message';
    btn.disabled = true;
    btn.textContent = 'Entrando…';

    var email = document.getElementById('login-email').value.trim();
    var password = document.getElementById('login-password').value;

    try {
      var signInResult = await window.supabaseClient.auth.signInWithPassword({ email: email, password: password });
      if (signInResult.error) throw signInResult.error;

      var userId = signInResult.data.user.id;

      var adminResult = await window.supabaseClient
        .from('admins')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!adminResult.data) {
        await window.supabaseClient.auth.signOut();
        throw new Error('Este usuario no tiene permisos de administrador.');
      }

      window.location.href = 'admin-dashboard.html';
    } catch (err) {
      messageEl.textContent = err.message || 'No se pudo iniciar sesión. Verifica tus datos.';
      messageEl.className = 'form-message error';
      btn.disabled = false;
      btn.textContent = 'Iniciar sesión';
    }
  });
});