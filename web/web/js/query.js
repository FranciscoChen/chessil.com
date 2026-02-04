function collectFilters() {
  var timeGroup = document.getElementById('timeGroup').value;
  var timeValue = timeGroup === 'any' ? '' : document.getElementById('time').value;
  return {
    rated: document.getElementById('rated').value,
    color: document.getElementById('color').value,
    time: timeValue,
    eloMin: document.getElementById('eloMin').value,
    eloMax: document.getElementById('eloMax').value,
    username: document.getElementById('username').value,
    mode: document.getElementById('mode').value
  };
}

var pendingGameId = null;
var pendingEventSource = null;
var createStatusEl = null;

function ensureCreateStatusEl() {
  if (createStatusEl) return createStatusEl;
  createStatusEl = document.getElementById('create-status');
  return createStatusEl;
}

function setCreateStatus(message) {
  var el = ensureCreateStatusEl();
  if (!el) return;
  el.textContent = message || '';
}

function watchPendingGame(gameid) {
  if (!gameid) return;
  pendingGameId = gameid;
  setCreateStatus('Waiting for opponent...');
  if (pendingEventSource) {
    pendingEventSource.close();
  }
  pendingEventSource = new EventSource('/lobby/watch?gameid=' + encodeURIComponent(gameid));
  pendingEventSource.onmessage = function (event) {
    var res;
    try {
      res = JSON.parse(event.data);
    } catch (e) {
      return;
    }
    if (res && res.started && res.gameid) {
      pendingEventSource.close();
      window.location.href = '/game/' + res.gameid;
    }
  };
}

function loadLobby() {
  var filters = collectFilters();
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/lobby/list', true);
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var games = JSON.parse(xhr.responseText);
      renderLobby(games);
    }
  };
  xhr.send(JSON.stringify(filters));
}

