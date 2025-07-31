var settings, userbutton, dasher, subs, dashermain, dasherlangs, dasherbackground, clinput, lang, tto, si, sr, noresults, nochallenges, cr
const accepticon = ''
const seekicon = ''
const declineicon = ''
const typingthreshold = 512
var seeklist = []
var newseeklist = []
function elementOrAncestorHasClass(element, className) {
  if (!element || element.length === 0) {
    return false;
  }
  var parent = element;
  do {
    if (parent === document) {
      break;
    }
    if (parent.className.indexOf(className) >= 0) {
      return true;
    }
  } while (parent = parent.parentNode);
  return false;
}
function elementOrAncestorHasId(element, idName) {
  if (!element || element.length === 0) {
    return false;
  }
  var parent = element;
  do {
    if (parent === document) {
      break;
    }
    if (parent.id === idName) {
      return true;
    }
  } while (parent = parent.parentNode);
  return false;
}

function headerfunctions() {
  settings = document.getElementsByClassName("dasher")[0];
  seeks = document.getElementsByClassName("seek")[0];
  userbutton = document.getElementById("user_button");
  dasher = document.getElementById("dasher_app");
  clinput = document.getElementById("clinput");
  dasherlangs = dasher.getElementsByClassName('sub langs')[0];
  dasherbackground = dasher.getElementsByClassName('sub background')[0];
  lang = dasherlangs.getElementsByClassName('current')[0].value
  document.getElementById('lightmode').onclick = function () {
    if (document.styleSheets[0].href.indexOf('light.css') === -1) {
      setlightmode()
    }
  }
  document.getElementById('darkmode').onclick = function () {
    if (document.styleSheets[0].href.indexOf('dark.css') === -1) {
      setdarkmode()
    }
  }
  dasher.removeChild(dasherlangs)
  dasher.removeChild(dasherbackground)
  subs = document.getElementsByClassName("subs")[0];
  dashermain = subs.parentElement;
  si = document.getElementById('clinput').getElementsByTagName('input')[0]
  sr = document.getElementById('clinput').getElementsByClassName('complete-list')[0]
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    if (document.styleSheets[0].href.indexOf('default.css') > -1) {
      setdarkmode()
    }
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    if (document.styleSheets[0].href.indexOf('default.css') > -1) {
      setlightmode()
    }
  }
  noresults = { en: 'No results.', es: 'No hay resultados.', zh: '没有结果' }[lang]
  nochallenges = { en: 'No challenges.', es: 'No hay retos.', zh: '没有挑战' }[lang]
  seek = document.getElementsByClassName('seek')[0]
  const challenges = document.createElement('div')
  challenges.setAttribute('class', 'challenges')
  const challengeapp = document.getElementById('challenge-app')
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

  function getseeks() {
    if (document.visibilityState !== "visible") return
    var nchallenges = 0
    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/getseeks', true);
    xhr.send()
    xhr.onreadystatechange = function () {
      if (this.readyState != 4) return;
      if (this.status == 200) {
        const see = JSON.parse(this.responseText)
        newseeklist = []
        //console.log(this.responseText)
        const l = see.length
        if (l === 0) {
          challengeapp.innerHTML = '<div class="empty text">' + nochallenges + '</div>'
        } else {
          if (document.getElementsByClassName('empty text').length === 1) {
            challengeapp.removeChild(document.getElementsByClassName('empty text')[0])
          }
          if (document.getElementsByClassName('challenges').length === 0) {
            challengeapp.appendChild(challenges)
          }
        }
        //challengeapp.innerHTML = ''
        //challenges.innerHTML = ''
        // List all new results
        for (var i = 0; i < l; ++i) {
          const gs = see[i]
          if (gs.target != null && document.getElementById('user_tag') != null && gs.target == document.getElementById('user_tag').textContent) ++nchallenges;
          newseeklist.push(gs.seekid)
          if (seeklist.indexOf(gs.seekid) === -1) {
            seeklist.push(gs.seekid)
            const ne = document.createElement('div')
            ne.setAttribute('id', gs.seekid)
            var ih = '<div class="content"><div.content__text>'
            var clist = 'challenge in'
            var colorside = { null: 'random', true: 'white', false: 'black' }[gs.side]
            if (gs.target != null) {
              // Is a Challenge
              if (document.getElementById('user_tag') != null && gs.target == document.getElementById('user_tag').textContent) {
                // User is being targeted, display opponent or anon (NN)
                if (gs.username == null) {
                  ih += '<span class="head"><a class="user-link online"><i class="line"></i><name>NN</name></a></span>'
                } else {
                  ih += '<span class="head"><a class="user-link online" href="/@/' + gs.username + '"><i class="line"></i><name>' + gs.username + '</name></a></span>'
                }
                colorside = { random: 'random', black: 'white', white: 'black' }[colorside]
              } else {
                ih += '<span class="head"><a class="user-link online" href="/@/' + gs.target + '"><i class="line"></i><name>' + gs.target + '</name></a></span>'
                clist += ' waiting'
              }
            } else {
              // Is a pool seek
              clist += ' seeking'
            }

            ih += '<span class="desc"><span class="is color-icon ' + colorside + '"></span> • ' + { true: rated, false: casual }[gs.rated] + ' • ' + gs.initialtime + '+' + gs.increment + '</span></div.content__text></div>'
            ne.setAttribute('class', clist)
            ne.innerHTML = ih
            // FROM HERE IS BUTTONS
            const btns = document.createElement('div')
            btns.setAttribute('class', 'buttons')
            // ih += '<div class="buttons">'
            // If target is null,  there is no accept
            if (gs.target == null) {
              //ih += '<button class="button seek" data-icon="'+seekicon+'"></button>'
              const btseek = document.createElement('button')
              btseek.setAttribute('class', 'button seek')
              btseek.setAttribute('data-icon', seekicon)
              btns.appendChild(btseek)
            } else {
              // If there is a target, and it's me, there is accept 
              if (document.getElementById('user_tag') != null && gs.target == document.getElementById('user_tag').textContent) {
                //ih += '<button class="button accept" tc="'+gs.initialtime+'+'+gs.increment+{true:'r',false:'u'}[gs.rated]+{null:'r',true:'b',false:'w'}[gs.side]+'" data-icon="'+accepticon+'"></button>'
                const btac = document.createElement('button')
                btac.setAttribute('class', 'button accept')
                btac.setAttribute('data-icon', accepticon)
                btac.onclick = function () {
                  acceptedchallenge(gs.initialtime + '+' + gs.increment + { true: 'r', false: 'u' }[gs.rated] + { null: 'r', true: 'b', false: 'w' }[gs.side] + ':' + gs.seekid)
                }
                btns.appendChild(btac)
              } else {
                //ih += '<button class="button seek" data-icon="'+seekicon+'"></button>'
                const btseek = document.createElement('button')
                btseek.setAttribute('class', 'button seek')
                btseek.setAttribute('data-icon', seekicon)
                btns.appendChild(btseek)
              }
            }

            //ih += '<button class="button decline" data-icon="'+declineicon+'" </button></div>'
            const btde = document.createElement('button')
            btde.setAttribute('class', 'button decline')
            btde.setAttribute('data-icon', declineicon)
            btde.onclick = function () {
              decline(this.parentElement.parentElement.id)
              setTimeout(() => {
                challenges.removeChild(this.parentElement.parentElement)
                if (challenges.children.length === 0) challengeapp.innerHTML = '<div class="empty text">' + nochallenges + '</div>'
              }, 100)
            }
            btns.appendChild(btde)

            ne.appendChild(btns)
            challenges.appendChild(ne)
          }
        }
        // Clear previous results that are not listed anymore
        for (var i = seeklist.length; i--;) {
          const pr = document.getElementById(seeklist[i])
          if (pr !== null && newseeklist.indexOf(seeklist[i]) === -1) {
            challenges.removeChild(pr)
          }
        }
        // Update number of challenges
        document.getElementsByClassName('data-count')[0].setAttribute('data-count', nchallenges)
      }
    }
  }

  setInterval(pairseeks, 4000)
  setInterval(intervalgetseeks, 7000)
  function intervalgetseeks() {
    if (document.getElementById('user_tag') != null) getseeks()
  }
  function pairseeks() {
    if (document.visibilityState === "visible") {
      const sks = document.getElementsByClassName('seeking')
      for (var i = sks.length; i--;) {
        pair(sks[i].id)
      }
      const chl = document.getElementsByClassName('waiting')
      for (var i = chl.length; i--;) {
        startchallenge(chl[i].id)
      }
    }
  }

  si.addEventListener("input", function () {
    clearTimeout(tto);
    tto = setTimeout(searchusers, typingthreshold);
  });

  function searchusers() {
    if (si.value.length > 1) {
      // xhr to check the username
      var xhr = new XMLHttpRequest();
      xhr.open("POST", '/search', true);
      xhr.send(si.value)
      xhr.onreadystatechange = function () {
        if (this.readyState != 4) return;
        if (this.status == 200) {
          // Clear previous results
          sr.innerHTML = ''
          if (sr.className.indexOf('none') > -1) sr.classList.toggle('none')
          const usr = JSON.parse(this.responseText)
          const l = usr.length
          // List all results
          for (var i = 0; i < l; ++i) {
            const ne = document.createElement('a')
            ne.setAttribute('class', 'complete-result ulpt user-link online')
            ne.setAttribute('href', '/@/' + usr[i])
            ne.innerHTML = '<i class="line"></i>' + usr[i]
            sr.appendChild(ne)
          }
          if (l === 0) sr.innerHTML = '<div class="complete-list__empty">' + noresults + '</div>'
        }
      };
    }
  }


  function setlightmode() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/light', true);
    xhr.send()
    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = "https://chessil.com/light.css";
    link.onload = function () {
      const alllinks = document.getElementsByTagName('link')
      for (var i = alllinks.length; i--;) {
        if (alllinks[i].href.indexOf('.css') > -1 && alllinks[i].href.indexOf('dark') > -1) {
          document.head.removeChild(alllinks[i])
        }
      }
    }
    document.head.appendChild(link);
  }
  function setdarkmode() {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/dark', true);
    xhr.send()
    const link = document.createElement("link");
    link.type = "text/css";
    link.rel = "stylesheet";
    link.href = "https://chessil.com/dark.css";
    link.onload = function () {
      const alllinks = document.getElementsByTagName('link')
      for (var i = alllinks.length; i--;) {
        if (alllinks[i].href.indexOf('.css') > -1 && alllinks[i].href.indexOf('light') > -1) {
          document.head.removeChild(alllinks[i])
        }
      }
    }
    document.head.appendChild(link);
  }
  function decline(seekid) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/cancel', true);
    xhr.send(seekid)
  }
  function pair(seekid) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/pairing', true);
    xhr.send(seekid)
    xhr.onreadystatechange = function () {
      if (this.readyState != 4) return;
      if (this.status == 202) {
        document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('blue')
        setTimeout(() => {
          if (document.getElementById(seekid) != null) {
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('red');
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('blue')
          }
        }, 1000)
        setTimeout(() => {
          if (document.getElementById(seekid) != null) {
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('yellow')
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('red');
          }
        }, 2000)
        setTimeout(() => {
          if (document.getElementById(seekid) != null) {
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('orange');
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('yellow')
          }
        }, 3000)
        setTimeout(() => {
          if (document.getElementById(seekid) != null) {
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('orange');
          }
        }, 4000)
      }
      if (this.status == 201) {
        window.location.href = this.responseText
      }
    }
  }
  function acceptedchallenge(timecontrolwithseekid) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/accept', true);
    xhr.send(timecontrolwithseekid)
    xhr.onreadystatechange = function () {
      if (this.readyState != 4) return;
      if (this.status == 200) {
        // console.log(this.responseText)
        startchallenge(this.responseText)
      }
    };
  }

  function startchallenge(seekid) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", '/startchallenge', true);
    xhr.send(seekid)
    xhr.onreadystatechange = function () {
      if (this.readyState != 4) return;
      if (this.status == 202) {
        document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('blue')
        setTimeout(() => {
          if (document.getElementById(seekid) != null) {
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('red');
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('blue')
          }
        }, 1000)
        setTimeout(() => {
          if (document.getElementById(seekid) != null) {
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('yellow')
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('red');
          }
        }, 2000)
        setTimeout(() => {
          if (document.getElementById(seekid) != null) {
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('orange');
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('yellow')
          }
        }, 3000)
        setTimeout(() => {
          if (document.getElementById(seekid) != null) {
            document.getElementById(seekid).getElementsByClassName('seek')[0].classList.toggle('orange');
          }
        }, 4000)
      }
      if (this.status == 201) {
        window.location.href = this.responseText
      }
    }
  }
  /*
function trypairing(seekid, retry = 0) {
var xhr = new XMLHttpRequest();
xhr.open("POST", '/pairing', true);
xhr.send(seekid)
xhr.onreadystatechange = function () {
if (this.readyState != 4) return;
if (this.status == 202) {
  setTimeout( ()=>{trypairing(seekid, retry)}, 2000 )
}
if (this.status == 201) {
  window.location.href = this.responseText
}
}
}
*/
  document.onclick = (e) => {
    if (elementOrAncestorHasClass(e.target, 'dasher')) {
      if (e.target.className.indexOf('toggle') > -1 || e.target.parentElement.className.indexOf('toggle') > -1) {
        settings.classList.toggle('shown')
      }
      if (elementOrAncestorHasClass(e.target, 'subs')) {
        if (e.target === subs.children[0]) {
          dasher.removeChild(dashermain)
          dasher.appendChild(dasherlangs)

        }
        if (e.target === subs.children[1]) {
          dasher.removeChild(dashermain)
          dasher.appendChild(dasherbackground)
        }
      }
      if (elementOrAncestorHasClass(e.target, 'head text')) {
        dasher.removeChild(dasherlangs)
        dasher.removeChild(dasherbackground)
        dasher.appendChild(dashermain)
      }
    } else {
      settings.classList = ('dasher')
    }
    if (elementOrAncestorHasClass(e.target, 'seek')) {
      if (e.target.className.indexOf('toggle') > -1 || e.target.parentElement.className.indexOf('toggle') > -1) {
        seeks.classList.toggle('shown')
        if (seeks.className.indexOf('shown') > -1) getseeks()
      }
    } else {
      seeks.classList = ('seek')
    }
    if (elementOrAncestorHasId(e.target, 'clinput')) {
      if (document.body.className.indexOf('clinput') === -1) {
        document.body.classList.toggle('clinput')
        document.getElementById('clinput').getElementsByTagName('input')[0].focus()
      }
    } else {
      document.body.classList.remove('clinput')
      sr.innerHTML = ''
      if (sr.className.indexOf('none') === -1) sr.classList.toggle('none')
    }
    if (userbutton !== null) {
      if (elementOrAncestorHasId(e.target, 'user_button')) {
        if (e.target.className === 'toggle link') {
          userbutton.classList.toggle('shown')
        }
      } else {
        userbutton.classList = ''
      }
    }
  }

  getseeks()
}


