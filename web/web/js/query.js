function collectFilters() {
  return {
    rated: document.getElementById('rated').value,
    color: document.getElementById('color').value,
    time: document.getElementById('time').value,
    eloMin: document.getElementById('eloMin').value,
    eloMax: document.getElementById('eloMax').value,
    username: document.getElementById('username').value,
    mode: document.getElementById('mode').value
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
  var table = document.createElement('table');
  var thead = document.createElement('thead');
  var headerRow = document.createElement('tr');

  ['Game ID', 'Players', 'Rated', 'Time', 'Action'].forEach(function (h) {
    var th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  games.forEach(function (row) {
    var tr = document.createElement('tr');
    tr.appendChild(createCell(row.gameid));
    tr.appendChild(createCell(
      (row.username1 || 'Anon') + ' (' + (row.rating1 || '-') + ')' +
      ' vs ' +
      (row.username2 || 'Anon') + ' (' + (row.rating2 || '-') + ')'
    ));
    tr.appendChild(createCell(row.rated ? 'Yes' : 'No'));
    tr.appendChild(createCell(row.timecontrol1 || ''));

    var actionTd = document.createElement('td');
    var btn = document.createElement('button');
    btn.textContent = 'Join'; // text is in HTML, safe for translations
    btn.onclick = function () { sendAction(row.id, "join"); };
    actionTd.appendChild(btn);
    tr.appendChild(actionTd);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
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
      console.log('Action response', xhr.responseText);
    }
  };
  xhr.send(JSON.stringify({ id: id, action: action }));
}
document.addEventListener('DOMContentLoaded', function () {

  // Toggle secondary filters
  document.getElementById('toggle-secondary').addEventListener('click', function () {
    document.querySelector('.filters-secondary').classList.toggle('hidden');
  });

  // Create game
  document.getElementById('create-game').addEventListener('click', function () {
    var filters = collectFilters();
    const payload = {
      rated: filters.rated,
      timecontrol: filters.time,
      color: (filters.rated === '0' ? filters.color : null) // unrated only
    };

    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/lobby/create', true);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var res = JSON.parse(xhr.responseText);
        if (res.success) {
          loadLobby();
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