/* One outcome dialog for played games, local lessons and puzzles. Actions own effects. */
window.ChessilResult=(()=>{
 let current;
 function close(){const dialog=current;dialog?.close();dialog?.remove();if(current===dialog)current=null;}
 function show({outcome='draw',title,reason='',score='',rating='',actions=[]}={}){
  close();const dialog=document.createElement('dialog');dialog.className='ui-result-dialog';dialog.dataset.outcome=outcome;dialog.setAttribute('aria-labelledby','result-title');
  const dismiss=document.createElement('button');dismiss.type='button';dismiss.className='ui-icon-button dialog-close';dismiss.setAttribute('aria-label','Close result');dismiss.textContent='×';dismiss.onclick=()=>dialog.close();
  const heading=document.createElement('h2');heading.id='result-title';heading.textContent=title||(({en:{win:'Victory',loss:'Defeat',draw:'Draw',success:'Lesson complete'},es:{win:'Victoria',loss:'Derrota',draw:'Tablas',success:'Lección completada'},zh:{win:'获胜',loss:'失败',draw:'和棋',success:'课程完成'}}[document.documentElement.lang]||{win:'Victory',loss:'Defeat',draw:'Draw',success:'Lesson complete'})[outcome]);
  const result=document.createElement('p');result.className='ui-result-score';result.textContent=score;
  const detail=document.createElement('p');detail.className='ui-result-reason';detail.textContent=reason;
  const changes=document.createElement('p');changes.className='ui-result-rating';changes.textContent=rating;
  const controls=document.createElement('div');controls.className='ui-actions';const status=document.createElement('p');status.setAttribute('role','status');status.className='ui-result-status';
  for(const action of actions){const button=document.createElement('button');button.type='button';button.className='ui-button '+(action.primary?'ui-primary':'ui-secondary');button.textContent=action.label;button.disabled=!!action.disabled;button.onclick=async()=>{if(action.close!==false)dialog.close();button.disabled=true;try{await action.run?.({status:message=>status.textContent=message,dialog});}catch(error){status.textContent=error.message||'Please try again.';}finally{button.disabled=!!action.disabled;}};controls.append(button);}
  dialog.append(dismiss,heading,result,detail,changes,controls,status);dialog.addEventListener('close',()=>{dialog.remove();if(current===dialog)current=null;},{once:true});document.body.append(dialog);current=dialog;dialog.showModal();return dialog;
 }
 return{show,close};
})();
