/* Shared markup. Routes contain only a marker; localized copy is data. */
const copy = require('./copy');
const { button } = require('./components');
exports.render = function(name, language) {
 if(name==='engine-source')return require('./engine-source').render(language);
 if(name==='credits')return require('./credits').render(language);
 if(name==='analysis')return require('./study').render(language);
 if(name==='game-history')return require('./components').historyRail(language);
 const t=copy[language]||copy.en; const lang=copy[language]?language:'en';
 if(name==='research'||name==='report') return require('./research').render(name,lang);
 if(name==='puzzles') return require('./puzzles').render(lang);
 if(name==='training') return require('./learning').landing(lang);
 if(/^training-(tutorial|endgames|strategy|openings)$/.test(name)) return require('./learning').workspace(name.slice(9),lang);
 if(name==='training-tactics') return require('./puzzles').render(lang,true);
 if(name==='drills') return require('./training').render(name,lang);
 const link=(route,label,style='ui-secondary')=>button(lang,route,label,style);
 const card=(index,title,text,route,label)=>`<article class="ui-panel"><span class="ui-index">0${index} /</span><h3>${title}</h3><p class="ui-muted">${text}</p>${link(route,label)}</article>`;
 const heading=(title,intro=t.pending)=>`<div class="ui-page-heading ui-mobile-secondary"><p class="eyebrow">ChessiL / ${name==='settings'?t.preferences:t.library}</p><h1>${title}</h1><p class="ui-intro">${intro}</p></div>`;
 const accountNav=()=>`<aside class="ui-sidebar" aria-label="${t.account}">${[['account',t.account],['settings',t.settings],['ongoing',t.games],['../profile',t.profile]].map(([r,l])=>`<a href="${r==='../profile'?'/profile':`/${lang}/${r}`}" ${r===name?'aria-current="page"':''}>${l}</a>`).join('')}</aside>`;
 const sign=()=>`<div class="ui-panel ui-empty" data-account-entry><strong>${t.sign}</strong><p class="ui-mobile-secondary">${t.signHelp}</p><div class="ui-actions" style="justify-content:center">${link('login',t.login,'ui-primary')}${link('register',t.register)}</div></div>`;
 let body='';
 if(name==='landing') body=`<section class="ui-hero"><div><p class="eyebrow">${t.home}</p><h1>${t.hero}</h1><p class="ui-intro">${t.intro}</p><div class="ui-actions">${link('easy',t.play,'ui-primary')}${link('lobby?match=1&rated=1',lang==='zh'?'寻找排位对局':lang==='es'?'Buscar partida clasificada':'Find a ranked game')}${link('training',t.train)}</div></div><div class="ui-hero-art"><a class="live-board ui-live-art" data-live-featured="0" data-development-board data-board-only href="/${lang}/lobby?mode=watch" aria-label="${({en:"Watch games",es:"Ver partidas",zh:"观战"})[lang]}"><span class="live-board-frame"><cg-board aria-hidden="true"></cg-board></span></a><p class="ui-caption">${t.caption}</p></div></section><section class="ui-section"><div class="ui-section-heading"><h2>${t.section}</h2><span class="eyebrow">01 — 03</span></div><div class="ui-grid">${t.pillars.map((title,i)=>card(i+1,title,t.descriptions[i],['lobby','training','research'][i],t.explore)).join('')}</div></section><section class="ui-section ui-panel"><p class="eyebrow">${t.reportLabel}</p><h2>${t.reportIntro}</h2><p class="ui-muted">${t.reportBody}</p>${link('research',t.pillars[2])}</section>`;
 else if(name==='settings') body=heading(t.titles[name],t.themeHelp)+`<div class="ui-sidebar-layout">${accountNav()}<section class="ui-panel"><h2>${t.appearance}</h2><div class="ui-grid-two">${[['light','Ivory Study',t.light],['dark','Midnight Observatory',t.dark]].map(([value,label,desc])=>`<button class="ui-theme-choice" data-set-theme="${value}" aria-pressed="false"><span class="ui-swatch ${value==='dark'?'ui-swatch-dark':''}" aria-hidden="true"></span><span><strong>${label}</strong><small class="ui-mobile-secondary">${desc}</small></span></button>`).join('')}</div><p role="status" data-theme-status></p><section class="board-settings-account" data-board-settings></section></section></div>`;
 else if(name==='ongoing')body=heading(t.titles[name],'')+`<section class="ui-panel" data-my-games-list aria-live="polite"></section>`;
 else if(['account'].includes(name)) body=heading(t.titles[name],t.signHelp)+`<div class="ui-sidebar-layout">${accountNav()}<section><div hidden data-account-signed class="ui-panel"><h2>${name==='ongoing'?t.games:t.account}</h2><div class="ui-actions"><a class="ui-button ui-primary" href="/profile">${t.profile}</a>${link('lobby',t.play)}${link('settings',t.settings)}</div></div>${sign()}</section></div>`;
 else if(name==='database') return require('./archive').render(lang);
 else body=heading(t.titles[name],t.unavailable)+`<aside class="ui-panel"><p class="eyebrow">${t.note}</p><h2>${name==='drills'?t.drill:name==='puzzles'?t.tactics:t.analysis}</h2><p class="ui-muted">${t.unavailable}</p>${link('easy',t.play,'ui-primary')}<nav class="ui-sidebar" aria-label="${t.library}">${[['training',t.pillars[1]],['drills',t.drill],['puzzles',t.puzzle],['analysis',t.analysis]].map(([r,l])=>`<a href="/${lang}/${r}">${l}</a>`).join('')}</nav></aside>`;
 return `<main id="main-content" class="ui-page ui-layout-${name}">${body}</main>`;
};
