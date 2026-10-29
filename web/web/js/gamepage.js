const gameUiMessages = {
  en: {guest:'Guest', connecting:'Connecting…', disconnected:'Not connected', watching:'Spectating', white:'Playing as White', black:'Playing as Black', review:'Game review', history:'Use the arrows to review the game.', historyLive:'Review moves after the game.', guidance:'Drag a piece, or tap a piece and its destination.', watchingHelp:'You are watching this game.', draw:'Offer draw', accept:'Accept draw', offered:'Draw offered', copied:'Link copied', copyFailed:'Copy failed', copyError:'Unable to copy the link.'},
  es: {guest:'Invitado', connecting:'Conectando…', disconnected:'Sin conexión', watching:'Espectador', white:'Jugando con blancas', black:'Jugando con negras', review:'Revisión de la partida', history:'Usa las flechas para revisar la partida.', historyLive:'Revisa las jugadas al terminar la partida.', guidance:'Arrastra una pieza o toca la pieza y su destino.', watchingHelp:'Estás viendo esta partida.', draw:'Ofrecer tablas', accept:'Aceptar tablas', offered:'Tablas ofrecidas', copied:'Enlace copiado', copyFailed:'No se pudo copiar', copyError:'No se pudo copiar el enlace.'},
  zh: {guest:'游客', connecting:'正在连接…', disconnected:'未连接', watching:'观战中', white:'你执白方', black:'你执黑方', review:'回顾对局', history:'使用箭头回顾对局。', historyLive:'对局结束后可回顾棋谱。', guidance:'拖动棋子，或依次点击棋子和目标格。', watchingHelp:'你正在观看这场对局。', draw:'提议和棋', accept:'接受和棋', offered:'已提议和棋', copied:'链接已复制', copyFailed:'复制失败', copyError:'无法复制链接。'}
}

function gameUiState() {
  const text = gameUiMessages[document.documentElement.lang] || gameUiMessages.en
  const state = Number.isFinite(Number(stat)) ? Number(stat) : Number(document.querySelector('[data-game-field="state"]')?.dataset.state)
  const waiting = state === -1
  const live = state === 0 && !gamefinished
  const connected = gameConnectionReady && wsc && wsc.readyState === WebSocket.OPEN
  document.body.dataset.gameLive = String(live)
  const actions = document.querySelector('.game-actions .ricons'), followup = document.querySelector('.game-followup')
  if (actions) actions.hidden = !live || watcher
  if (followup) followup.hidden = live && !watcher
  const ownOffer = live && events.length && events[events.length-1] === playerside+'2' && Number(eventstimes[eventstimes.length-1]) > Number(lastmovetime)
  const otherOffer = live && events.length && events[events.length-1][1] === '2' && !ownOffer && Number(eventstimes[eventstimes.length-1]) > Number(lastmovetime)
  document.querySelectorAll('.game-actions .fbt').forEach(button => {
    button.disabled = !live || watcher || !connected || (button.classList.contains('draw-yes') && !!ownOffer)
  })
  const draw = document.querySelector('.game-actions .draw-yes span')
  if (draw) draw.textContent = ownOffer ? text.offered : otherOffer && !watcher ? text.accept : text.draw
  document.querySelector('.game-actions .draw-yes')?.classList.toggle('is-offered', !!(ownOffer || otherOffer))
  document.querySelectorAll('moves-panel .buttons button').forEach(button => { button.disabled = live || waiting })
  const perspective = document.getElementById('game-perspective')
  if (perspective) perspective.textContent = waiting ? document.querySelector('[data-game-field="state"]').textContent : !live ? text.review : !connected ? (wsc && wsc.readyState === WebSocket.CLOSED ? text.disconnected : text.connecting) : watcher ? text.watching : playerside === 'b' ? text.black : text.white
  const hint = document.getElementById('history-hint')
  if (hint) hint.textContent = live ? text.historyLive : text.history
  const guidance = document.getElementById('game-guidance')
  if (guidance) guidance.textContent = !live ? text.history : watcher ? text.watchingHelp : text.guidance
  document.querySelectorAll('.game-player .rclock').forEach(element => {
    const running = !!(live && connected && uci.length > 1 && element.classList.contains('rclock-'+(turn === 'w' ? 'white' : 'black')))
    element.classList.toggle('running', running)
    const player = element.closest('.game-player')
    player?.classList.toggle('is-turn', running)
    const color = player?.querySelector('.player-meta span')
    if (color) player.setAttribute('aria-label',color.textContent)
  })
}

