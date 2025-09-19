var settings, userbutton, dasher, subs, dashermain, dasherlangs, dasherbackground, clinput, lang, tto, si, sr, noresults, nochallenges, cr
var loggedin = 0
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
        if (elementOrAncestorHasClass(e.target, 'sub langs')) {
          dasher.removeChild(dasherlangs)
        }
        if (elementOrAncestorHasClass(e.target, 'sub background')) {
          dasher.removeChild(dasherbackground)
        }
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
        if (e.target.classList.contains('toggle')) {
          userbutton.classList.toggle('shown')
        }
      } else {
        userbutton.classList = 'icon-user toggle'
      }
    }
  }

}

function isloggedin() {
  var xhr = new XMLHttpRequest;
  xhr.open("POST", "/loggedin", true);
  xhr.send();
  xhr.onreadystatechange = function () {
    if (this.readyState != 4)
      return;
    if (this.status == 200) {
      loggedin = 1*this.responseText
      updateuserbutton();
    }
  }
}

function updateuserbutton() {
  if (loggedin === 1) {
    document.getElementById('login').classList.add('none')
    document.getElementById('logout').classList.remove('none')
    document.getElementById('profile').classList.remove('none')
  }
  if (loggedin === 0) {
    document.getElementById('login').classList.remove('none')
    document.getElementById('logout').classList.add('none')
    document.getElementById('profile').classList.add('none')
  }
}