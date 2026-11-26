(() => {
  const host = document.querySelector('[data-archive]');
  if (!host) return;
  const form = host.querySelector('form'), rows = host.querySelector('tbody');
  const more = host.querySelector('[data-more]'), status = host.querySelector('[data-list-status]');
  const language = document.documentElement.lang;
  const number = new Intl.NumberFormat(language);
  const decimal = new Intl.NumberFormat(language,{maximumFractionDigits:2,signDisplay:'exceptZero'});
  const percent = new Intl.NumberFormat(language,{style:'percent',maximumFractionDigits:1});
  const format = (value,formatter) => value == null ? '—' : formatter.format(value);
  const statsError = host.querySelector('[data-stats-error]');
  const metrics = new Map([...host.querySelectorAll('[data-stat]')].map(node=>[node.dataset.stat,node]));
  let statsBusy = false;
  let cursor = null, controller, filters;
  const fields = ['q','perspective','outcome'];
  const saved = new URLSearchParams(location.search);
  for (const key of fields) {
    const field = form.elements[key], value = saved.get(key);
    if (value !== null && (key === 'q' || [...field.options].some(option=>option.value===value))) field.value = value;
  }
  function selectedFilters() {
    const params = new URLSearchParams();
    for (const key of fields) {
      const value = form.elements[key].value.trim();
      if (value && (key !== 'perspective' || value !== 'hybrid')) params.set(key,value);
    }
    return params;
  }
  filters = selectedFilters();
  function link(href,text) {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    return a;
  }
  async function refreshStatistics() {
    if (document.hidden || statsBusy) return;
    statsBusy = true;
    try {
      const response = await fetch('/api/archive/stats',{signal:AbortSignal.timeout(8000)});
      if (!response.ok) throw Error();
      const stats = await response.json();
      const paired = stats.paired;
      const interval = paired.interval;
      const values = {
        games:number.format(stats.games),flags:number.format(stats.flags),score:format(stats.score,percent),
        wins:number.format(stats.wins),draws:number.format(stats.draws),losses:number.format(stats.losses),
        pairs:number.format(paired.pairs),elo:format(paired.elo,decimal),los:format(paired.los,percent),
        llr:format(paired.llr,decimal),lower:decimal.format(paired.lower),upper:decimal.format(paired.upper),
        interval:interval ? (interval[0]===null?'−∞':decimal.format(interval[0]))+' … '+
          (interval[1]===null?'+∞':decimal.format(interval[1])) : '—'
      };
      for (const [key,text] of Object.entries(values)) metrics.get(key).textContent = text;
      for (const key of ['wins','draws','losses']) {
        host.querySelector('.archive-wdl [data-outcome="'+key+'"]').style.setProperty('--fraction',
          (stats.games ? 100*stats[key]/stats.games : 0)+'%');
      }
      host.querySelectorAll('[data-bin]').forEach((node,i)=>{
        node.querySelector('dd').textContent = number.format(paired.bins[i]);
        node.style.setProperty('--fraction',(paired.pairs?100*paired.bins[i]/paired.pairs:0)+'%');
      });
      const marker = host.querySelector('[data-marker]');
      marker.hidden = paired.llr === null;
      if (!marker.hidden) {
        const position = (paired.llr-paired.lower)/(paired.upper-paired.lower);
        marker.style.setProperty('--position',100*Math.max(0,Math.min(1,position))+'%');
      }
      statsError.hidden = true;
    } catch (_) { statsError.hidden = false; }
    finally { statsBusy = false; }
  }
  async function load(append) {
    controller?.abort();
    const request = controller = new AbortController();
    const params = new URLSearchParams(filters);
    if (append && cursor) params.set('before',cursor);
    more.disabled = true;
    try {
      const response = await fetch('/api/archive?'+params,{signal:request.signal});
      if (!response.ok) throw Error();
      const {games,next} = await response.json();
      if (!append) {
        rows.replaceChildren();
        const heading = params.get('perspective')==='stockfish'?'stockfishResult':'hybridResult';
        host.querySelector('[data-result-heading]').textContent = host.dataset[heading];
      }
      for (const game of games) {
        const row = rows.insertRow(), players = row.insertCell();
        players.append(link('/game/'+game.id,game.white+' · '+game.black));
        const date = document.createElement('small');
        date.textContent = new Date(game.date).toLocaleString(language);
        players.append(document.createElement('br'),date);
        row.insertCell().textContent = game.opening;
        const result = row.insertCell(), outcome = document.createElement('strong'), score = document.createElement('small');
        result.className = 'archive-result';
        result.dataset.outcome = game.outcome;
        outcome.textContent = host.dataset[game.outcome];
        score.textContent = game.result;
        result.append(outcome,score);
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
    } finally { if (request===controller) more.disabled = false; }
  }
  function applyFilters() {
    filters = selectedFilters();
    cursor = null;
    const query = filters.toString();
    history.replaceState(null,'',location.pathname+(query?'?'+query:''));
    load(false);
  }
  form.addEventListener('submit',event=>{event.preventDefault();applyFilters();});
  for (const key of ['perspective','outcome']) form.elements[key].addEventListener('change',applyFilters);
  more.addEventListener('click',()=>load(true));
  load(false);
  refreshStatistics();
  const timer = setInterval(refreshStatistics,20000);
  document.addEventListener('visibilitychange',refreshStatistics);
  window.addEventListener('pagehide',event=>{if(!event.persisted)clearInterval(timer);});
})();
