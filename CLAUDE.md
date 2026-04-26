# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
src/data/auth.js           — Auth header construction from chrome.storage + cookies
src/data/conversation-api.js — Fetch ChatGPT conversation API JSON, parse mapping tree
src/data/dom-collector.js  — Scrape turns from rendered DOM (Voyager/legacy selectors)
src/ui/geometry.js         — Map DOM turn positions to timeline marker Y coordinates
src/navigation/locator.js  — Scroll spy, active group detection, jump-to-turn
src/ui/styles.js           — Inject/remove CSS via <style> element (light + dark mode)
src/ui/layout.js           — Expand chat content width when timeline is active (CSS class toggle)
src/ui/timeline.js         — Render marker rail + hover preview card
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

### State management

Central state object created by `createState()` in state.js. Holds turns, groups, UI refs, timers. Route changes increment a `routeToken` — stale async callbacks check this token to avoid updating the wrong conversation.

### Module patterns

- Every module wraps in an IIFE: `(function(root) { ... })(typeof globalThis !== 'undefined' ? globalThis : this)`
- Modules check `root.document` before any DOM access (runs in content script + test page contexts)
- Tests use the `__TL_TEST_API__` global which exposes internal functions
- The `content-script.js` file at root is a legacy stub — all logic is in `src/*`
