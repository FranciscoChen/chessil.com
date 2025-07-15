var ultrabulletrating, bulletrating, blitzrating, rapidrating, classicalrating
var ultrabulletgames, bulletgames, blitzgames, rapidgames, classicalgames
var allgamescount, ratedgamescount, allwincount, alllosscount, alldrawcount, livegamecount
var allgamestab, ratedgamestab, allwintab, alllosstab, alldrawtab, livegametab
var infinitescroll
var allgames = {}
var currentpage = 1
var lastpage = false
function userpageload() {
  ultrabulletrating = document.getElementsByTagName('rating')[0].getElementsByTagName('strong')[0]
  bulletrating = document.getElementsByTagName('rating')[1].getElementsByTagName('strong')[0]
  blitzrating = document.getElementsByTagName('rating')[2].getElementsByTagName('strong')[0]
  rapidrating = document.getElementsByTagName('rating')[3].getElementsByTagName('strong')[0]
  classicalrating = document.getElementsByTagName('rating')[4].getElementsByTagName('strong')[0]
  ultrabulletgames = document.getElementsByTagName('rating')[0].getElementsByTagName('n')[0]
  bulletgames = document.getElementsByTagName('rating')[1].getElementsByTagName('n')[0]
  blitzgames = document.getElementsByTagName('rating')[2].getElementsByTagName('n')[0]
  rapidgames = document.getElementsByTagName('rating')[3].getElementsByTagName('n')[0]
  classicalgames = document.getElementsByTagName('rating')[4].getElementsByTagName('n')[0]
  allgamestab = document.getElementsByClassName('to-all')[0]
  ratedgamestab = document.getElementsByClassName('to-rated')[0]
  allwintab = document.getElementsByClassName('to-win')[0]
  alllosstab = document.getElementsByClassName('to-loss')[0]
  alldrawtab = document.getElementsByClassName('to-draw')[0]
  livegametab = document.getElementsByClassName('to-playing')[0]
  allgamescount = allgamestab.getElementsByTagName('strong')[0]
  ratedgamescount = ratedgamestab.getElementsByTagName('strong')[0]
  allwincount = allwintab.getElementsByTagName('strong')[0]
  alllosscount = alllosstab.getElementsByTagName('strong')[0]
  alldrawcount = alldrawtab.getElementsByTagName('strong')[0]
  livegamecount = livegametab.getElementsByTagName('strong')[0]
  infinitescroll = document.getElementsByClassName('infinite-scroll')[0]
  dbratings()
  function getgamecount() {
    if (document.visibilityState !== "visible") return
    dbgamecount(ultrabulletgames, 'ultrabullet', 'all', 'all', 'all')
    dbgamecount(bulletgames, 'bullet', 'all', 'all', 'all')
    dbgamecount(blitzgames, 'blitz', 'all', 'all', 'all')
    dbgamecount(rapidgames, 'rapid', 'all', 'all', 'all')
    dbgamecount(classicalgames, 'classical', 'all', 'all', 'all')
    dbgamecount(allgamescount, 'all', 'all', 'all', 'all')
    dbgamecount(ratedgamescount, 'all', 'all', 'true', 'all')
    dbgamecount(allwincount, 'all', 'win', 'all', 'true')
    dbgamecount(alllosscount, 'all', 'loss', 'all', 'true')
    dbgamecount(alldrawcount, 'all', 'draw', 'all', 'true')
  }
  setInterval(getgamecount, 48000);
  function getlivegamecount() {
    if (document.visibilityState !== "visible") return
    dbgamecount(livegamecount, 'all', 'all', 'all', 'false')
  }
  setInterval(getlivegamecount, 7000);
  //dbgamecount(element,tc,wdl,rated,finished)
  dbgamecount(ultrabulletgames, 'ultrabullet', 'all', 'all', 'all')
  dbgamecount(bulletgames, 'bullet', 'all', 'all', 'all')
  dbgamecount(blitzgames, 'blitz', 'all', 'all', 'all')
  dbgamecount(rapidgames, 'rapid', 'all', 'all', 'all')
  dbgamecount(classicalgames, 'classical', 'all', 'all', 'all')
  dbgamecount(allgamescount, 'all', 'all', 'all', 'all')
  dbgamecount(ratedgamescount, 'all', 'all', 'true', 'all')
  dbgamecount(allwincount, 'all', 'win', 'all', 'true')
  dbgamecount(alllosscount, 'all', 'loss', 'all', 'true')
  dbgamecount(alldrawcount, 'all', 'draw', 'all', 'true')
  dbgamecount(livegamecount, 'all', 'all', 'all', 'false')
  //dblivegamecount()
  dbgames()
  window.onscroll = function (ev) {
    if ((window.innerHeight + Math.round(window.scrollY)) >= document.body.offsetHeight) {
      // you're at the bottom of the page
      if (lastpage === false) {
        switch (document.getElementsByClassName('active')[0].classList[1]) {
          case 'to-all': {
            dbgames(currentpage, 'all');
            break;
          }
          case 'to-rated': {
            dbgames(currentpage, 'rated');
            break;
          }
          case 'to-win': {
            dbgames(currentpage, 'win');
            break;
          }
          case 'to-loss': {
            dbgames(currentpage, 'loss');
            break;
          }
          case 'to-draw': {
            dbgames(currentpage, 'draw');
            break;
          }
          case 'to-playing': {
            dbgames(currentpage, 'playing');
            break;
          }
        }
      }
    }
  };
  allgamestab.onclick = function () {
    if (allgamestab.className.indexOf('active') === -1) {
      allgamestab.classList.toggle('active')
    }
    if (ratedgamestab.className.indexOf('active') > -1) {
      ratedgamestab.classList.toggle('active')
    }
    if (allwintab.className.indexOf('active') > -1) {
      allwintab.classList.toggle('active')
    }
    if (alllosstab.className.indexOf('active') > -1) {
      alllosstab.classList.toggle('active')
    }
    if (alldrawtab.className.indexOf('active') > -1) {
      alldrawtab.classList.toggle('active')
    }
    if (livegametab.className.indexOf('active') > -1) {
      livegametab.classList.toggle('active')
    }
    allgames = {};
    currentpage = 1;
    lastpage = false;
    infinitescroll.innerHTML = ''
    dbgames(currentpage, 'all');
  }
  ratedgamestab.onclick = function () {
    if (allgamestab.className.indexOf('active') > -1) {
      allgamestab.classList.toggle('active')
    }
    if (ratedgamestab.className.indexOf('active') === -1) {
      ratedgamestab.classList.toggle('active')
    }
    if (allwintab.className.indexOf('active') > -1) {
      allwintab.classList.toggle('active')
    }
    if (alllosstab.className.indexOf('active') > -1) {
      alllosstab.classList.toggle('active')
    }
    if (alldrawtab.className.indexOf('active') > -1) {
      alldrawtab.classList.toggle('active')
    }
    if (livegametab.className.indexOf('active') > -1) {
      livegametab.classList.toggle('active')
    }
    allgames = {};
    currentpage = 1;
    lastpage = false;
    infinitescroll.innerHTML = ''
    dbgames(currentpage, 'rated');
  }
  allwintab.onclick = function () {
    if (allgamestab.className.indexOf('active') > -1) {
      allgamestab.classList.toggle('active')
    }
    if (ratedgamestab.className.indexOf('active') > -1) {
      ratedgamestab.classList.toggle('active')
    }
    if (allwintab.className.indexOf('active') === -1) {
      allwintab.classList.toggle('active')
    }
    if (alllosstab.className.indexOf('active') > -1) {
      alllosstab.classList.toggle('active')
    }
    if (alldrawtab.className.indexOf('active') > -1) {
      alldrawtab.classList.toggle('active')
    }
    if (livegametab.className.indexOf('active') > -1) {
      livegametab.classList.toggle('active')
    }
    allgames = {};
    currentpage = 1;
    lastpage = false;
    infinitescroll.innerHTML = ''
    dbgames(currentpage, 'win');
  }
  alllosstab.onclick = function () {
    if (allgamestab.className.indexOf('active') > -1) {
      allgamestab.classList.toggle('active')
    }
    if (ratedgamestab.className.indexOf('active') > -1) {
      ratedgamestab.classList.toggle('active')
    }
    if (allwintab.className.indexOf('active') > -1) {
      allwintab.classList.toggle('active')
    }
    if (alllosstab.className.indexOf('active') === -1) {
      alllosstab.classList.toggle('active')
    }
    if (alldrawtab.className.indexOf('active') > -1) {
      alldrawtab.classList.toggle('active')
    }
    if (livegametab.className.indexOf('active') > -1) {
      livegametab.classList.toggle('active')
    }
    allgames = {};
    currentpage = 1;
    lastpage = false;
    infinitescroll.innerHTML = ''
    dbgames(currentpage, 'loss');
  }
  alldrawtab.onclick = function () {
    if (allgamestab.className.indexOf('active') > -1) {
      allgamestab.classList.toggle('active')
    }
    if (ratedgamestab.className.indexOf('active') > -1) {
      ratedgamestab.classList.toggle('active')
    }
    if (allwintab.className.indexOf('active') > -1) {
      allwintab.classList.toggle('active')
    }
    if (alllosstab.className.indexOf('active') > -1) {
      alllosstab.classList.toggle('active')
    }
    if (alldrawtab.className.indexOf('active') === -1) {
      alldrawtab.classList.toggle('active')
    }
    if (livegametab.className.indexOf('active') > -1) {
      livegametab.classList.toggle('active')
    }
    allgames = {};
    currentpage = 1;
    lastpage = false;
    infinitescroll.innerHTML = ''
    dbgames(currentpage, 'draw');
  }
  livegametab.onclick = function () {
    if (allgamestab.className.indexOf('active') > -1) {
      allgamestab.classList.toggle('active')
    }
    if (ratedgamestab.className.indexOf('active') > -1) {
      ratedgamestab.classList.toggle('active')
    }
    if (allwintab.className.indexOf('active') > -1) {
      allwintab.classList.toggle('active')
    }
    if (alllosstab.className.indexOf('active') > -1) {
      alllosstab.classList.toggle('active')
    }
    if (alldrawtab.className.indexOf('active') > -1) {
      alldrawtab.classList.toggle('active')
    }
    if (livegametab.className.indexOf('active') === -1) {
      livegametab.classList.toggle('active')
    }
    allgames = {};
    currentpage = 1;
    lastpage = false;
    infinitescroll.innerHTML = ''
    dbgames(currentpage, 'playing');
  }
}
function dblivegamecount(userid) {
  if (typeof userid === 'undefined') {
    userid = document.location.href.slice(22)
  }
  var xhr = new XMLHttpRequest();
  xhr.open("POST", '/livegamecount', true);
  xhr.send(userid)
  xhr.onreadystatechange = function () {
    if (this.readyState != 4) return;
    if (this.status == 200) {
      livegamecount.innerHTML = this.responseText
    }
  }
}
function dbratings(userid) {
  if (typeof userid === 'undefined') {
    userid = document.location.href.slice(22)
  }
  var xhr = new XMLHttpRequest();
  xhr.open("POST", '/ratings', true);
  xhr.send(userid)
  xhr.onreadystatechange = function () {
    if (this.readyState != 4) return;
    if (this.status == 200) {
      const ratings = JSON.parse(this.responseText)
      ultrabulletrating.innerHTML = ratings.a
      bulletrating.innerHTML = ratings.b
      blitzrating.innerHTML = ratings.c
      rapidrating.innerHTML = ratings.d
      classicalrating.innerHTML = ratings.e
    }
  }
}
function dbgames(page, query, userid) {
  if (typeof page === 'undefined') {
    page = 1
  }
  if (typeof userid === 'undefined') {
    userid = document.location.href.slice(22)
  }
  if (typeof query === 'undefined') {
    query = 'all'
  }
  var xhr = new XMLHttpRequest();
  xhr.open("POST", '/gamehistory', true);
  xhr.send('u=' + userid + '&p=' + page + '&q=' + query)
  xhr.onreadystatechange = function () {
    if (this.readyState != 4) return;
    if (this.status == 200) {
      ++currentpage
      const games = JSON.parse(this.responseText)
      const l = games.length
      if (l === 0) lastpage = true
      for (var i = 0; i < l; ++i) {
        var side
        var tt, tc
        const game = games[i]
        if (typeof allgames[game.i] === 'undefined') {
          allgames[game.i] = 1
          tt = 60 * game.t + 40 * game.n
          tc = 0
          if (tt <= 1500) tc = 1
          if (tt <= 480) tc = 2
          if (tt <= 180) tc = 3
          if (tt <= 15) tc = 4
          if (game.w != null) {
            if (userid.toLowerCase() === game.w.toLowerCase()) { side = 'w' } else { side = 'b' }
          }
          if (game.b != null) {
            if (userid.toLowerCase() === game.b.toLowerCase()) { side = 'b' } else { side = 'w' }
          }
          var whitescore = game.v || ''
          var blackscore = game.x || ''
          var result = ''
          if (game.f != 0) {
            if (game.y > 0) {
              whitescore = game.v + ' <good>+' + game.y + '</good>'
            }
            if (game.y == 0) {
              whitescore = game.v + ' +' + game.y
            }
            if (game.y < 0) {
              whitescore = game.v + ' <bad>' + game.y + '</bad>'
            }
            if (game.z > 0) {
              blackscore = game.x + ' <good>+' + game.z + '</good>'
            }
            if (game.z == 0) {
              blackscore = game.x + ' +' + game.z
            }
            if (game.z < 0) {
              blackscore = game.x + ' <bad>' + game.z + '</bad>'
            }
            if (game.f != 9) {
              result = ' • ' + {
                w: {
                  en: { true: '<good>White wins</good>', false: '<bad>Black wins</bad>', null: 'Draw' },
                  es: { true: '<good>Ganan blancas</good>', false: '<bad>Ganan negras</bad>', null: 'Tablas' },
                  zh: { true: '<good>白方胜利</good>', false: '<bad>黑方胜利</bad>', null: '平局' }
                },
                b: {
                  en: { true: '<bad>White wins</bad>', false: '<good>Black wins</good>', null: 'Draw' },
                  es: { true: '<bad>Ganan blancas</bad>', false: '<good>Ganan negras</good>', null: 'Tablas' },
                  zh: { true: '<bad>白方胜利</bad>', false: '<good>黑方胜利</good>', null: '平局' }
                }
              }[side][lang][game.e]
            }
          }
          const selected = document.createElement('article')
          selected.setAttribute('class', 'game-row paginated')
          var ih = ''
          ih += '<a class="game-row__overlay" href="/game/' + game.i + '?s=' + side + '"></a><div class="game-row__infos"><div class="header" data-icon=""><div class="header__text"><strong>'
          ih += game.t + '+' + game.n + ' '
          ih += { 0: { en: 'Classical', es: 'Clásica', zh: '慢棋' }, 1: { en: 'Rapid', es: 'Rápida', zh: '快棋' }, 2: { en: 'Blitz', es: 'Relámpago', zh: '闪电' }, 3: { en: 'Bullet', es: 'Bala', zh: '子弹' }, 4: { en: 'Ultrabullet', es: 'Ultrabala', zh: '超弹' } }[tc][lang] + ' • '
          ih += { true: { en: 'Rated', es: 'Clasificatoria', zh: '排位' }, false: { en: 'Casual', es: 'Amistosa', zh: '友谊' } }[game.r][lang]
          ih += '</strong><time class="timeago set">' + (new Date(Date.parse(game.d))).toLocaleString({ en: 'en-GB', es: 'es-ES', zh: 'zh-CN' }[lang], { timeZone: 'UTC' }) + '</time></div></div><div class="versus"><div class="player white"><a class="user-link ulpt" '
          if (game.w != null) ih += 'href="/@/' + game.w + '"'
          ih += '>'
          ih += game.w || 'NN'
          ih += '</a><br>' + whitescore + '</div><div class="swords"></div><div class="player black"><a class="user-link ulpt" '
          if (game.b != null) ih += 'href="/@/' + game.b + '"'
          ih += '>'
          ih += game.b || 'NN'
          ih += '</a><br>' + blackscore + '</div></div><div class="result">'
          ih += { 0: { en: 'Playing right now', es: 'Partida en curso', zh: '正在对局' }, 1: { en: 'Checkmate', es: 'Jaque mate', zh: '将死' }, 2: { en: 'Stalemate', es: 'Ahogado', zh: '逼和' }, 3: { en: 'Insufficient material', es: 'Material insuficiente', zh: '棋子不足', }, 4: { en: 'Threefold repetition', es: 'Triple repetición', zh: '三次重复' }, 5: { en: '50 move rule', es: 'Regla de los 50 movimientos', zh: '50步规则' }, 6: { en: 'Time out', es: 'Tiempo agotado', zh: '超时' }, 7: { en: 'Resigned', es: 'Rendición', zh: '认输' }, 8: { en: 'Draw agreement', es: 'Tablas aceptadas', zh: '和棋' }, 9: { en: 'Canceled', es: 'Cancelado', zh: '被取消' } }[game.f][lang]
          ih += result + '</div></div>'
          selected.innerHTML = ih
          infinitescroll.appendChild(selected)
        }
      }
    }
  }
}

