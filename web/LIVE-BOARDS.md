# Shared live previews

The authoritative game service publishes active snapshots into the central Redis
live index, including FEN, last move, ply count, side to move, stored clocks,
last-move timestamp, and clock-running flag. FEN is recomputed only when history
changes. Move broadcasts schedule a coalesced publish after 250 ms; the existing
three-second tick and expiry remain recovery paths. Ended/expired games leave the
index. Redis PubSub distinguishes position changes from membership changes so a
move does not trigger lobby SQL reloads.

`GET /live/games?ids=GAMEID,...&featured=1` is a read-only SSE stream. Clients
never connect directly to Redis. `live-stream.js` shares one snapshot cache and
refresh/fan-out per web worker; only changed game snapshots and removed IDs are
sent. One refresh sorts featured games once for all consumers. Five-second polling
repairs missed PubSub events, with 15-second heartbeats. Each stream accepts up to
16 explicit IDs plus eight featured games. Admission bounds each worker to 2,000
streams and 3,584 distinct explicit subscriptions, reserving 512 discovery slots.
Slow consumers above 64 KiB pending output are disconnected for native reconnect.

`ChessilLiveGames` in `web/js/live-boards.js` multiplexes all page previews through
one EventSource. `mount`, `hydrate`, `subscribe`, and `snapshot` are shared APIs.
`data-live-board="GAMEID"` selects a game; `data-live-featured="0"` selects a
featured slot. `data-board-only` omits clocks. The native renderer/assets load
lazily, using the same piece and board themes as full boards, with input disabled.
One visible-page clock timer derives remaining time from server timestamps;
no ticking packets are sent. Removed DOM views unsubscribe and destroy their board.
Hidden pages disconnect; visible pages reconnect and receive current snapshots.

The landing illustration becomes a clickable live board while a game is available
and restores its original illustration/link when the stream removes that game.
Lobby watch rows and the ongoing-games page use the same previews with clocks.
The header keeps compact text game links. Ended previews are cleared, rather than
continuing to advertise a stale live board. Cached snapshots hydrate replaced
widgets immediately while the shared subscription refreshes.

Verification: `game/tests/live-games.test.js` exercises real Redis lifecycle and
clock data; `web/tests/live-stream.test.js` checks shared reads, deltas, removals,
validation and backpressure; `document-live-browser.test.js` checks real browser
SSE, native mini boards, clocks, landing fallback, and ongoing-game reuse.
