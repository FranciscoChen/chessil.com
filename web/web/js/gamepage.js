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
      if (status) status.textContent = String(data.state)

      const ratedText = data.rated ? ratedLabel : casualLabel
      const separator = ' \u2022 '
      const setupText =
        String(data.initialtime) +
        '+' +
        String(data.increment) +
        separator +
        ratedText +
        separator +
        String(data.gameserver || '') +
        separator +
        String(data.side || 's')

      if (setup) setup.textContent = setupText

      if (typeof roundstart === 'function') {
        roundstart()
      }
    })
    .catch(() => {
      // Ignore fetch errors; game page can still render without metadata.
    })
}
