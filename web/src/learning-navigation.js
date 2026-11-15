/* One responsive library controller: the same rail moves into a modal on small
 * screens. Controls retain their state/listeners; no duplicate forms or IDs. */
window.ChessilLearningNavigation={mount(app,prefix){
 const get=id=>document.getElementById(prefix+'-'+id),sidebar=get('sidebar'),dialog=get('library-dialog'),media=matchMedia('(max-width:900px)');
 get('library-open').onclick=()=>{get('library-slot').append(sidebar);dialog.showModal();};get('library-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>app.append(sidebar));media.addEventListener('change',()=>{if(!media.matches&&dialog.open)dialog.close();});
}};
