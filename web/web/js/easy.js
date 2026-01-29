function easyGameMessages() {
  var lang = document.documentElement.lang || 'en';
  if (lang === 'es') {
    return {
      loadingBots: 'Buscando bots disponibles...',
      starting: 'Creando la partida...',
      redirecting: 'Entrando en la partida...',
      failed: 'No se pudo iniciar la partida. Intenta nuevamente.',
      failedBots: 'No se pudieron cargar los bots. Revisa tu conexion y vuelve a intentar.',
      noBots: 'No hay bots disponibles.',
      play: 'Jugar',
      headers: ['Bot', 'Elo', 'Elo UCI', 'Accion']
    };
  }
  if (lang === 'zh') {
    return {
      loadingBots: '\u6b63\u5728\u83b7\u53d6\u673a\u5668\u4eba...',
      starting: '\u6b63\u5728\u521b\u5efa\u5bf9\u5c40...',
      redirecting: '\u6b63\u5728\u8fdb\u5165\u5bf9\u5c40...',
      failed: '\u65e0\u6cd5\u5f00\u59cb\u5bf9\u5c40\u3002\u8bf7\u91cd\u8bd5\u3002',
      failedBots: '\u65e0\u6cd5\u83b7\u53d6\u673a\u5668\u4eba\u5217\u8868\u3002\u8bf7\u68c0\u67e5\u7f51\u7edc\u540e\u91cd\u8bd5\u3002',
      noBots: '\u6682\u65e0\u53ef\u7528\u673a\u5668\u4eba\u3002',
      play: '\u5f00\u59cb\u5bf9\u5c40',
      headers: ['\u673a\u5668\u4eba', 'Elo', 'UCI Elo', '\u64cd\u4f5c']
    };
  }
  return {
    loadingBots: 'Loading available bots...',
    starting: 'Creating game...',
    redirecting: 'Joining game...',
    failed: 'Could not start the game. Please try again.',
    failedBots: 'Could not load bots. Check your connection and try again.',
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
  var quickStartBtn = document.getElementById('easy-quick-start');
  var messages = easyGameMessages();

  if (!rated || !color || !time || !filterBy || !list || !status || !quickStartBtn) return;

  var state = {
    loading: false
  };

  function setStatus(text) {
    status.textContent = text || '';
  }

  function setLoading(isLoading, message) {
    state.loading = !!isLoading;
    list.classList.toggle('easy-loading', state.loading);
    list.setAttribute('aria-busy', state.loading ? 'true' : 'false');
    if (state.loading) {
      setStatus(message || messages.loadingBots);
    }
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
    color.setAttribute('aria-disabled', isRated ? 'true' : 'false');
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
    setLoading(false);

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
      btn.className = 'easy-cta';
      btn.textContent = messages.play;
      btn.setAttribute('aria-label', messages.play + ' ' + (bot.username || 'bot'));
      btn.onclick = function () { startGame(bot.id); };
      actionTd.appendChild(btn);
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    list.appendChild(table);
  }

  function loadBots() {
    setLoading(true, messages.loadingBots);
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
        setLoading(false);
        setStatus(messages.failedBots);
      });
  }

  function selectClosestBots(bots, target, count) {
    if (!bots || bots.length === 0) return [];
    var scored = bots.map(function (bot) {
      var rating = Number.isFinite(Number(bot.rating)) ? Number(bot.rating) : null;
      if (rating === null || rating === 0) {
        rating = Number.isFinite(Number(bot.uci_elo)) ? Number(bot.uci_elo) : 1500;
      }
      return { bot: bot, score: Math.abs(rating - target) };
    });
    scored.sort(function (a, b) { return a.score - b.score; });
    return scored.slice(0, count).map(function (entry) { return entry.bot; });
  }

  function getTargetRating() {
    return fetch('/myrating', { method: 'POST' })
      .then(function (resp) {
        if (!resp.ok) return null;
        return resp.json();
      })
      .then(function (data) {
        var rating = data && Number.isFinite(Number(data.rating)) ? Number(data.rating) : null;
        var target = rating ? Math.round(rating) - 500 : 1300;
        if (target < 1300) target = 1300;
        return target;
      })
      .catch(function () {
        return 1300;
      });
  }

  function quickStart() {
    setLoading(true, messages.loadingBots);
    getTargetRating()
      .then(function (target) {
        return fetch('/easy/bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timecontrol: time.value || '5+0',
            filterBy: 'rating',
            eloMin: null,
            eloMax: null
          })
        })
          .then(function (resp) {
            if (!resp.ok) throw new Error('bots failed');
            return resp.json();
          })
          .then(function (bots) {
            var closest = selectClosestBots(bots, target, 1);
            if (!closest || closest.length === 0) throw new Error('no bots');
            return closest[0].id;
          });
      })
      .then(function (botId) {
        setLoading(false);
        startGame(botId, { rated: false, timecontrol: time.value, color: color.value });
      })
      .catch(function () {
        setLoading(false);
        setStatus(messages.noBots);
      });
  }

  function startGame(botId, overrides) {
    var filters = currentFilters();
    var ratedValue = overrides && typeof overrides.rated === 'boolean' ? (overrides.rated ? '1' : '0') : filters.rated;
    var timeValue = overrides && overrides.timecontrol ? overrides.timecontrol : filters.timecontrol;
    var colorValue = overrides && overrides.color ? overrides.color : filters.color;

    setStatus(messages.starting);

    var botColor = null;
    if (ratedValue !== '1') {
      if (colorValue === 'white') botColor = 'black';
      if (colorValue === 'black') botColor = 'white';
    }
    fetch('/lobby/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        botId: botId,
        easy: true,
        rated: ratedValue === '1',
        timecontrol: timeValue,
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
          setStatus(messages.redirecting);
          window.location.href = '/game/' + data.gameid;
        } else {
          throw new Error('missing gameid');
        }
      })
      .catch(function () {
        setStatus(messages.failed);
      });
  }

  function debounce(fn, delay) {
    var timer = null;
    return function () {
      var args = arguments;
      clearTimeout(timer);
      timer = setTimeout(function () {
        fn.apply(null, args);
      }, delay);
    };
  }

  var debouncedLoad = debounce(loadBots, 250);

  quickStartBtn.addEventListener('click', quickStart);

  rated.addEventListener('change', function () {
    updateColorState();
  });
  filterBy.addEventListener('change', function () {
    applyFilterDefaults().then(loadBots).catch(function () {
      setStatus(messages.failedBots);
    });
  });
  time.addEventListener('change', loadBots);
  if (eloMin) eloMin.addEventListener('input', debouncedLoad);
  if (eloMax) eloMax.addEventListener('input', debouncedLoad);

  updateColorState();
  applyFilterDefaults().then(loadBots).catch(function () {
    setStatus(messages.failedBots);
  });
});
