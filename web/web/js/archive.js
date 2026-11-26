(() => {
  const host = document.querySelector('[data-archive]');
  if (!host) return;
  const form = host.querySelector('form'), rows = host.querySelector('tbody');
  const more = host.querySelector('[data-more]'), status = host.querySelector('[role=status]');
  let cursor = null, controller, query = new URLSearchParams(location.search).get('q') || '';
  form.elements.q.value = query;
  function link(href,text) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    return a;
  }
  async function load(append) {
    controller?.abort();
    controller = new AbortController();
    const params = new URLSearchParams({q:query});
    if (append && cursor) params.set('before',cursor);
    more.disabled = true;
    try {
      const response = await fetch('/api/archive?'+params,{signal:controller.signal});
      if (!response.ok) throw Error();
      const {games,next} = await response.json();
      if (!append) rows.replaceChildren();
      for (const game of games) {
        const row = rows.insertRow(), players = row.insertCell();
        players.append(link('/game/'+game.id,game.white+' · '+game.black));
        const date = document.createElement('small');
        date.textContent = new Date(game.date).toLocaleString(document.documentElement.lang);
        players.append(document.createElement('br'),date);
        row.insertCell().textContent = game.opening;
        row.insertCell().textContent = game.result;
        const download = link('/api/archive/'+game.id+'.pgn','PGN');
        download.download = game.id+'.pgn';
        row.insertCell().append(download);
      }
      cursor = next;
      more.hidden = !next;
      status.textContent = rows.rows.length ? '' : host.dataset.empty;
    } catch(error) {
      if (error.name === 'AbortError') return;
      status.textContent = host.dataset.error;
    } finally { more.disabled = false; }
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    query = form.elements.q.value.trim();
    history.replaceState(null,'',location.pathname+(query?'?'+new URLSearchParams({q:query}):''));
    load(false);
  });
  more.addEventListener('click',()=>load(true));
  load(false);
})();
