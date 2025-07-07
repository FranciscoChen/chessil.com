window.onload = () => {
  if (typeof headerfunctions === 'function'){
    headerfunctions()
  }
  if (typeof pwcomplexity === 'function'){
    pwcomplexity()
  }
  if (typeof inputusername === 'function'){
    inputusername()
  }
  if (typeof seekfunctions === 'function'){
    seekfunctions()
  }
  if (typeof wsconnect === 'function'){
    wsconnect('ws0')
  }
  if (typeof roundstart === 'function'){
    roundstart()
  }
  if (typeof userpageload === 'function'){
    userpageload()
  }
  if (typeof blogs === 'function'){
    blogs()
  }
}
