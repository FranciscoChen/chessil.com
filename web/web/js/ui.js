/* Shared code-native symbols for compact toolbars. Names are internal constants. */
window.ChessilIcons={svg(name){const paths={chevron:'m6 9 6 6 6-6',flip:'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',plan:'M3 18h6v-6h6V6h6m-4-4 4 4-4 4',threat:'m13 2-9 12h7l-1 8L21 9h-8z',options:'M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6',play:'M8 5l11 7-11 7z',stop:'M6 6h12v12H6z',pause:'M8 5v14M16 5v14',close:'M6 6l12 12M18 6 6 18',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',source:'M8 6l-6 6 6 6M16 6l6 6-6 6',previous:'M6 5v14M18 6l-7 6 7 6',next:'M18 5v14M6 6l7 6-7 6',return:'M8 5l-5 5 5 5M3 10h11a6 6 0 0 1 0 12'};return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paths[name]||paths.close)+'"/></svg>';}};
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
    if (!link.hash && link.pathname.replace(/\/$/, '') === location.pathname.replace(/\/$/, '')) link.setAttribute('aria-current', 'page');
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
/* Center only when the displayed move changes; scrolling stays under user control. */
window.ChessilHistoryFocus=(()=>{
 const pending=new WeakMap(),sizing=new ResizeObserver(entries=>entries.forEach(({target})=>size(target)));
 function size(list){const value=Math.max(0,list.clientHeight/2-18)+'px';if(list.style.getPropertyValue('--history-block-pad')!==value)list.style.setProperty('--history-block-pad',value);}
 return (list,entry)=>{if(!list)return;const previous=pending.get(list),identity=entry?(entry.dataset.node||entry.getAttribute('ply')||entry):'root';
  if(previous?.identity===identity)return;if(previous?.frame)cancelAnimationFrame(previous.frame);if(!previous)sizing.observe(list);
  const state={identity};pending.set(list,state);state.frame=requestAnimationFrame(()=>{state.frame=0;if(!entry){list.scrollTop=0;list.scrollLeft=0;return;}if(!entry.isConnected)return;size(list);const outer=list.getBoundingClientRect(),inner=entry.getBoundingClientRect();if(list.scrollHeight>list.clientHeight+1)list.scrollTop+=inner.top+inner.height/2-outer.top-list.clientHeight/2;if(list.scrollWidth>list.clientWidth+1)list.scrollLeft+=inner.left+inner.width/2-outer.left-list.clientWidth/2;});
 };
})();
