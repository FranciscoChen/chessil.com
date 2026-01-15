function easyGameMessages() {
  var lang = document.documentElement.lang || 'en';
  if (lang === 'es') {
    return {
      starting: 'Iniciando partida...',
      failed: 'No se pudo iniciar la partida.',
      noBots: 'No hay bots disponibles.',
      play: 'Jugar',
      headers: ['Bot', 'Elo', 'UCI Elo', 'Accion']
    };
  }
  if (lang === 'zh') {
    return {
      starting: '\u6b63\u5728\u5f00\u59cb\u5bf9\u5c40...',
      failed: '\u65e0\u6cd5\u5f00\u59cb\u5bf9\u5c40\u3002',
      noBots: '\u6682\u65e0\u53ef\u7528\u673a\u5668\u4eba\u3002',
      play: '\u5f00\u59cb\u5bf9\u5c40',
      headers: ['\u673a\u5668\u4eba', 'Elo', 'UCI Elo', '\u64cd\u4f5c']
    };
  }
  return {
    starting: 'Starting game...',
    failed: 'Could not start the game.',
    noBots: 'No bots available.',
    play: 'Play',
    headers: ['Bot', 'Elo', 'UCI Elo', 'Action']
  };
}

document.addEventListener('DOMContentLoaded', function () {
  var rated = document.getElementById('easy-rated');
  var color = document.getElementById('easy-color');
  var time = document.getElementById('easy-time');
  var filterBy = document.getElementById('easy-filter-by');
  var eloMin = document.getElementById('easy-elo-min');
  var eloMax = document.getElementById('easy-elo-max');
  var list = document.getElementById('easy-bot-list');
  var status = document.getElementById('easy-status');
  var messages = easyGameMessages();

  if (!rated || !color || !time || !filterBy || !list) return;

  function setStatus(text) {
    if (status) status.textContent = text || '';
  }

  function currentFilters() {
    return {
      rated: rated.value,
      color: color.value,
      timecontrol: time.value,
      filterBy: filterBy.value,
      eloMin: eloMin && eloMin.value ? Number(eloMin.value) : null,
      eloMax: eloMax && eloMax.value ? Number(eloMax.value) : null
    };
  }

  function updateColorState() {
    var isRated = rated.value === '1';
    color.disabled = isRated;
  }

  function applyUciDefaults() {
    if (eloMin) eloMin.value = '1300';
    if (eloMax) eloMax.value = '2500';
  }

  function loadUserRatingDefault() {
    if (!eloMin || !eloMax) return Promise.resolve();
    return fetch('/myrating', { method: 'POST' })
      .then(function (resp) {
        if (!resp.ok) return null;
        return resp.json();
      })
      .then(function (data) {
        var rating = data && Number.isFinite(Number(data.rating)) ? Number(data.rating) : null;
        var min = rating ? Math.max(1300, Math.round(rating) - 500) : 1300;
        var max = rating ? Math.round(rating) + 500 : 2500;
        eloMin.value = String(min);
        eloMax.value = String(max);
      })
      .catch(function () {
        applyUciDefaults();
      });
  }

  function applyFilterDefaults() {
    if (!filterBy || !eloMin || !eloMax) return Promise.resolve();
    if (filterBy.value === 'uci_elo') {
      applyUciDefaults();
      return Promise.resolve();
    }
    return loadUserRatingDefault();
  }

  function renderBots(bots) {
    list.innerHTML = '';
    if (!bots || bots.length === 0) {
      var empty = document.createElement('div');
      empty.className = 'empty text';
      empty.textContent = messages.noBots;
      list.appendChild(empty);
      return;
    }

    var table = document.createElement('table');
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');
    messages.headers.forEach(function (label) {
      var th = document.createElement('th');
      th.textContent = label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    bots.forEach(function (bot) {
      var tr = document.createElement('tr');
      var nameTd = document.createElement('td');
      nameTd.textContent = bot.username || 'Bot';
      tr.appendChild(nameTd);
      var ratingTd = document.createElement('td');
      ratingTd.textContent = bot.rating != null ? String(bot.rating) : '-';
      tr.appendChild(ratingTd);
      var uciTd = document.createElement('td');
      uciTd.textContent = bot.uci_elo != null ? String(bot.uci_elo) : '-';
      tr.appendChild(uciTd);
      var actionTd = document.createElement('td');
      var btn = document.createElement('button');
      btn.textContent = messages.play;
      btn.onclick = function () { startGame(bot.id); };
      actionTd.appendChild(btn);
      tr.appendChild(actionTd);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    list.appendChild(table);
  }

  function loadBots() {
    setStatus('');
    var filters = currentFilters();
    fetch('/easy/bots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timecontrol: filters.timecontrol,
        filterBy: filters.filterBy,
        eloMin: filters.eloMin,
        eloMax: filters.eloMax
      })
    })
      .then(function (resp) {
        if (!resp.ok) throw new Error('bots failed');
        return resp.json();
      })
      .then(function (data) {
        renderBots(data);
      })
      .catch(function () {
        setStatus(messages.failed);
      });
  }

  function startGame(botId) {
    var filters = currentFilters();
    setStatus(messages.starting);
    var botColor = null;
    if (filters.rated !== '1') {
      if (filters.color === 'white') botColor = 'black';
      if (filters.color === 'black') botColor = 'white';
    }
    fetch('/lobby/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botId: botId,
        easy: true,
        rated: filters.rated === '1',
        timecontrol: filters.timecontrol,
        color: botColor
      })
    })
      .then(function (resp) {
        if (!resp.ok) throw new Error('create failed');
        return resp.json();
      })
      .then(function (data) {
        if (!data || !data.id) throw new Error('missing game id');
        return fetch('/lobby/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: data.id, action: 'join' })
        });
      })
      .then(function (resp) {
        if (!resp.ok) throw new Error('join failed');
        return resp.json();
      })
      .then(function (data) {
        if (data && data.gameid) {
          window.location.href = '/game/' + data.gameid;
        } else {
          throw new Error('missing gameid');
        }
      })
      .catch(function () {
        setStatus(messages.failed);
      });
  }

  rated.addEventListener('change', function () {
    updateColorState();
  });
  filterBy.addEventListener('change', function () {
    applyFilterDefaults().then(loadBots);
  });
  time.addEventListener('change', loadBots);
  if (eloMin) eloMin.addEventListener('input', loadBots);
  if (eloMax) eloMax.addEventListener('input', loadBots);

  updateColorState();
  applyFilterDefaults().then(loadBots);
});
