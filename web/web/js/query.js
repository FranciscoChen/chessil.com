/* Lobby state, rendering and API actions. All user-provided text uses textContent. */
document.addEventListener('DOMContentLoaded', () => {
  const text = window.chessilLobbyMessages[document.documentElement.lang] || window.chessilLobbyMessages.en
  const $ = id => document.getElementById(id)
  const params = new URLSearchParams(location.search)
  const timeGroups = {fast: ['1+0', '3+0', '3+2', '5+0'], slow: ['10+0', '15+10']}
  let mode = params.get('mode') === 'watch' ? 'watch' : 'play'
  let invitation = /^[a-zA-Z0-9]{9}$/.test(params.get('game') || '') ? params.get('game') : null
  let filters = {rated: params.get('rated') === '1' ? '1' : '', color:'', timeGroup:'any', time:'', eloMin:'', eloMax:'', username:''}
  let games = [], page = 1, loadSequence = 0, pending = null, events = null, pendingPoll = null, signedIn = null
  let rankedSearching = false, rankedBusy = false, rankedTimer = null
  let lastFocusAction = null

  function node(tag, className, value) {
    const element = document.createElement(tag)
    if (className) element.className = className
    if (value != null) element.textContent = value
    return element
  }
  function errorAt(id, message) {
    const element = $(id)
    element.textContent = message || ''
    element.hidden = !message
  }
  async function api(url, data) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 28000)
    try {
      const response = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data), signal:controller.signal})
      let result
      try { result = await response.json() } catch (_) { throw new Error(text.failed) }
      if (!response.ok) {
        const known = {'Sign in to create a rated game.':text.loginError, 'Anonymous users cannot join rated games':text.loginError, 'You already have an open challenge. Cancel it before creating another.':text.pendingError}
        throw Object.assign(new Error(known[result.error] || result.error || text.failed), {status:response.status, gameid:result.gameid})
      }
      return result
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) throw new Error(text.network)
      throw error
    } finally { clearTimeout(timer) }
  }
  function busy(button, active, label) {
    if (active) button.dataset.originalLabel = button.textContent
    button.disabled = active
    button.textContent = active ? label : button.dataset.originalLabel
  }
  function clockOptions(groupId, clockId, preferred) {
    const group = $(groupId).value, select = $(clockId)
    select.replaceChildren()
    select.disabled = group === 'any'
    for (const value of timeGroups[group] || ['']) {
      const option = new Option(value || text.any, value)
      select.add(option)
    }
    if ([...select.options].some(option => option.value === preferred)) select.value = preferred
  }
  function gameSummary(game) {
    const color = game.randomcolor || !game.color1 ? text.random : text[game.color1]
    return [game.timecontrol1, game.rated ? text.rated : text.casual, color].filter(Boolean).join(' · ')
  }
  function updateCreateSummary() {
    const rated = $('create-rated').value === '1'
    $('create-color').disabled = rated
    if (rated) $('create-color').value = 'random'
    $('create-summary').textContent = [$('create-time').value, rated ? text.rated : text.casual, text[$('create-color').value]].join(' · ')
    const needsLogin = rated && signedIn === false
    $('create-hint').firstChild.textContent = (needsLogin ? text.ratedHint : text.createHint) + ' '
    $('rated-signin').hidden = !needsLogin
    errorAt('create-error', '')
  }
  function stopPending() {
    if (events) events.close()
    if (pendingPoll) clearInterval(pendingPoll)
    events = null; pendingPoll = null; pending = null
    $('pending-challenge').hidden = true
  }
  function acceptPendingStatus(status) {
    if (!pending || status.gameid !== pending.gameid) return
    if (status.error || status.finished) {
      stopPending()
      if (status.error) errorAt('lobby-error', text.failed)
      loadLobby()
    } else if (status.started) {
      const gameid = pending.gameid
      stopPending()
      location.assign('/game/' + gameid)
    }
  }
  function pollPending() {
    if (pendingPoll) return
    pendingPoll = setInterval(async () => {
      if (!pending || document.hidden) return
      try { acceptPendingStatus(await api('/lobby/status', {gameid:pending.gameid})) }
      catch (error) { errorAt('lobby-error', error.message) }
    }, 5000)
  }
  function watchPending(game) {
    $('pending-challenge').hidden = false
    $('pending-summary').textContent = gameSummary(game)
    $('create-status').textContent = text.waiting
    if (pending?.gameid === game.gameid) return
    stopPending()
    pending = game
    $('pending-challenge').hidden = false
    if (!window.EventSource) { pollPending(); return }
    events = new EventSource('/lobby/watch?gameid=' + encodeURIComponent(game.gameid))
    events.onmessage = event => {
      try { acceptPendingStatus(JSON.parse(event.data)) } catch (_) { errorAt('lobby-error', text.failed) }
    }
    events.onopen = () => { if (pendingPoll) clearInterval(pendingPoll); pendingPoll = null }
    events.onerror = pollPending
  }
  function syncTabs() {
    document.querySelectorAll('[data-lobby-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.lobbyMode === mode)))
    $('games-title').textContent = mode === 'play' ? text.challenges : text.live
  }
  function updateFilterCount() {
    const count = Number(!!filters.rated) + Number(!!filters.color) + Number(!!filters.time) + Number(!!(filters.eloMin || filters.eloMax)) + Number(!!filters.username)
    $('filter-count').textContent = String(count)
    $('filter-count').hidden = count === 0
  }
  function button(label, className, action) {
    const element = node('button', 'ui-button ' + className, label)
    element.type = 'button'
    element.addEventListener('click', action)
    return element
  }
  function emptyState(message, description, failed = false) {
    const state = node('div', 'lobby-empty')
    const icon = node('span', 'lobby-empty-icon', '♟'); icon.setAttribute('aria-hidden','true')
    state.append(icon, node('h3','',message), node('p','',description))
    const actions = node('div','lobby-empty-actions')
    actions.append(button(failed ? text.retry : text.refresh, 'ui-secondary', loadLobby), button(text.create,'ui-primary',openCreate))
    state.append(actions)
    $('lobby-results').replaceChildren(state)
  }
  function render() {
    const container = $('lobby-results')
    const total = Math.max(1, Math.ceil(games.length / 10))
    page = Math.min(Math.max(page,1),total)
    $('lobby-count').textContent = String(games.length)
    const pager = $('lobby-pagination'); pager.replaceChildren(); pager.hidden = total <= 1
    if (!games.length) { emptyState(invitation ? text.inviteUnavailable : text.empty, text.emptyHelp); return }
    const table = node('table','lobby-table')
    const head = node('thead'), heading = node('tr')
    for (const label of [text.players,text.clock,text.mode,text.action]) {
      const th = node('th','',label); th.scope='col'; heading.append(th)
    }
    head.append(heading); table.append(head)
    const body = node('tbody')
    for (const game of games.slice((page-1)*10,page*10)) {
      const row = node('tr',game.isOwn && !game.started ? 'is-own' : '')
      const cell = node('td','players-cell'), player = node('div','player-cell'), info = node('div','player-info')
      const name = game.username1 || text.guest
      const opponent = game.hasOpponent ? (game.username2 || text.guest) : text.openSeat
      info.append(node('span','player-name',game.started ? name + ' · ' + opponent : name))
      info.append(node('span','player-detail',game.started ? [game.rating1,game.rating2].filter(v=>v!=null).join(' / ') : [game.rating1,opponent].filter(v=>v!=null).join(' · ')))
      const avatar = node('span','player-avatar',name[0].toUpperCase()); avatar.setAttribute('aria-hidden','true')
      player.append(avatar,info); cell.append(player); row.append(cell)
      row.append(node('td','lobby-time',game.timecontrol1))
      const modeCell = node('td','mode-cell'); modeCell.append(node('span','lobby-badge'+(game.rated?' is-rated':''),game.rated?text.rated:text.casual)); row.append(modeCell)
      const actionCell = node('td','action-cell')
      const label = game.started ? (game.isOwn ? text.resume : text.watchAction) : game.isOwn ? text.ownAction : text.joinAction
      const actionButton = button(label, game.started ? 'ui-secondary' : 'ui-primary', () => sendAction(game,actionButton))
      actionButton.dataset.gameid = game.gameid
      actionButton.disabled = !!game.isOwn && !game.started
      actionCell.append(actionButton); row.append(actionCell); body.append(row)
    }
    table.append(body); container.replaceChildren(table)
    if (total > 1) {
      const previous = button(text.previous,'ui-secondary',()=>{page--;render()}); previous.disabled=page===1
      const next = button(text.next,'ui-secondary',()=>{page++;render()}); next.disabled=page===total
      pager.append(previous,node('span','',text.page+' '+page+' / '+total),next)
    }
  }
  async function loadLobby() {
    const sequence = ++loadSequence
    const active = document.activeElement
    if (active?.dataset.gameid) lastFocusAction = active.dataset.gameid
    $('lobby-results').setAttribute('aria-busy','true')
    $('refresh-lobby').disabled = true
    try {
      const result = await api('/lobby/list', invitation ? {gameid:invitation,mode:''} : {...filters,mode})
      if (sequence !== loadSequence) return
      if (!Array.isArray(result)) throw new Error(text.failed)
      games = result
      errorAt('lobby-error','')
      const own = games.find(game=>game.isOwn && !game.started && !game.finished)
      if (own) watchPending(own)
      render()
      if (lastFocusAction) {
        const target = [...$('lobby-results').querySelectorAll('[data-gameid]')].find(button=>button.dataset.gameid===lastFocusAction)
        if (document.activeElement === document.body && target && !target.disabled) target.focus()
      }
      $('lobby-updated').textContent = text.updated+' '+new Date().toLocaleTimeString(document.documentElement.lang,{hour:'2-digit',minute:'2-digit'})
    } catch (error) {
      if (sequence !== loadSequence) return
      errorAt('lobby-error',error.message)
      if (!games.length) emptyState(text.failed,text.network,true)
    } finally {
      if (sequence === loadSequence) {
        $('lobby-results').setAttribute('aria-busy','false')
        $('refresh-lobby').disabled = false
      }
    }
  }
  function openCreate() {
    errorAt('create-error',pending ? text.pendingError : '')
    window.ChessilDialogs.open('create-dialog')
  }
  async function sendAction(game, control) {
    busy(control,true,text.loading)
    errorAt('lobby-error','')
    try {
      if (window.chessilMeasureLatency) await window.chessilMeasureLatency()
      const result = await api('/lobby/action',{id:game.id,action:game.started?'watch':'join'})
      if (!result.success || !/^[a-zA-Z0-9]{9}$/.test(result.gameid)) throw new Error(text.failed)
      location.assign('/game/'+result.gameid)
    } catch (error) { errorAt('lobby-error',error.message); loadLobby() }
    finally { busy(control,false) }
  }
  function restoreFilters(values) {
    for (const id of ['rated','color','timeGroup','eloMin','eloMax','username']) $(id).value = values[id] || (id==='timeGroup'?'any':'')
    clockOptions('timeGroup','time',values.time)
    errorAt('filters-error','')
  }
  const rankedButton = $('find-ranked'), rankedTime = $('ranked-time')
  const rankedLabel = rankedButton.textContent
  function stopRanked() {
    rankedSearching = false; clearTimeout(rankedTimer)
    rankedButton.disabled = false; rankedTime.disabled = false
    rankedButton.textContent = rankedLabel
  }
  async function findRanked() {
    if (rankedBusy || !rankedSearching) return
    rankedBusy = true
    errorAt('lobby-error','')
    try {
      if (window.chessilMeasureLatency) await window.chessilMeasureLatency()
      const result = await api('/matchmaking/find',{timecontrol:rankedTime.value})
      if (!rankedSearching) return
      if (result.started) { stopRanked(); location.assign('/game/'+result.gameid); return }
      watchPending({...result,timecontrol1:rankedTime.value,rated:true,randomcolor:true})
      loadLobby()
    } catch (error) {
      errorAt('lobby-error',error.message)
      if (![409,502,503].includes(error.status)) stopRanked()
    } finally {
      rankedBusy = false
      if (rankedSearching) rankedTimer = setTimeout(findRanked,5000)
    }
  }
  rankedButton.addEventListener('click',()=>{
    rankedSearching = true; rankedButton.disabled = true; rankedTime.disabled = true
    rankedButton.textContent = rankedButton.dataset.searching
    findRanked()
  })
  $('open-create').addEventListener('click',openCreate)
  $('open-filters').addEventListener('click',()=>{restoreFilters(filters);window.ChessilDialogs.open('filters-dialog')})
  $('refresh-lobby').addEventListener('click',loadLobby)
  document.querySelectorAll('[data-lobby-mode]').forEach(control=>control.addEventListener('click',()=>{
    mode = control.dataset.lobbyMode; invitation=null; page=1; syncTabs(); loadLobby()
  }))
  $('timeGroup').addEventListener('change',()=>clockOptions('timeGroup','time','5+0'))
  $('create-time-group').addEventListener('change',()=>{clockOptions('create-time-group','create-time','5+0');updateCreateSummary()})
  $('create-rated').value = params.get('rated')==='1' ? '1' : '0'
  $('create-rated').addEventListener('change',updateCreateSummary)
  $('create-color').addEventListener('change',updateCreateSummary)
  $('create-time').addEventListener('change',updateCreateSummary)
  clockOptions('create-time-group','create-time','5+0')
  updateCreateSummary(); restoreFilters(filters); syncTabs(); updateFilterCount()
  api('/loggedin',{}).then(result=>{signedIn=Number(result)===1;updateCreateSummary()}).catch(()=>{})
  $('filters-reset').addEventListener('click',()=>restoreFilters({}))
  $('filters-form').addEventListener('submit',event=>{
    event.preventDefault()
    const min=$('eloMin').value, max=$('eloMax').value
    if (min!=='' && max!=='' && Number(min)>Number(max)) {errorAt('filters-error',text.invalidRange);return}
    filters={rated:$('rated').value,color:$('color').value,timeGroup:$('timeGroup').value,time:$('timeGroup').value==='any'?'':$('time').value,eloMin:min,eloMax:max,username:$('username').value.trim()}
    invitation=null;page=1;updateFilterCount();window.ChessilDialogs.close('filters-dialog');loadLobby()
  })
  $('create-form').addEventListener('submit',async event=>{
    event.preventDefault()
    const control=$('create-game-confirm')
    if (control.disabled) return
    errorAt('create-error','')
    const rated=$('create-rated').value==='1'
    if (rated && signedIn===false) {errorAt('create-error',text.loginError);return}
    const settings={rated,timecontrol:$('create-time').value,color:rated?null:$('create-color').value}
    busy(control,true,text.creating)
    try {
      if (window.chessilMeasureLatency) await window.chessilMeasureLatency()
      const result=await api('/lobby/create',settings)
      if (!result.success || !/^[a-zA-Z0-9]{9}$/.test(result.gameid)) throw new Error(text.failed)
      watchPending({...result,timecontrol1:settings.timecontrol,rated,randomcolor:!settings.color||settings.color==='random',color1:settings.color})
      invitation=null;mode='play';filters={rated:'',color:'',timeGroup:'any',time:'',eloMin:'',eloMax:'',username:''};page=1
      syncTabs();updateFilterCount();window.ChessilDialogs.close('create-dialog');loadLobby()
      $('pending-challenge').scrollIntoView({block:'nearest',behavior:'auto'})
    } catch (error) {
      errorAt('create-error',error.message)
      if (error.gameid) loadLobby()
    } finally {busy(control,false)}
  })
  $('cancel-game').addEventListener('click',async()=>{
    if (!pending) return
    const control=$('cancel-game');busy(control,true,text.canceling)
    try {
      stopRanked()
      await api('/lobby/cancel',{gameid:pending.gameid});stopPending();loadLobby()
    } catch (error) {errorAt('lobby-error',error.message)}
    finally {busy(control,false)}
  })
  $('copy-invite').addEventListener('click',async()=>{
    if (!pending) return
    try {
      await navigator.clipboard.writeText(location.origin+'/lobby?game='+pending.gameid)
      $('copy-invite').textContent=text.copied
      setTimeout(()=>{$('copy-invite').textContent=text.copyInvite},2000)
    } catch (_) {errorAt('lobby-error',text.failed)}
  })
  const refreshTimer=setInterval(()=>{
    if (!document.hidden && !document.querySelector('dialog[open]') && $('lobby-results').getAttribute('aria-busy')!=='true') loadLobby()
  },15000)
  window.addEventListener('pagehide',()=>{stopRanked();clearInterval(refreshTimer);if(events)events.close();if(pendingPoll)clearInterval(pendingPoll)})
  loadLobby()
  if (params.get('match') === '1') rankedButton.click()
})
