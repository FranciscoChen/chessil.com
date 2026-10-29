function heartbeat(connection) {
  clearTimeout(connection.pingTimeout);
  connection.pingTimeout = setTimeout(() => {
    connection.close()
  }, 4000 + 1000);
}
let regionalServers;
let latencyProbe;
window.chessilGameServers = function () {
  if (!regionalServers) regionalServers = fetch('/game-servers', { cache:'no-store' })
    .then(response => { if (!response.ok) throw new Error('Server discovery failed'); return response.json(); })
    .catch(error => { regionalServers = null; throw error; });
  return regionalServers;
};
window.chessilMeasureLatency = function () {
  if (latencyProbe) return latencyProbe;
  latencyProbe = window.chessilGameServers().then(servers => Promise.all(servers.filter(server=>server.enabled !== false).map(server => new Promise(resolve => {
    let socket, timer;
    const finish = () => { clearTimeout(timer); if(socket && socket.readyState < 2) socket.close(); resolve(); };
    try {
      socket = new WebSocket(server.url);
      timer = setTimeout(finish, 2500);
      socket.onmessage = event => {
        if(event.data === 'a') socket.send('b');
        if(event.data === '1') socket.send('0');
      };
      socket.onclose = finish;
      socket.onerror = finish;
    } catch (_) { finish(); }
  })))).catch(() => {}).finally(() => { latencyProbe = null; });
  return latencyProbe;
};
function wsconnect() {
  window.chessilMeasureLatency();
  const timer = setInterval(() => { if(!document.hidden) window.chessilMeasureLatency(); }, 60000);
  window.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
}

function notifyconnect() {
  const url = window.notifyWsUrl || "wss://chessil.com/notify";
  const wsc = new WebSocket(url);
  const pingIntervalMs = 25000;
  let pingTimer = null;

  function startPing() {
    if (pingTimer) clearInterval(pingTimer);
    pingTimer = setInterval(() => {
      if (wsc.readyState === WebSocket.OPEN) {
        wsc.send('ping');
      }
    }, pingIntervalMs);
  }

  wsc.onopen = () => {
    startPing();
  };

  wsc.onmessage = (event) => {
    if (event.data === 'pong') return;
    try {
      const payload = JSON.parse(event.data);
      const evt = new CustomEvent('chessil:notify', { detail: payload });
      window.dispatchEvent(evt);
    } catch (err) {
      // Ignore malformed payloads
    }
  };

  wsc.onclose = () => {
    if (pingTimer) clearInterval(pingTimer);
  };
}

window.chessilWaitForGame = async function (gameid) {
  for (let attempt=0; attempt<90; attempt++) {
    const response = await fetch('/lobby/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gameid})});
    if (!response.ok) throw new Error('Could not check game readiness');
    const status = await response.json();
    if (status.started) return;
    if (status.finished) throw new Error('This game has ended');
    await new Promise(resolve=>setTimeout(resolve,2000));
  }
  throw new Error('The game server is still connecting. Reload this page to retry.');
};
