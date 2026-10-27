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
    .then((data) => {
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

      if (name1) name1.textContent = data.username1 || 'Anon'
      if (name2) name2.textContent = data.username2 || 'Anon'
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
