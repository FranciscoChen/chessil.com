# Shared progress, loading and countdown UI

`src/timing.css` owns all bar and countdown animation. `src/timing.js` provides
`ChessilTiming.start(root, options)`, which sets up a duration once and calls
`onFinish` on the CSS countdown's `animationend`. No interval, frame callback,
or timer updates the visual progress or countdown digits.

The shared renderer loads these assets globally. Shared markup helpers in
`ui/components.js` provide `progress`, `meter` and `countdown`:

- `progress({id, label, value, max})`: native determinate progress for actual work.
  Set its value only when work advances. It does not simulate loading.
- `meter({id, label, loading:true})`: indeterminate loading bar, animated by CSS.
- `meter({id, label})` plus `countdown()` inside a container: timed progress.

```js
const handle = ChessilTiming.start(container, {
  seconds: 5,
  label: 'Next lesson',
  format: seconds => seconds + 's',
  onFinish() { /* advance application state */ }
});
handle.cancel(); // also available as ChessilTiming.cancel(container)
```

`start` creates a countdown placeholder if one is absent, so a timer does not
require a bar. Reusing a container cancels its earlier run. Formatting and digit
markup are prepared once; CSS steps move the digit strip once per second.
Durations are whole seconds, bounded to 1–3600. CSS custom properties carry
`--ui-duration` and `--ui-steps`. Animated bars use transforms rather than width.
Reduced motion keeps stepped digits and the correct elapsed duration; loading
bars become steady and timed bars update at completion. Screen readers get a
stable timer label instead of an announcement every second.

Training autoplay and puzzle rush use this API. The rush controller retains an
absolute deadline to reject moves after expiry even if the tab is suspended.
Game clocks display authoritative game time; they are not loading animations.

Build generated assets with `node web/scripts/build-board.js`.
