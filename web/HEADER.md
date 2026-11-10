# Shared header

`ui/header.js` owns the markup and localized labels for every page. The page renderer
uses it for English, Spanish and Chinese; do not add page-specific header copies.
`web/css/header.css` owns header layout, panels, rows, icons and responsive behavior.
It consumes the palette, fonts and layering tokens from `design-system.css`.

`web/js/header.js` owns all menu opening/closing, keyboard navigation, mobile
navigation, account visibility and cancellable player search. A single surface is
open at a time. It uses native buttons and links, `aria-expanded` / `aria-controls`,
and returns focus on Escape. Theme selection uses the same `chessilTheme` handler
as general settings; language selection retains the server's `/language` form.

Feature code supplies menu content, not a second menu controller. Listen for the
bubbling `chessil:menu-open` event (`event.detail.id` is the panel ID) to refresh
content on opening. `ChessilHeader.close()` closes the current surface. The games
menu uses this event while retaining its notification-driven refreshes.

Run `node --test web/tests/header-browser.test.js web/tests/game-menu-browser.test.js`
for interaction, locale, account, responsive and theme coverage. Browser tests
write temporary visual evidence under `/tmp`, never into production assets.
