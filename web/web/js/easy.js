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
  var list = document.getElementById('easy-bot-list');
  var status = document.getElementById('easy-status');
  var quickStartBtn = document.getElementById('easy-quick-start');
  var chooseDifficultyBtn = document.getElementById('easy-choose-difficulty');
  var stepDifficulty = document.getElementById('easy-step-difficulty');
  var stepTime = document.getElementById('easy-step-time');
  var stepColor = document.getElementById('easy-step-color');
  var stepRated = document.getElementById('easy-step-rated');
  var messages = easyGameMessages();

  if (!list || !stepDifficulty || !stepTime || !stepColor || !stepRated) return;

  var state = {
    difficulty: null,
    time: null,
    color: null,
    rated: null
  };

  function setStatus(text) {
    if (status) status.textContent = text || '';
  }

  function getUserRating() {
    return fetch('/myrating', { method: 'POST' })
      .then(function (resp) {
        if (!resp.ok) return null;
        return resp.json();
      })
      .then(function (data) {
        var rating = data && Number.isFinite(Number(data.rating)) ? Number(data.rating) : null;
        return rating;
      })
      .catch(function () { return null; });
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

    bots.forEach(function (bot) {
      var card = document.createElement('div');
      card.className = 'bot-card';

      var title = document.createElement('div');
      title.className = 'text';
      title.textContent = bot.username || 'Bot';

      var meta = document.createElement('div');
      meta.className = 'text';
      var ratingText = bot.rating != null ? String(bot.rating) : '-';
      var uciText = bot.uci_elo != null ? String(bot.uci_elo) : '-';
      meta.textContent = 'Elo ' + ratingText + ' · UCI ' + uciText;

      var btn = document.createElement('button');
      btn.className = 'action';
      btn.textContent = messages.play;
      btn.onclick = function () { startGame(bot.id); };

      card.appendChild(title);
      card.appendChild(meta);
      card.appendChild(btn);
      list.appendChild(card);
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

  function getTargetRating(rating) {
    var base = rating ? Math.round(rating) : 1300;
    var offsets = { easy: -500, balanced: -200, hard: 100, expert: 400 };
    var offset = offsets[state.difficulty] || -500;
    var target = base + offset;
    if (target < 1300) target = 1300;
    return target;
  }

  function loadBotsForState() {
    setStatus('');
    return getUserRating()
      .then(function (rating) {
        var target = getTargetRating(rating);
        return fetch('/easy/bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timecontrol: state.time || '5+0',
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
            renderBots(selectClosestBots(bots, target, 4));
          });
      })
      .catch(function () {
        setStatus(messages.failed);
      });
  }

  function quickStart() {
    setStatus(messages.starting);
    getUserRating()
      .then(function (rating) {
        var target = rating ? Math.round(rating) - 500 : 1300;
        if (target < 1300) target = 1300;
        return fetch('/easy/bots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timecontrol: '5+0',
            filterBy: 'rating',
            eloMin: null,
            eloMax: null
          })
        }).then(function (resp) {
          if (!resp.ok) throw new Error('bots failed');
          return resp.json().then(function (bots) {
            var closest = selectClosestBots(bots, target, 1);
            if (!closest || closest.length === 0) throw new Error('no bots');
            return closest[0].id;
          });
        });
      })
      .then(function (botId) {
        startGame(botId, { timecontrol: '5+0', rated: false, color: 'random' });
      })
      .catch(function () {
        setStatus(messages.noBots);
      });
  }

  function startGame(botId, overrides) {
    var ratedValue = overrides && typeof overrides.rated === 'boolean' ? (overrides.rated ? '1' : '0') : state.rated;
    var timeValue = overrides && overrides.timecontrol ? overrides.timecontrol : (state.time || '5+0');
    var colorValue = overrides && overrides.color ? overrides.color : (state.color || 'random');
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
          window.location.href = '/game/' + data.gameid;
        } else {
          throw new Error('missing gameid');
        }
      })
      .catch(function () {
        setStatus(messages.failed);
      });
  }

  function showStep(el) {
    if (el) el.classList.remove('none');
  }

  function hideStep(el) {
    if (el) el.classList.add('none');
  }

  function resetAfter(step) {
    if (step === 'difficulty') {
      state.time = null;
      state.color = null;
      state.rated = null;
      hideStep(stepTime);
      hideStep(stepColor);
      hideStep(stepRated);
      list.innerHTML = '';
    } else if (step === 'time') {
      state.color = null;
      state.rated = null;
      hideStep(stepColor);
      hideStep(stepRated);
      list.innerHTML = '';
    } else if (step === 'color') {
      state.rated = null;
      hideStep(stepRated);
      list.innerHTML = '';
    }
  }

  if (stepDifficulty) {
    stepDifficulty.querySelectorAll('button[data-difficulty]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.difficulty = btn.getAttribute('data-difficulty');
        resetAfter('difficulty');
        showStep(stepTime);
      });
    });
  }

  if (stepTime) {
    stepTime.querySelectorAll('button[data-time]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.time = btn.getAttribute('data-time');
        resetAfter('time');
        showStep(stepColor);
      });
    });
  }

  if (stepColor) {
    stepColor.querySelectorAll('button[data-color]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.color = btn.getAttribute('data-color');
        resetAfter('color');
        showStep(stepRated);
      });
    });
  }

  if (stepRated) {
    stepRated.querySelectorAll('button[data-rated]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.rated = btn.getAttribute('data-rated');
        loadBotsForState();
      });
    });
  }

  if (quickStartBtn) quickStartBtn.addEventListener('click', quickStart);
  if (chooseDifficultyBtn) {
    chooseDifficultyBtn.addEventListener('click', function () {
      var target = document.getElementById('difficulty');
      if (target && target.scrollIntoView) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
});
