function getFilters() {
  return {
    rated: document.getElementById("filter-rated").value || "1",
    eloMin: document.getElementById("filter-elo-min").value,
    eloMax: document.getElementById("filter-elo-max").value,
    username: document.getElementById("filter-username").value,
    color: document.getElementById("filter-color").value || "random",
    time: document.getElementById("filter-time").value || "5+0",
    mode: document.getElementById("filter-mode").value || "play"
  };
}

function loadLobby() {
  var filters = getFilters();

  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/lobby/list", true);
  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.onload = function () {
    if (xhr.status === 200) {
      var data = JSON.parse(xhr.responseText);
      renderTable(data);
    } else {
      console.error("Failed to load lobby");
    }
  };

  xhr.send(JSON.stringify(filters));
}

function renderTable(data) {
  var container = document.querySelector(".results-flex");
  container.innerHTML = "";

  if (!data || data.length === 0) {
    container.textContent = "No results";
    return;
  }

  var table = document.createElement("table");
  var thead = document.createElement("thead");
  var headerRow = document.createElement("tr");

  var columns = [
    { key: "username", label: "User" },
    { key: "elo", label: "Elo" },
    { key: "time", label: "Time" },
    { key: "rated", label: "Rated" },
    { key: "action", label: "" }
  ];

  columns.forEach(function (col) {
    var th = document.createElement("th");
    th.textContent = col.label;
    headerRow.appendChild(th);
  });

  thead.appendChild(headerRow);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");

  data.forEach(function (row) {
    var tr = document.createElement("tr");

    columns.forEach(function (col) {
      var td = document.createElement("td");

      if (col.key === "action") {
        var btn = document.createElement("button");
        btn.className = "icon-play";
        btn.onclick = (function (gameId) {
          return function () {
            sendAction(gameId, "join");
          };
        })(row.id);
        td.appendChild(btn);
      } else {
        td.textContent = row[col.key];
      }

      td.setAttribute("data-label", col.label);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.appendChild(table);
}

function sendAction(gameId, action) {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", "/lobby/action", true);
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(JSON.stringify({ id: gameId, action: action }));
}

window.addEventListener("DOMContentLoaded", function () {
  var inputs = document.querySelectorAll(".query-flex select, .query-flex input");
  inputs.forEach(function (el) {
    el.addEventListener("change", loadLobby);
    el.addEventListener("keyup", function (e) {
      if (e.key === "Enter") loadLobby();
    });
  });

  // Initial load with defaults
  loadLobby();
});

document.getElementById('create-game').addEventListener('click', function () {
  var filters = collectFilters(); // reuse your existing function

  const payload = {
    rated: filters.rated,
    timecontrol: filters.time,
    color: (!filters.rated && filters.color ? filters.color : null)
  };

  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/lobby/create', true);
  xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
  xhr.onreadystatechange = function () {
    if (xhr.readyState === 4 && xhr.status === 200) {
      var res = JSON.parse(xhr.responseText);
      if (res.success) {
        loadLobby(); // reload games list
      } else {
        console.error(res.error || "Game creation failed");
      }
    }
  };
  xhr.send(JSON.stringify(payload));
});
