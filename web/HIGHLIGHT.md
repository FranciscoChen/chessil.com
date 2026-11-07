# Shared UI guidance

`src/highlight.css` owns the white pulse used by all guidance, including training
squares. `src/highlight.js` owns positioned overlays, optional callouts and tours.
The shared server renderer loads their generated assets on every page. Rebuild
with `node web/scripts/build-board.js`.

```js
// Overlay tracks its target on scroll, resize and element size changes.
const cue = ChessilHighlight.show('#some-control');
cue.close();

// Text is optional. Plain text types in, then erases before Next advances.
ChessilHighlight.show('#some-control', {
  text: 'Choose an option here.',
  onNext() { /* advance the flow */ },
  onClose() { /* Skip or Escape */ }
});

ChessilHighlight.tour('feature-v1', [
  {target: '#some-control', text: 'Choose an option here.'},
  {target: '#another-control', text: 'Continue here.'}
]);
```

One positioned cue runs at a time. `clear()` removes it; returned handles also
expose `update()` for application-driven position changes. Tours skip hidden
controls and record the first presentation in localStorage. `{force:true}`
replays a tour. Storage failure leaves guidance usable without persistence.
No page starts a tour or UI callout automatically. The API is reserved for future
guidance; tour persistence is local to the browser.

Callouts use shared fonts, colors and buttons. Highlights do not intercept input;
Escape dismisses a callout. Screen readers receive the complete text rather than
individual character changes. Reduced motion shows the complete text immediately
and slows the essential white on/off cue to one cycle every two seconds.

Board guidance uses existing square overlays with the same `ui-highlight` class,
without creating a positioned overlay, callout, observer or timer. Pointer input
and piece animations remain independent. Source/destination geometry and legal
move markers remain owned by the shared native board.
