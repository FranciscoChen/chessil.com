function heartbeat(connection) {
  clearTimeout(connection.pingTimeout);
  connection.pingTimeout = setTimeout(() => {
    connection.close()
  }, 4000 + 1000);
}
function wsconnect(server) {
  const wsc = new WebSocket("wss://ws0.chessil.com/ping");
  wsc.onopen = (event) => {
    heartbeat(wsc)
  }
  wsc.onmessage = (event) => {
    if (event.data === '1') {
      wsc.send('0')
      heartbeat(wsc)
    }
    if (event.data === 'a') {
      wsc.send('b')
    }
  }
  wsc.onclose = (event) => {
    clearTimeout(wsc.pingTimeout);
  }
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
