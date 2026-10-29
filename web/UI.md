# Shared website UI

Localized pages compose the same header and footer with `<!-- component:header -->`
and `<!-- component:footer -->`. Edit the six localized fragments in
`web/components/`; `render-page.js` loads them once on web startup and expands
these markers before compression. The existing push deployment restarts both
web instances to publish component changes.

Styles load in this order:

1. `css/site.css`: fonts, layout, base colors, buttons, header and footer.
2. Page styles such as `auth.css`, `game.css`, `user.css`, `query.css`.
3. `grandmaster.css`: the site's existing gold theme.
4. `components.css`: shared surfaces, form controls, responsive adjustments and
   light theme variables.

Use the palette variables instead of fixed white panels and black text. The
server sets `html[data-theme]` from the session; the header switches that attribute
and saves the preference with the existing endpoints. It no longer adds the old
monolithic light/dark stylesheets.

Keep page IDs and chess DOM elements stable: `game.js` and `u.js` use them to
attach controls. Navigation uses anchors; POST forms perform actions. The user
menu's `/profile` route redirects signed-in users to their public `/@/username`
page and anonymous users to `/login`.

## Lobby and dialogs

The lobby uses one responsive table for desktop and mobile, with separate join
and watch views. Creation shows an owned waiting challenge, an invite link, and
an explicit cancel action. The backend lists guest creators with a left join;
`isOwn` is computed from the session without exposing session IDs. Repeated
creation requests for the same settings reuse the pending challenge under a
short database advisory lock. Cancellation atomically checks ownership and
that no opponent has claimed the game. Both start and cancel events propagate
across web instances; status polling is a fallback when SSE is unavailable.

`dialogs.js` manages native dialogs with Escape/backdrop closing, a keyboard
focus loop and focus return. `dialog.css` provides shared fields and buttons;
`query.css` holds lobby layout rules. The three translated pages use the same
IDs, behavior and localized message dictionary in `lobby-text.js`.

CSS imports are versioned along with their dependencies, so changing a shared
header/layout stylesheet invalidates both the parent CSS URL and the imported
stylesheet URL after deployment.

## Game layout

`play.css` styles the game shell, player cards, clocks, history and controls;
`game.css` retains chessboard geometry and piece images. Desktop uses a board
with an adjacent history/clock column. Tablet and phone layouts place player
cards above and below the board, with actions and history underneath.

`gameUiState()` updates controls from the numeric game state and authenticated
socket role. Players see draw/resign actions, spectators and completed games
see links to start another game, and replay buttons become available after the
game. Clock highlights follow the turn, independently of player orientation.
Promotion choices use native buttons and keep their pointer events from
triggering board moves. Keep the board and clock IDs/classes stable: the move
code uses their measured geometry and orientation classes.

Public user profiles include a fair-play summary with two values: an automated
0–100 suspicion warning and the fraction of sufficiently analysed games flagged.
An unavailable warning is displayed as a dash with sample coverage, never zero.
The copy distinguishes automated flags from confirmed cheating and translates
into English, Spanish and Chinese. Internal detector reasons/session IDs are not
part of the public `/userinfo` response.
