const labels = {
  en:['Game archive','Players or game ID','Search','White · Black','Opening','Result','More games','No matching games','Archive unavailable','Loading…'],
  es:['Archivo de partidas','Jugadores o ID','Buscar','Blancas · Negras','Apertura','Resultado','Más partidas','Sin coincidencias','Archivo no disponible','Cargando…'],
  zh:['对局档案','棋手或对局编号','搜索','白方 · 黑方','开局','结果','更多对局','没有匹配的对局','暂时无法加载档案','加载中…']
};
exports.render = function(lang) {
  const [title,query,search,players,opening,result,more,empty,error,loading] = labels[lang] || labels.en;
  return `<main id="main-content" class="ui-page ui-layout-database" data-archive data-empty="${empty}" data-error="${error}">
    <h1>${title}</h1><section class="ui-panel"><form class="ui-filters" role="search">
    <label class="ui-field">${query}<input type="search" name="q" maxlength="64"></label>
    <button class="ui-button ui-secondary">${search}</button></form>
    <div class="ui-table-wrap"><table><thead><tr><th>${players}</th><th>${opening}</th><th>${result}</th><th>PGN</th></tr></thead>
    <tbody></tbody></table></div><p role="status">${loading}</p>
    <button class="ui-button ui-secondary" data-more hidden>${more}</button></section>
    <script defer src="/js/archive.js"></script></main>`;
};
