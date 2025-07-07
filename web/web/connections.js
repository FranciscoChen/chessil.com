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