function renderLobby(games) {
  var container = document.querySelector('.results-flex');
  container.innerHTML = '';

  // Detect if mobile
  var isMobile = window.innerWidth < 768;

  function resolveSides(row) {
    var p1 = { name: row.username1 || 'Anon', rating: row.rating1 || '-' };
    var p2 = { name: row.username2 || 'Open', rating: row.username2 ? (row.rating2 || '-') : '-' };

    if (row.color1 === 'white') return { white: p1, black: p2 };
    if (row.color1 === 'black') return { white: p2, black: p1 };
    return { white: p1, black: p2 };
  }

  function createPlayerCell(player) {
    var td = document.createElement('td');
    var name = document.createElement('div');
    name.textContent = player.name;
    var rating = document.createElement('div');
    rating.textContent = player.rating;
    td.appendChild(name);
    td.appendChild(rating);
    return td;
  }

  function actionForRow(row) {
    if (row.finished) return null;
    if (row.started) return { label: 'Watch', action: 'watch' };
    return { label: 'Join', action: 'join' };
  }

  if (!isMobile) {
    // === DESKTOP TABLE ===
    var table = document.createElement('table');
    var thead = document.createElement('thead');
    var headerRow = document.createElement('tr');

    ['White', 'Black', 'Rated', 'Time', 'Action'].forEach(function (h) {
      var th = document.createElement('th');
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    var tbody = document.createElement('tbody');
    games.forEach(function (row) {
      if (row.finished) return;
      var sides = resolveSides(row);
      var action = actionForRow(row);
      var tr = document.createElement('tr');
      tr.appendChild(createPlayerCell(sides.white));
      tr.appendChild(createPlayerCell(sides.black));
      tr.appendChild(createCell(row.rated ? 'Yes' : 'No'));
      tr.appendChild(createCell(row.timecontrol1 || ''));

      var actionTd = document.createElement('td');
      if (action) {
        var btn = document.createElement('button');
        btn.textContent = action.label;
        btn.onclick = function () { sendAction(row.id, action.action); };
        actionTd.appendChild(btn);
      }
      tr.appendChild(actionTd);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);

  } else {
    // === MOBILE CARDS ===
    games.forEach(function (row) {
      if (row.finished) return;
      var sides = resolveSides(row);
      var action = actionForRow(row);
      var card = document.createElement('div');
      card.className = 'game-card';

      var players = document.createElement('div');
      players.className = 'gc-players';
      var whiteLine = document.createElement('div');
      whiteLine.textContent = 'White: ' + sides.white.name;
      var whiteElo = document.createElement('div');
      whiteElo.textContent = sides.white.rating;
      var blackLine = document.createElement('div');
      blackLine.textContent = 'Black: ' + sides.black.name;
      var blackElo = document.createElement('div');
      blackElo.textContent = sides.black.rating;
      players.appendChild(whiteLine);
      players.appendChild(whiteElo);
      players.appendChild(blackLine);
      players.appendChild(blackElo);
      card.appendChild(players);

      var info = document.createElement('div');
      info.className = 'gc-info';
      info.textContent = (row.rated ? 'Rated' : 'Unrated') + ' • ' + (row.timecontrol1 || '');
      card.appendChild(info);

      var actions = document.createElement('div');
      actions.className = 'gc-actions';
      if (action) {
        var btn = document.createElement('button');
        btn.textContent = action.label;
        btn.onclick = function () { sendAction(row.id, action.action); };
        actions.appendChild(btn);
      }
      card.appendChild(actions);

      container.appendChild(card);
    });
  }
}


function createCell(text) {
  var td = document.createElement('td');
  td.textContent = text;
  return td;
}

function sendAction(id, action) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/lobby/action', true);
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var res;
      try {
        res = JSON.parse(xhr.responseText);
      } catch (e) {
        console.error('Invalid action response');
        return;
      }
      if (res && res.success && res.gameid) {
        window.location.href = '/game/' + res.gameid;
      }
    }
  };
  xhr.send(JSON.stringify({ id: id, action: action }));
}
document.addEventListener('DOMContentLoaded', function () {
  function openDialog(id) {
    var dialog = document.getElementById(id);
    if (!dialog) return;
    dialog.classList.remove('hidden');
  }

  function closeDialog(id) {
    var dialog = document.getElementById(id);
    if (!dialog) return;
    dialog.classList.add('hidden');
  }

  function setupBackdrop(id) {
    var dialog = document.getElementById(id);
    if (!dialog) return;
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) closeDialog(id);
    });
    var closeBtn = dialog.querySelector('[data-dialog-close]');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () { closeDialog(id); });
    }
  }

  var timeOptionsByGroup = {
    fast: ['1+0', '3+0', '3+2', '5+0'],
    slow: ['10+0', '15+10']
  };

  function syncTimeOptions(groupSelectId, timeSelectId, defaultValue) {
    var groupEl = document.getElementById(groupSelectId);
    var timeEl = document.getElementById(timeSelectId);
    if (!groupEl || !timeEl) return;
    var group = groupEl.value;
    if (group === 'any') {
      timeEl.innerHTML = '';
      timeEl.disabled = true;
      return;
    }
    var options = timeOptionsByGroup[group] || timeOptionsByGroup.fast;
    timeEl.disabled = false;
    timeEl.innerHTML = '';
    options.forEach(function (value) {
      var opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      timeEl.appendChild(opt);
    });
    if (defaultValue && options.indexOf(defaultValue) !== -1) {
      timeEl.value = defaultValue;
    } else {
      timeEl.value = options[0];
    }
  }

  function setFilterDefaults() {
    document.getElementById('rated').value = '';
    document.getElementById('color').value = 'random';
    document.getElementById('timeGroup').value = 'fast';
    syncTimeOptions('timeGroup', 'time', '5+0');
    document.getElementById('eloMin').value = '';
    document.getElementById('eloMax').value = '';
    document.getElementById('username').value = '';
    document.getElementById('mode').value = '';
  }

  function setCreateDefaults() {
    document.getElementById('create-rated').value = '0';
    document.getElementById('create-color').value = 'random';
    document.getElementById('create-time-group').value = 'fast';
    syncTimeOptions('create-time-group', 'create-time', '5+0');
    document.getElementById('create-color').disabled = false;
  }

  function syncCreateColorAvailability() {
    var ratedEl = document.getElementById('create-rated');
    var colorEl = document.getElementById('create-color');
    if (!ratedEl || !colorEl) return;
    if (ratedEl.value === '1') {
      colorEl.disabled = true;
      colorEl.value = 'random';
    } else {
      colorEl.disabled = false;
    }
  }

  setupBackdrop('filters-dialog');
  setupBackdrop('create-dialog');

  setFilterDefaults();
  setCreateDefaults();

  document.getElementById('open-filters').addEventListener('click', function () {
    openDialog('filters-dialog');
  });
  document.getElementById('open-create').addEventListener('click', function () {
    openDialog('create-dialog');
  });

  document.getElementById('timeGroup').addEventListener('change', function () {
    syncTimeOptions('timeGroup', 'time', '5+0');
  });
  document.getElementById('create-time-group').addEventListener('change', function () {
    syncTimeOptions('create-time-group', 'create-time', '5+0');
  });
  document.getElementById('create-rated').addEventListener('change', syncCreateColorAvailability);
  syncCreateColorAvailability();

  document.getElementById('filters-reset').addEventListener('click', function () {
    setFilterDefaults();
    loadLobby();
    closeDialog('filters-dialog');
  });
  document.getElementById('filters-apply').addEventListener('click', function () {
    loadLobby();
    closeDialog('filters-dialog');
  });

  // Create game
  document.getElementById('create-game-confirm').addEventListener('click', function () {
    var ratedValue = document.getElementById('create-rated').value;
    var rated = ratedValue === '1';
    var timecontrol = document.getElementById('create-time').value;
    var colorValue = document.getElementById('create-color').value;
    var color = (!rated && (colorValue === 'white' || colorValue === 'black')) ? colorValue : null;
    const payload = {
      rated: rated,
      timecontrol: timecontrol,
      color: color // unrated only
    };

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/lobby/create', true);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var res;
        try {
          res = JSON.parse(xhr.responseText);
        } catch (e) {
          console.error('Invalid create response');
          return;
        }
        if (res.success) {
          loadLobby();
          if (res.gameid) {
            watchPendingGame(res.gameid);
          }
          closeDialog('create-dialog');
        } else {
          console.error(res.error || "Game creation failed");
        }
      }
    };
    xhr.send(JSON.stringify(payload));
  });
  
  // Load default lobby
  loadLobby();
  
});