document.addEventListener('DOMContentLoaded', () => {
  const text = gameUiMessages[document.documentElement.lang] || gameUiMessages.en
  const share = document.getElementById('share-game')
  share?.addEventListener('click', async () => {
    const original = share.textContent
    try {
      await navigator.clipboard.writeText(location.origin+location.pathname)
      share.textContent = text.copied
      document.getElementById('share-status').textContent = text.copied
      setTimeout(() => {share.textContent=original},2000)
    } catch (_) {
      document.getElementById('share-status').textContent=text.copyError
      share.textContent=text.copyFailed
      setTimeout(() => {share.textContent=original},2000)
    }
  })
  const promotion = document.querySelector('.material-bottom')
  for (const type of ['pointerdown','pointermove','pointerup','touchstart','touchmove','touchend']) {
    promotion?.addEventListener(type, event => event.stopPropagation())
  }
})

function gamepageload() {
  const match = window.location.pathname.match(/\/game\/([a-zA-Z0-9]{9})/)
  if (!match) {
    return
  }

  fetch('/gameinfo', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: match[1]
  })
    .then((resp) => {
      if (!resp.ok) throw new Error('gameinfo failed')
      return resp.json()
    })
    .then(async (data) => {
      if (data.state === -1 && window.chessilWaitForGame) {
        await window.chessilWaitForGame(match[1]);
        return gamepageload();
      }
      const lang = document.documentElement.lang || 'en'
      const ratedLabel = {
        en: 'Rated',
        es: 'Clasificatoria',
        zh: '\u6392\u4f4d'
      }[lang] || 'Rated'
      const casualLabel = {
        en: 'Casual',
        es: 'Amistosa',
        zh: '\u53cb\u8c0a'
      }[lang] || 'Casual'

      const name1 = document.querySelector('[data-game-field="username1"]')
      const name2 = document.querySelector('[data-game-field="username2"]')
      const rating1 = document.querySelector('[data-game-field="rating1"]')
      const rating2 = document.querySelector('[data-game-field="rating2"]')
      const status = document.querySelector('[data-game-field="state"]')
      const setup = document.querySelector('[data-game-field="setup"]')

      if (name1) name1.textContent = data.username1 || (gameUiMessages[lang] || gameUiMessages.en).guest
      if (name2) name2.textContent = data.username2 || (gameUiMessages[lang] || gameUiMessages.en).guest
      if (rating1) rating1.textContent = data.rating1 == null ? '-' : String(data.rating1)
      if (rating2) rating2.textContent = data.rating2 == null ? '-' : String(data.rating2)
      const state = Number(data.state)
      if (status) {
        status.dataset.state = String(state)
        status.textContent = state === 0 ? ({en: 'Playing', es: 'En curso', zh: '进行中'}[lang] || 'Playing') : state === -1 ? ({en: 'Waiting for an opponent', es: 'Esperando un rival', zh: '等待对手'}[lang] || 'Waiting for an opponent') : ({en: 'Finished', es: 'Finalizada', zh: '已结束'}[lang] || 'Finished')
      }

      const ratedText = data.rated ? ratedLabel : casualLabel
      const separator = ' \u2022 '
      const setupText = String(data.initialtime) + '+' + String(data.increment) + separator + ratedText

      if (setup) {
        setup.textContent = setupText
        setup.dataset.timeControl = String(data.initialtime) + '+' + String(data.increment)
        setup.dataset.rated = ratedText
        setup.dataset.server = data.gameserver || ''
        setup.dataset.side = data.side || 's'
      }

      if (state !== -1 && typeof roundstart === 'function') {
        roundstart()
      }
      const list = document.querySelector('moves-list')
      const empty = document.getElementById('moves-empty')
      if (list && empty) {
        const update = () => { empty.hidden = list.childElementCount > 0; gameUiState() }
        const observer = new MutationObserver(update)
        observer.observe(list, {childList:true})
        update()
        window.addEventListener('pagehide', () => observer.disconnect(), {once:true})
      }

    })
    .catch(error => {
      console.error('Game initialization failed:', error)
      const status = document.querySelector('[data-game-field="state"]')
      if (status) {
        status.setAttribute('role', 'alert')
        status.textContent = {en: 'Unable to load the game. Please reload.', es: 'No se pudo cargar la partida. Recarga la página.', zh: '无法加载对局，请刷新页面。'}[document.documentElement.lang] || 'Unable to load the game. Please reload.'
      }
    })
}
