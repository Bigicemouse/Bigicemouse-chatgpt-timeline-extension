# DeepSeek Video2 Timeline Replica Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ChatGPT Timeline hover interaction visually match the available DeepSeek “video2” reference: the opened card is the timeline itself, with row markers inside the card and aligned to the original right rail.

**Architecture:** Keep the current MV3 content-script architecture and IIFE modules. `src/ui/timeline.js` owns DOM structure and interaction state; `src/ui/styles.js` owns the DeepSeek visual replica; `content-script.test.html` verifies geometry and behavior with browser DOM assertions.

**Tech Stack:** Plain JavaScript IIFEs, injected CSS, Chrome MV3 content script, headless Chrome/Playwright for visual smoke checks.

---

## Evidence And Requirements

No actual video file named `视频2` or `video2` was found in the repo or top-level temp clipboard files. The authoritative available evidence is the DeepSeek-style PNG references from the current thread:

- Opened card is one dark rounded rectangle, not a separate floating menu plus a second timeline.
- The opened card sits on the timeline lane: its right edge aligns with the original right-side rail.
- The separate collapsed rail markers are hidden while the card is open.
- Each row has its own right-side short horizontal marker inside the card.
- The active row uses blue text and a blue marker; inactive rows use white/gray text and muted gray markers.
- Row titles stay inside the card and truncate with ellipsis.
- Long conversations keep virtualized scrolling and do not rebuild the whole card while scrolling.

## File Structure

- Modify: `src/ui/styles.js`  
  DeepSeek replica CSS: card width, radius, dark surface, right-edge alignment, internal row marker alignment, active/inactive marker sizes and colors.

- Modify: `src/ui/timeline.js`  
  Keep compact card DOM-only rendering, no external active labels, no old search/export/width controls inside the card.

- Modify: `content-script.test.html`  
  Browser assertions for card-on-rail geometry, hidden external rail, row marker alignment tokens, virtualized scrolling, and no old controls.

- Optional Modify: `src/content-main.js`, `manifest.json`, `src/popup/*`  
  Only if width popup or message handling regresses while timeline styling changes.

## Task 1: Lock The “Card Is The Timeline” Geometry

**Files:**
- Modify: `src/ui/styles.js`
- Test: `content-script.test.html`

- [x] **Step 1: Add failing geometry assertions**

In `content-script.test.html`, assert:

```js
assertEqual(Math.round(previewRect.right), Math.round(railRect.right), 'DeepSeek-style hover card should render on top of the timeline rail');
assertEqual(Number.parseFloat(window.getComputedStyle(uiState.ui.panel.querySelector('.tl-marker-rail')).opacity), 0, 'separate rail markers should be hidden while the card renders its own row markers');
```

- [x] **Step 2: Run the browser test to verify current behavior**

Run with Chrome/Playwright against:

```text
file:///D:/Code/chatgpt-timeline-extension/content-script.test.html
```

Expected: PASS only if the card right edge equals the rail right edge and external markers hide.

- [x] **Step 3: Implement CSS alignment**

In `src/ui/styles.js`:

```css
#tl-chat-timeline.tl-previewing { width: var(--tl-preview-width); }
.tl-hover-card { right: 0; width: var(--tl-preview-width); }
#tl-chat-timeline.tl-previewing .tl-marker-rail {
  opacity: 0;
  pointer-events: none;
}
```

- [x] **Step 4: Run browser test**

Expected: PASS.

## Task 2: Align Internal Row Markers To The Original Rail

**Files:**
- Modify: `src/ui/styles.js`
- Test: `content-script.test.html`

- [x] **Step 1: Add style assertions**

In `content-script.test.html`, assert the row marker lane uses the rail-aligned padding:

```js
assertEqual(window.getComputedStyle(uiState.ui.panel.querySelector('.tl-hover-row')).paddingRight, '16px', 'row marker lane should align with the original rail center');
```

- [x] **Step 2: Implement row marker alignment**

In `src/ui/styles.js`, set row right padding so the internal `::after` marker center lands on the original rail center:

```css
.tl-hover-row { padding: 0 16px 0 30px; }
.tl-hover-title-button { grid-template-columns: minmax(0, 1fr) 14px; }
.tl-hover-title-button::after { width: 10px; height: 3px; }
.tl-hover-row.active .tl-hover-title-button::after { width: 14px; height: 4px; }
```

- [x] **Step 3: Run browser test**

Expected: PASS.

## Task 3: Preserve Runtime Behavior

**Files:**
- Modify only if tests fail: `src/ui/timeline.js`, `src/content-main.js`
- Test: `content-script.test.html`

- [x] **Step 1: Verify interaction invariants**

Run browser test and confirm:

- Marker hover opens card.
- Moving from rail into card keeps it clickable.
- Leaving card closes after delay.
- Clicking a row jumps to the group.
- 19-row and 300-row previews do not rebuild the card while scrolling.
- Formula copy tests still pass.

- [x] **Step 2: Keep width control outside timeline**

## Task 5: Match The Video-Like Open Interaction

**Files:**
- Modify: `src/ui/timeline.js`
- Modify: `src/ui/styles.js`
- Test: `content-script.test.html`

- [x] **Step 1: Make marker click open the same DeepSeek card**

In `src/ui/timeline.js`, call `openHoverPreview(state, actions)` from marker and rail click handlers before navigation, so clicking the timeline also renders the card on the timeline.

- [x] **Step 2: Add a subtle card entrance animation**

In `src/ui/styles.js`, add `@keyframes tl-hover-card-in` and apply it to `.tl-hover-card` so the card fades into place without changing geometry; scaling is intentionally avoided because the opened card must stay aligned to the timeline rail from the first frame.

- [x] **Step 3: Add regression assertions**

In `content-script.test.html`, assert the keyframes exist and marker clicks render `.tl-hover-card`.

Do not reintroduce timeline search/export/width controls inside `.tl-hover-card`. Width stays in `src/popup/*`.

## Task 4: Final Verification

**Files:**
- Check: all modified files

- [ ] **Step 1: Syntax checks**

```powershell
node --check src\ui\timeline.js
node --check src\content-main.js
node --check src\popup\popup.js
```

Expected: exit code 0.

- [ ] **Step 2: Manifest parse**

```powershell
Get-Content -Raw manifest.json | ConvertFrom-Json | Out-Null
```

Expected: no parse error.

- [ ] **Step 3: Browser test**

Open `content-script.test.html` in Chrome/Playwright.

Expected: `<pre id="output">PASS</pre>`.

- [ ] **Step 4: Visual smoke**

Render a synthetic two-row timeline and inspect:

- The opened card is a single dark rounded rectangle.
- There are no visible external labels or duplicated rail markers.
- Blue and gray markers are inside the card.
- The card right edge is on the original rail line.

- [ ] **Step 5: Whitespace/conflict check**

```powershell
git diff --check
```

Expected: no whitespace errors or conflict markers; LF/CRLF warnings are acceptable if no error lines are reported.
