/* Small synthesized sound palettes: no audio downloads, polling or sleeping workers.
 * Audio starts only after a gesture; historical/replayed moves never make sound. */
window.ChessilSound = (() => {
 let context, unlocked=false, pendingStart=0;
 const palettes={
  ivory:{type:'sine',base:392,decay:.11,filter:1600},
  midnight:{type:'triangle',base:220,decay:.18,filter:950}
 };
 // Ratios and timing make every event distinct within either palette.
 const patterns={move:[[1,0,.08]],capture:[[.65,0,.07],[.9,.055,.12]],
  slide:[[.5,0,.1,1.1]],start:[[1,0,.13],[1.25,.12,.13],[1.5,.24,.22]],
  end:[[1.5,0,.16],[1.25,.14,.16],[1,.28,.32]],
  clock:[[2,0,.06],[2,.14,.06]],check:[[1.5,0,.1],[2,.09,.15]]};
 function unlock() {
  const Audio=window.AudioContext || window.webkitAudioContext;
  if(!Audio)return;
  try {context ||= new Audio();context.resume().catch(()=>{});unlocked=true;if(pendingStart>Date.now()){pendingStart=0;play('start');}}catch(_){}
 }
 function play(event,preview=false,override) {
  const p=window.ChessilPreferences?.get();
  if(event==='start' && !unlocked){pendingStart=Date.now()+15000;return;}
  if(!p || (!preview && (p.muted || document.hidden)) || !context || !unlocked || !patterns[event])return;
  const selection=override || p.events[event];
  if(selection==='off' || p.volume===0)return;
  const theme=selection==='theme'?(p.sound==='auto'?(document.documentElement.dataset.theme==='light'?'ivory':'midnight'):p.sound):selection;
  const palette=palettes[theme] || palettes.ivory;
  // The per-event envelope and a global ceiling avoid clicks and loud layering.
  const time=context.currentTime;
  for(const [ratio,offset,length,endRatio] of patterns[event]) {
   const oscillator=context.createOscillator(),gain=context.createGain(),filter=context.createBiquadFilter();
   oscillator.type=palette.type;oscillator.frequency.setValueAtTime(palette.base*ratio,time+offset);
   if(endRatio)oscillator.frequency.exponentialRampToValueAtTime(palette.base*endRatio,time+offset+length);
   filter.type='lowpass';filter.frequency.value=palette.filter;
   const duration=length+palette.decay;
   gain.gain.setValueAtTime(.0001,time+offset);
   gain.gain.exponentialRampToValueAtTime(.13*p.volume/100,time+offset+.008);
   gain.gain.exponentialRampToValueAtTime(.0001,time+offset+duration);
   oscillator.connect(filter).connect(gain).connect(context.destination);
   oscillator.start(time+offset);oscillator.stop(time+offset+duration+.02);
   oscillator.onended=()=>{oscillator.disconnect();filter.disconnect();gain.disconnect();};
  }
 }
 document.addEventListener('pointerdown',unlock,{once:true});
 document.addEventListener('keydown',unlock,{once:true});
 return {play,unlock};
})();
