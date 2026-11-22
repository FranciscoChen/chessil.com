/* A single preference is shared by desktop and mobile training controls. */
window.ChessilHintToggle = function hintToggle(buttons, onChange) {
 const key = 'chessil.training.hints';
 let enabled = true;
 try { enabled = localStorage.getItem(key) !== 'off'; } catch (_) {}
 const update = () => buttons.forEach(button => button?.setAttribute('aria-pressed', String(enabled)));
 buttons.forEach(button => {
  if (!button) return;
  button.onclick = () => {
   enabled = !enabled;
   try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch (_) {}
   update();
   onChange(enabled);
  };
 });
 update();
 return () => enabled;
};
