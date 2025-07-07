function getDataId(element, dataname) {
  if (!element || element.length === 0) {
    return false;
  }
  var parent = element;
  do {
    if (parent === document) {
      break;
    }
    if (parent.hasAttribute(dataname) === true) {
      return parent.getAttribute(dataname);
    }
  } while (parent = parent.parentNode);
  return false;
}
function calctc(min, sec) {
  const tt = min * 60 + sec * 40
  if (tt <= 15) return 4
  if (tt <= 180) return 3
  if (tt <= 480) return 2
  if (tt <= 1500) return 1
  return 0
}

function seekfunctions() {
  document.addEventListener('click', startseek)
  const rated = { en: 'Rated', es: 'Clasificatoria', zh: '排位' }[lang]
  const casual = { en: 'Casual', es: 'Amistosa', zh: '友谊' }[lang]
  const newgame = { en: 'New game', es: 'Nueva partida', zh: '新局' }[lang]
  const classical = { en: 'Classical', es: 'Clásica', zh: '慢棋' }[lang]
  const rapid = { en: 'Rapid', es: 'Rápida', zh: '快棋' }[lang]
  const blitz = { en: 'Blitz', es: 'Relámpago', zh: '闪电' }[lang]
  const bullet = { en: 'Bullet', es: 'Bala', zh: '子弹' }[lang]
  const ultrabullet = { en: 'Ultrabullet', es: 'Ultrabala', zh: '超弹' }[lang]
  const minsperside = { en: 'Minutes per side: ', es: 'Minutos por jugador: ', zh: '各方限时（分钟）：' }[lang]
  const incrinseconds = { en: 'Increment in seconds: ', es: 'Incremento en segundos: ', zh: '每步加时（秒）：' }[lang]
  const validtimes = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 35, 40, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]
  const validincrs = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 30, 35, 40, 45, 60, 90, 120, 150, 180]
  function seek(timecontrol) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/seek', true);
    if (document.getElementById('user_tag') === null) {
      xhr.send(timecontrol)
    } else {
      xhr.send(timecontrol)
    }
    xhr.onreadystatechange = function () {
      if (this.readyState != 4) return;
      if (this.status == 200) {
        // console.log(this.responseText)
        accept(this.responseText)
      }
    };
  }

  function accept(seekid) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/pairing', true);
    xhr.send(seekid)
    xhr.onreadystatechange = function () {
      if (this.readyState != 4) return;
      if (this.status == 201) {
        window.location.href = this.responseText
      }
    }
  }

  function startseek(e) {
    var timecontrol = getDataId(e.target, 'data-id')
    if (timecontrol !== false) {
      if (timecontrol === 'custom') {
        timecontrol = '5+0'
      }
      var min = timecontrol.split('+')[0]
      var sec = timecontrol.split('+')[1]
      var tc = calctc(min, sec)
      const lobby = document.getElementsByClassName('lobby')[0]
      const dialog = document.createElement('dialog')
      const closebutton = document.createElement('div')
      closebutton.setAttribute('class', 'close-button-anchor')
      closebutton.innerHTML = '<button class="close-button">x</button>'
      const scrollable = document.createElement('div')
      scrollable.setAttribute('class', 'scrollable')
      const gamesetup = document.createElement('div')
      gamesetup.setAttribute('class', 'dialog-content game-setup')


      const headertitle = document.createElement('h2')
      headertitle.innerHTML = newgame


      const timemode = document.createElement('div')
      timemode.setAttribute('class', 'ratings')
      timemode.innerHTML = '~ ' + { 0: classical, 1: rapid, 2: blitz, 3: bullet, 4: ultrabullet }[tc] + ' ~'


      const timeselection = document.createElement('div')
      timeselection.setAttribute('class', 'time-mode-config optional-config')
      timeselection.innerHTML = '<div class="time-choice range">' + minsperside + '<span>' + min + '</span><input class="range" type="range" min="0" max="38" value="' + validtimes.indexOf(1 * min) + '"></div>' + '<div class="increment-choice range">' + incrinseconds + '<span>' + sec + '</span><input class="range" type="range" min="0" max="30" value="' + validincrs.indexOf(1 * sec) + '"></div>'


      const colorsubmit = document.createElement('div')
      colorsubmit.setAttribute('class', 'color-submits')
      colorsubmit.innerHTML = '<button class="button button-metal color-submits__button black" value="black"><i></i></button>' + '<button class="button button-metal color-submits__button random" value="random"><i></i></button>' + '<button class="button button-metal color-submits__button white" value="white"><i></i></button>'


      const setupcontent = document.createElement('div')
      setupcontent.setAttribute('class', 'setup-content')
      gamesetup.appendChild(headertitle)
      gamesetup.appendChild(setupcontent)
      setupcontent.appendChild(timemode)
      setupcontent.appendChild(timeselection)
      if (document.getElementById('user_tag') !== null) {
        const ratedselection = document.createElement('div')
        ratedselection.setAttribute('class', 'mode-choice buttons')
        ratedselection.innerHTML = '<group class="radio"><div><input id="sf_mode_casual" class="checked_false" type="radio" value="casual"><label for="sf_mode_casual">' + casual + '</label></div><div><input id="sf_mode_rated" class="checked_true" type="radio" value="rated" checked=""><label for="sf_mode_rated" class="">' + rated + '</label></div></group>'
        setupcontent.appendChild(ratedselection)
      }
      setupcontent.appendChild(colorsubmit)

      scrollable.appendChild(gamesetup)
      dialog.appendChild(closebutton)
      dialog.appendChild(scrollable)
      lobby.appendChild(dialog)

      const minsdisplay = document.getElementsByClassName('time-choice')[0].getElementsByTagName('span')[0]
      const minsslider = document.getElementsByClassName('time-choice')[0].getElementsByTagName('input')[0]
      const incrdisplay = document.getElementsByClassName('increment-choice')[0].getElementsByTagName('span')[0]
      const incrslider = document.getElementsByClassName('increment-choice')[0].getElementsByTagName('input')[0]
      incrslider.oninput = function () {
        incrslider.setAttribute('value', incrslider.value)
        incrdisplay.innerHTML = validincrs[incrslider.value]
        const ntc = calctc(minsdisplay.innerHTML, validtimes[incrslider.value])
        if (ntc != tc) {
          tc = ntc
          timemode.innerHTML = '~ ' + { 0: classical, 1: rapid, 2: blitz, 3: bullet, 4: ultrabullet }[ntc] + ' ~'
        }
      }
      minsslider.oninput = function () {
        minsslider.setAttribute('value', minsslider.value)
        minsdisplay.innerHTML = validtimes[minsslider.value]
        const ntc = calctc(validtimes[minsslider.value], incrdisplay.innerHTML)
        if (ntc != tc) {
          tc = ntc
          timemode.innerHTML = '~ ' + { 0: classical, 1: rapid, 2: blitz, 3: bullet, 4: ultrabullet }[ntc] + ' ~'
        }
      }

      if (document.getElementById('user_tag') !== null) {
        const casualbtndiv = document.getElementById('sf_mode_casual').parentNode
        const ratedbtndiv = document.getElementById('sf_mode_rated').parentNode
        casualbtndiv.onclick = function () {
          ratedbtndiv.innerHTML = '<input id="sf_mode_rated" class="checked_false" type="radio" value="rated"><label for="sf_mode_rated" class="">' + rated + '</label>'
          casualbtndiv.innerHTML = '<input id="sf_mode_casual" class="checked_true" type="radio" value="casual" checked=""><label for="sf_mode_casual">' + casual + '</label>'
        }
        ratedbtndiv.onclick = function () {
          casualbtndiv.innerHTML = '<input id="sf_mode_casual" class="checked_false" type="radio" value="casual"><label for="sf_mode_casual">' + casual + '</label>'
          ratedbtndiv.innerHTML = '<input id="sf_mode_rated" class="checked_true" type="radio" value="rated" checked=""><label for="sf_mode_rated" class="">' + rated + '</label>'
        }
      }

      colorsubmit.getElementsByClassName('white')[0].onclick = function () {
        // Get the minutes tc
        const mins = minsdisplay.innerHTML
        // Get the increment tc
        const incr = incrdisplay.innerHTML
        if (mins == 0 && incr == 0) return
        // Get rated or unrated
        var ur = 'u'
        if (document.getElementById('user_tag') !== null) {
          ur = { rated: 'r', casual: 'u' }[document.getElementsByClassName('checked_true')[0].value]
        }
        // Get side
        const side = 'w'
        seek(mins + '+' + incr + ur + side)
        if (document.getElementsByClassName('seek')[0].className.indexOf('shown') === -1) {
          setTimeout(() => { document.getElementById('challenge-toggle').click() }, 200)
        }
        dialog.close()
        lobby.removeChild(dialog)
      }
      colorsubmit.getElementsByClassName('black')[0].onclick = function () {
        // Get the minutes tc
        const mins = minsdisplay.innerHTML
        // Get the increment tc
        const incr = incrdisplay.innerHTML
        if (mins == 0 && incr == 0) return
        // Get rated or unrated
        var ur = 'u'
        if (document.getElementById('user_tag') !== null) {
          ur = { rated: 'r', casual: 'u' }[document.getElementsByClassName('checked_true')[0].value]
        }
        // Get side
        const side = 'b'
        seek(mins + '+' + incr + ur + side)
        if (document.getElementsByClassName('seek')[0].className.indexOf('shown') === -1) {
          setTimeout(() => { document.getElementById('challenge-toggle').click() }, 200)
        }
        dialog.close()
        lobby.removeChild(dialog)
      }
      colorsubmit.getElementsByClassName('random')[0].onclick = function () {
        // Get the minutes tc
        const mins = minsdisplay.innerHTML
        // Get the increment tc
        const incr = incrdisplay.innerHTML
        if (mins == 0 && incr == 0) return
        // Get rated or unrated
        var ur = 'u'
        if (document.getElementById('user_tag') !== null) {
          ur = { rated: 'r', casual: 'u' }[document.getElementsByClassName('checked_true')[0].value]
        }
        // Get side
        const side = 'r'
        seek(mins + '+' + incr + ur + side)
        if (document.getElementsByClassName('seek')[0].className.indexOf('shown') === -1) {
          setTimeout(() => { document.getElementById('challenge-toggle').click() }, 200)
        }
        dialog.close()
        lobby.removeChild(dialog)

      }

      dialog.showModal()
      closebutton.onclick = function () {
        dialog.close()
        lobby.removeChild(dialog)
      }
      closebutton.onclick = function () {
        dialog.close()
        lobby.removeChild(dialog)
      }
    }
  }
}

