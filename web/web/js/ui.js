/* Theme behavior is shared by header and settings. The server keeps the session preference. */
window.chessilTheme = async function (theme) {
  if (!['light', 'dark'].includes(theme)) return;
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll('[data-set-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setTheme === theme)));
  try {
    const response = await fetch(theme === 'light' ? '/light' : '/dark', { method: 'POST' });
    if (!response.ok) throw new Error('Theme could not be saved');
  } catch (_) {
    const status = document.querySelector('[data-theme-status]');
    if (status) status.textContent = document.documentElement.lang === 'zh' ? '主题已应用，但无法保存。' : document.documentElement.lang === 'es' ? 'Tema aplicado; no se pudo guardar.' : 'Theme applied. Could not save your preference.';
  }
};
document.addEventListener('DOMContentLoaded', () => {
  const main = document.querySelector('main, .main');
  if (main) {
    if (!main.id) main.id = 'main-content';
    const skip = document.createElement('a');
    skip.className = 'skip-link'; skip.href = '#' + main.id;
    skip.textContent = document.documentElement.lang === 'zh' ? '跳至内容' : document.documentElement.lang === 'es' ? 'Saltar al contenido' : 'Skip to content';
    document.body.prepend(skip);
  }
  document.querySelectorAll('nav a, .ui-sidebar a').forEach(link => {
    if (link.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '')) link.setAttribute('aria-current', 'page');
  });
  document.querySelectorAll('[data-set-theme]').forEach(button => {
    button.setAttribute('aria-pressed', String(button.dataset.setTheme === document.documentElement.dataset.theme));
    button.addEventListener('click', () => window.chessilTheme(button.dataset.setTheme));
  });
});
document.addEventListener('DOMContentLoaded', async () => {
  const entry = document.querySelector('[data-account-entry]');
  if (!entry) return;
  try {
    const response = await fetch('/loggedin', { method: 'POST' });
    if (response.ok && (await response.text()).trim() === '1') {
      entry.hidden = true;
      document.querySelector('[data-account-signed]').hidden = false;
    }
  } catch (_) { /* The sign-in entry remains available if the session cannot be read. */ }
});
