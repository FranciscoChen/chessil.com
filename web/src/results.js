/* One outcome dialog for played games, local lessons and puzzles. Actions own effects. */
window.ChessilResult=(()=>{
 let current;
 const labels={en:{win:'Victory',loss:'Defeat',draw:'Draw',success:'Lesson complete',close:'Close result',retry:'Please try again.'},es:{win:'Victoria',loss:'Derrota',draw:'Tablas',success:'Lección completada',close:'Cerrar resultado',retry:'Inténtalo de nuevo.'},zh:{win:'获胜',loss:'失败',draw:'和棋',success:'课程完成',close:'关闭结果',retry:'请重试。'}};
 function close(){const dialog=current;dialog?.close();dialog?.remove();if(current===dialog)current=null;}
 function show({outcome='draw',title,reason='',score='',rating='',actions=[]}={}){
  close();const copy=labels[document.documentElement.lang]||labels.en;
  const dialog=document.createElement('dialog');dialog.className='ui-result-dialog';dialog.dataset.outcome=outcome;dialog.setAttribute('aria-labelledby','result-title');
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='ui-icon-button dialog-close';dismiss.setAttribute('aria-label',copy.close);
  dismiss.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';dismiss.onclick=()=>dialog.close();
  const body=document.createElement('div');body.className='ui-result-body';
  const emblem=document.createElement('span');emblem.className='ui-result-emblem';emblem.setAttribute('aria-hidden','true');
  const paths={win:'m4 7 4 3 4-6 4 6 4-3-2 11H6L4 7zm3 14h10',loss:'M6 21V4m0 1c4-4 8 4 12 0v10c-4 4-8-4-12 0',draw:'M5 9h14M5 15h14',success:'m5 12 4 4L19 6'};
  emblem.innerHTML='<svg viewBox="0 0 24 24"><path d="'+(paths[outcome]||paths.draw)+'"/></svg>';
  const heading=document.createElement('h2');heading.id='result-title';heading.textContent=title||copy[outcome]||copy.draw;
  const result=document.createElement('p');result.className='ui-result-score';result.textContent=score;
  const detail=document.createElement('p');detail.className='ui-result-reason';detail.id='result-reason';detail.textContent=reason;if(reason)dialog.setAttribute('aria-describedby',detail.id);
  const changes=document.createElement('p');changes.className='ui-result-rating';changes.textContent=rating;
  const controls=document.createElement('div');controls.className='ui-actions';const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.className='ui-result-status';
  let pending=false;const buttons=[];
  for(const action of actions){
   const button=document.createElement('button');button.type='button';button.className='ui-button '+(action.primary?'ui-primary':'ui-secondary');button.textContent=action.label;button.disabled=!!action.disabled;buttons.push({button,action});controls.append(button);
   button.onclick=async()=>{
    if(pending||action.disabled)return;pending=true;buttons.forEach(({button})=>button.disabled=true);button.setAttribute('aria-busy','true');status.textContent=action.pendingLabel||'';
    if(action.close!==false)dialog.close();
    try{await action.run?.({status:message=>status.textContent=message,dialog});}
    catch(error){status.textContent=error.message||copy.retry;}
    finally{pending=false;button.removeAttribute('aria-busy');buttons.forEach(({button,action})=>button.disabled=!!action.disabled);}
   };
  }
  (buttons.find(({button,action})=>action.primary&&!button.disabled)?.button||buttons.find(({button})=>!button.disabled)?.button||dismiss).autofocus=true;
  body.append(emblem,heading,result,detail,changes);dialog.append(dismiss,body,controls,status);
  dialog.addEventListener('close',()=>{dialog.remove();if(current===dialog)current=null;},{once:true});document.body.append(dialog);current=dialog;dialog.showModal();return dialog;
 }
 return{show,close};
})();
