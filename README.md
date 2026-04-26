# ChatGPT Timeline Navigator

A Chrome/Edge MV3 extension that adds a fixed right-side timeline to ChatGPT conversations.

## Features

- Fetches complete ChatGPT conversation mappings through the backend conversation API.
- Captures ChatGPT bearer tokens in the background service worker for authenticated API reads.
- Falls back to rendered DOM collection when the API is unavailable.
- Shows a minimal fixed right-side rail with clickable timeline markers.
- Expands a scrollable hover preview with all question groups for long conversations.
- Supports Markdown and JSON conversation export.

## Install

1. Open `chrome://extensions` or `edge://extensions`.
2. Enable developer mode.
3. Choose `Load unpacked`.
4. Select this repository folder.

## Test

Open `content-script.test.html` in a browser. The page displays `PASS` when the local assertions pass.

There is no build step and no package manager dependency.

## Project Structure

- `manifest.json` - MV3 extension manifest.
- `src/background/token-capture.js` - background bearer token capture.
- `src/data/conversation-api.js` - conversation API fetch and mapping parsing.
- `src/ui/timeline.js` - fixed rail and hover preview rendering.
- `src/ui/styles.js` - injected timeline styles.
- `src/content-main.js` - content script orchestrator.
