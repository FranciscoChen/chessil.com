/* Outcome categories are estimates, not tablebase proofs. Compare searches from
 * the same mover's perspective; a large loss in an already won game is advice. */
(function(root){
 function expectation(score){
  if(score.kind==='mate')return score.value>0?1:0;
  if(score.wdl){const [win,draw,loss]=score.wdl,total=win+draw+loss;if(total)return (win+draw/2)/total;}
  return 1/(1+Math.exp(-score.value/180));
 }
 function judge(best,played,loss){
  const before=expectation(best),after=expectation(played),drop=before-after;
  // No lesson in choosing a slower forced loss or a smaller hopeless deficit.
  if(best.kind==='mate'&&played.kind==='mate'&&Math.sign(best.value)===Math.sign(played.value))return null;
  if(best.kind==='mate'&&best.value<=0)return null;
  if(best.kind==='cp'&&(best.value<=-400||(before<=.05&&best.value<-200)))return null;
  const regainedHope=best.kind==='cp'&&played.kind==='cp'&&best.value>=-250&&played.value<=-400&&loss>=200;
  const band=value=>value>=.8?2:value<=.2?0:1;
  const changed=band(before)>band(after)&&drop>=.2;
  if(regainedHope&&!changed)return {type:'suggestion',symbol:'?!',outcome:false,description:'A much stronger defense keeps practical chances alive.'};
  if(changed)return {type:drop>=.5?'major':'blunder',symbol:drop>=.5?'??':'?',outcome:true,description:regainedHope?'A stronger defense would keep meaningful chances alive.':band(before)===2?(band(after)===0?'A likely win becomes a likely loss.':'A likely win becomes uncertain.'):'A roughly balanced game becomes a likely loss.'};
  if(loss>=100||drop>=.1)return {type:'suggestion',symbol:'?!',outcome:false,description:'A stronger move was available; the estimated outcome stays similar.'};
  return null;
 }
 const api={expectation,judge};if(typeof module==='object')module.exports=api;else root.ChessilAnalysisJudgment=api;
})(typeof window==='undefined'?globalThis:window);
