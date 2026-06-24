# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

- **No build step** — plain JS, no bundler, no npm/package.json
- **Run tests**: Open `content-script.test.html` in a browser (Chrome/Firefox). The page loads all source files and runs assertions, displaying "PASS" or "FAIL" in a `<pre>` element. No test framework — plain `assertEqual`/`assertMatch` calls.
- **Load extension**: Chrome → Extensions (chrome://extensions) → Load unpacked → select repo root
- **Debug**: After loading, navigate to `https://chatgpt.com/c/*` and inspect the content script via DevTools (the extension injects into the page context, not an isolated world)

## Architecture

Chrome MV3 content script extension. All modules are plain IIFEs that register onto `root.TLTimelineModules` — no ES modules, no bundler.

### Module load order (from manifest.json)

```
src/core/utils.js          — DOM helpers, URL parsing, turn merging, QA grouping
src/core/state.js          — State factory, preferences (localStorage)
src/data/auth.js           — Auth header construction from chrome.storage + cookies (401 retry)
src/data/conversation-api.js — Fetch ChatGPT conversation API JSON, parse mapping tree
src/data/dom-collector.js  — Scrape turns from rendered DOM (Voyager/legacy selectors)
src/ui/geometry.js         — Map DOM turn positions to timeline marker Y coordinates
src/navigation/locator.js  — Scroll spy, active group detection, jump-to-turn
src/ui/styles.js           — Inject/remove CSS via <style> element (light + dark CSS variables)
src/ui/layout.js           — Expand chat content width when timeline is active (CSS class toggle)
src/ui/timeline.js         — Render marker rail + hover preview card (collapsed-only mode)
src/features/export.js     — Markdown/JSON conversation export
src/content-main.js        — Orchestrator: hooks history.pushState, starts MutationObserver
```

Plus a background service worker:
```
src/background/token-capture.js — Captures auth Bearer token from webRequest headers
```

### Key data flow

1. **Two data sources**: API (`fetch` to `/backend-api/conversation/{id}`) and DOM (`MutationObserver` on `<main>`)
2. **Turn merging**: `mergeTurnsById()` in utils.js merges API and DOM turns by `apiMessageId` or text key
3. **QA grouping**: `buildQaGroups()` pairs user turns with subsequent assistant turns
4. **Timeline markers**: `buildTimelineGeometry()` in geometry.js computes Y positions from DOM `getBoundingClientRect` offsets
5. **Scroll spy**: locator.js `computeActiveGroupId()` tracks which QA group is at ~45% viewport scroll
6. **Click-to-navigate**: `jumpToTurn()` scrolls the target turn into view and applies a temporary highlight class

### Auth flow

1. Background service worker (`token-capture.js`) listens to `webRequest.onSendHeaders` for ChatGPT XHR requests
2. Extracts the `Authorization: Bearer` token and stores it in `chrome.storage.local` under `accessToken`
3. Content script (`auth.js`) reads from `chrome.storage.local` to build `Authorization` headers for API calls
4. On 401 responses, the content script clears the cached token and retries once (forces re-capture)

### Turn data structure

Each turn object has these key fields:
```
id              string      — unique turn ID (e.g., "msg-u1")
role            "u"|"a"    — user or assistant
text            string      — normalized text content
sortIndex       number     — position in conversation order
apiMessageId    string     — ID from API mapping (for merging)
el              Element    — DOM element reference (for scroll/geometry)
seenInCurrentDom boolean   — whether the DOM element is currently attached
```

### State management

Central state object created by `createState()` in state.js. Holds turns, groups, UI refs, timers. Route changes increment a `routeToken` — stale async callbacks check this token to avoid updating the wrong conversation.

```js
// Key state fields
initialized: false,         // whether timeline is active on current page
routeToken: 0,              // incremented on each route change
conversationId: '',         // extracted from URL /c/{id}
turns: [],                  // merged API+DOM turns (the single source of truth)
apiTurns: [],               // raw API-fetched turns
domTurns: [],               // raw DOM-scraped turns
groups: [],                 // QA groups built from turns
activeGroupId: '',          // currently active group tracked by scroll spy
loading: false,             // API fetch in progress
error: '',                  // API error message
apiCompleteness: null,      // metadata about API data completeness
```

### Constants (from utils.js)

Key tuning values in `utils.CONSTANTS`:
- `API_REFRESH_RETRY_MS: 1500` — delay between API fetch retries
- `API_REFRESH_MAX_ATTEMPTS: 6` — max retries before giving up on API
- `ROUTE_POLL_MS: 500` — URL change polling interval
- `HIGHLIGHT_DURATION_MS: 1600` — how long the turn highlight flash lasts
- `JUMP_SETTLE_DELAY_MS: 260` — delay before scroll-settle re-check
- `ACTIVE_TOP_THRESHOLD: 180` — scroll position offset for active detection

### Module patterns

- Every module wraps in an IIFE: `(function(root) { ... })(typeof globalThis !== 'undefined' ? globalThis : this)`
- Modules check `root.document` before any DOM access (runs in content script + test page contexts)
- Modules read each other via `root.TLTimelineModules.{name}` (e.g., `ns.utils = ns.utils || {}`)
- Tests use the `__TL_TEST_API__` global which exposes internal functions
- The `content-script.js` file at root is a legacy stub — all logic is in `src/*`

### Conventions

- **CSS**: All classes prefixed with `tl-` (e.g., `tl-collapsed`, `tl-marker-active`, `tl-hover-card`, `tl-turn-focus`)
- **IDs**: `tl-chat-timeline` (panel), `tl-chat-style` (injected style element)
- **CSS variables**: Light and dark mode via `:root` / `html.dark` custom properties (`--tl-rail-width`, `--tl-marker-active`, etc.)
- **localStorage keys**: `tl-chat-timeline-prefs` (mode preference)
- **chrome.storage keys**: `accessToken`, `tokenTimestamp`, `tokenSource`, `tokenInfo`

### UI states

The timeline has these visual states:
- **Collapsed** (default): A narrow rail (~26px) with clickable dot markers, no text. Hovering opens a preview card overlay on the left.
- **Hover preview**: A scrollable card listing all question groups. Active group is auto-scrolled into view. Stays open while mouse is within rail or card area, closes after 180ms delay on mouseleave.
- **Legacy expanded mode**: Normalized back to collapsed on render (the `normalizeMode()` function always returns `'collapsed'`).

### Error and loading handling

- When conversation API fetch fails, turns fall back to DOM-only data
- API retries are bounded by `CONSTANTS.API_REFRESH_MAX_ATTEMPTS` (6)
- JS exceptions in individual modules are caught silently — the UI degrades to DOM-only mode
- `isRouteCurrent()` checks prevent stale callbacks from updating the wrong conversation

### Test page patterns

The test file `content-script.test.html`:
- Loads all source scripts in order (same as manifest.json)
- Creates fake DOM elements with `fakeTurnElement()` helper that mimics ChatGPT's `data-testid="conversation-turn-N"` structure
- Mocks `chrome.storage.local` and `window.fetch` for auth/API tests
- Uses `document.createElement` for geometry/layout tests (elements not attached to real document)
- All assertions run in a single `setTimeout(async function() { ... })` after scripts load