function dbgamecount(element, tc, wdl, rated, finished, userid) {
  if (typeof tc === 'undefined') {
    tc = 'all'
  }
  if (typeof wdl === 'undefined') {
    wdl = 'all'
  }
  if (typeof rated === 'undefined') {
    rated = 'all'
  }
  if (typeof finished === 'undefined') {
    finished = 'all'
  }
  if (typeof userid === 'undefined') {
    userid = document.location.href.slice(22)
  }
  if (typeof element === 'undefined') {
    element = allgamescount
  }
  var xhr = new XMLHttpRequest();
  xhr.open("POST", '/gamecount', true);
  xhr.send('u=' + userid + '&t=' + tc + '&w=' + wdl + '&r=' + rated + '&f=' + finished)
  xhr.onreadystatechange = function () {
    if (this.readyState != 4) return;
    if (this.status == 200) {
      element.innerHTML = this.responseText
    }
  }
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
  document.getElementsByClassName('btn-rack__btn')[0].addEventListener('click', startseek)
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
    xhr.open("POST", '/challenge', true);
    if (document.getElementsByClassName('user-show__header').length > 0) {
      xhr.send(timecontrol + ':' + document.getElementsByClassName('user-show__header')[0].textContent)
    }
    xhr.onreadystatechange = function () {
      if (this.readyState != 4) return;
      if (this.status == 200) {
        // console.log(this.responseText)
        //  setTimeout(()=>{accept(this.responseText)},4000)
      }
    };
  }

  function startseek(e) {
    if (document.getElementById('user_tag') !== null && document.getElementsByClassName('box__top user-show__header').length > 0 && document.getElementsByClassName('box__top user-show__header')[0].textContent === document.getElementById('user_tag').textContent) return
    var timecontrol = '5+0'
    var min = timecontrol.split('+')[0]
    var sec = timecontrol.split('+')[1]
    var tc = calctc(min, sec)
    const lobby = document.getElementById('main-wrap')
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

