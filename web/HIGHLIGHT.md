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
No page starts a UI tour automatically. Training uses an inline callout for the
current lesson; tour persistence remains local to the browser.

Callouts use shared fonts, colors and buttons. Highlights do not intercept input;
Escape dismisses a positioned callout; inline lesson text stays in place. Screen readers receive the complete text rather than
individual character changes. Reduced motion shows the complete text immediately
and slows the essential white fade to one cycle every two seconds.

Board guidance uses existing square overlays with the same `ui-highlight` class,
without creating a positioned overlay, observer or timer for each square. Pointer input
and piece animations remain independent. Source/destination geometry and legal
move markers remain owned by the shared native board.

Training supplies lesson text once through the same callout primitive:

```js
ChessilHighlight.show(board, {
  text: lessonInstruction,
  actions: false,
  highlight: false,
  container: document.querySelector('#training-guidance-callout')
});
```

`container` keeps the callout in normal document flow; `highlight: false` omits
additional overlays and dimming. Existing CSS square cues keep pulsing. Text is
not attached to pointer updates. Training deduplicates concept, move note and
status text, hides the duplicated panel copy, and places the lesson title above
the board. Recall and timed tactics do not reveal move notes through this callout.

Every `.ui-highlight` also draws an outer white outline that contracts into its
bounds over the pulse cycle. The pseudo-element inherits the cue's corner shape;
positioned overlays copy the target's border radius on layout updates. Outline
ink does not expand layout or scroll bounds, including board-edge squares. The
contraction uses CSS keyframes; reduced motion retains the fade without contraction.
