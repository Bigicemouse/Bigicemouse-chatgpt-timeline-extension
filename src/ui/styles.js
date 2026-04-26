(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const CONSTANTS = ns.utils.CONSTANTS;

  function ensureStyle() {
    if (!root.document || root.document.getElementById(CONSTANTS.STYLE_ID)) return;
    const style = root.document.createElement('style');
    style.id = CONSTANTS.STYLE_ID;
    style.textContent = `
      :root{
        --tl-panel-right:clamp(8px,.8vw,14px);
        --tl-panel-space:52px;
        --tl-rail-width:26px;
        --tl-preview-gap:12px;
        --tl-preview-width:clamp(230px,18vw,320px);
        --tl-preview-bg:rgba(255,255,255,.94);
        --tl-preview-border:rgba(15,23,42,.08);
        --tl-preview-shadow:0 18px 44px rgba(15,23,42,.12);
        --tl-track:#e5e7eb;
        --tl-preview-text:#111827;
        --tl-preview-muted:#94a3b8;
        --tl-marker:#d8dee8;
        --tl-marker-hover:#2563eb;
        --tl-marker-active:#2563eb;
        --tl-focus:rgba(37,99,235,.36);
      }
      html.dark{
        --tl-track:rgba(255,255,255,.14);
        --tl-preview-bg:rgba(23,23,23,.78);
        --tl-preview-border:rgba(255,255,255,.10);
        --tl-preview-shadow:0 18px 52px rgba(0,0,0,.34);
        --tl-preview-text:#f5f5f5;
        --tl-preview-muted:#a3a3a3;
        --tl-marker:#5b6472;
        --tl-marker-hover:#60a5fa;
        --tl-marker-active:#60a5fa;
        --tl-focus:rgba(96,165,250,.42);
      }
      body.tl-timeline-expanded .tl-chat-width-expanded{
        max-width:calc(100vw - var(--tl-panel-space)) !important;
        width:100% !important;
        margin-left:auto !important;
        margin-right:auto !important;
        transition:max-width .18s ease;
      }
      #${CONSTANTS.PANEL_ID}{
        position:fixed;
        top:50%;
        right:var(--tl-panel-right);
        width:var(--tl-rail-width);
        height:min(440px, calc(100vh - 128px));
        min-height:132px;
        max-height:min(440px, calc(100vh - 128px));
        z-index:999999;
        box-sizing:border-box;
        transform:translateY(-50%);
        overflow:visible;
        font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        color:inherit;
        pointer-events:auto;
      }
      #${CONSTANTS.PANEL_ID}.tl-collapsed{
        width:var(--tl-rail-width);
      }
      #${CONSTANTS.PANEL_ID}.tl-previewing{
        width:calc(var(--tl-preview-width) + var(--tl-preview-gap) + var(--tl-rail-width));
      }
      #${CONSTANTS.PANEL_ID}.tl-previewing::before{
        content:"";
        position:absolute;
        top:0;
        right:var(--tl-rail-width);
        width:var(--tl-preview-gap);
        height:100%;
      }
      .tl-marker-rail{
        position:absolute;
        top:0;
        right:0;
        width:var(--tl-rail-width);
        height:100%;
        min-height:132px;
        max-height:min(440px, calc(100vh - 128px));
        padding:6px 0;
        display:block;
        background:rgba(255,255,255,.88);
        border:1px solid rgba(15,23,42,.06);
        border-radius:16px;
        box-shadow:0 10px 28px rgba(15,23,42,.08);
        overflow:hidden;
        box-sizing:border-box;
      }
      html.dark .tl-marker-rail{
        background:rgba(24,24,27,.82);
        border-color:rgba(255,255,255,.08);
        box-shadow:0 14px 32px rgba(0,0,0,.28);
      }
      .tl-marker-track{
        position:relative;
        width:100%;
        height:min(428px, calc(100vh - 140px));
        min-height:120px;
        overflow-y:auto;
        overflow-x:visible;
        scrollbar-width:none;
      }
      .tl-marker-track::-webkit-scrollbar{display:none;}
      .tl-marker-track::before{
        content:"";
        position:absolute;
        top:10px;
        bottom:10px;
        left:50%;
        width:1px;
        transform:translateX(-50%);
        background:var(--tl-track);
        opacity:.48;
      }
      .tl-marker-track-content{
        position:relative;
        width:100%;
        min-height:120px;
      }
      .tl-timeline-marker{
        position:absolute;
        left:50%;
        transform:translate(-50%, -50%);
        width:22px;
        height:18px;
        min-height:18px;
        padding:0;
        border:0;
        border-radius:8px;
        background:transparent;
        box-shadow:none;
        cursor:pointer;
        opacity:1;
        transition:opacity .16s ease;
      }
      .tl-timeline-marker::after{
        content:"";
        position:absolute;
        top:50%;
        left:50%;
        width:9px;
        height:3px;
        border-radius:999px;
        background:var(--tl-marker);
        transform:translate(-50%, -50%);
        transition:width .16s ease, height .16s ease, background .16s ease;
      }
      .tl-timeline-marker:hover{
        opacity:.96;
      }
      .tl-timeline-marker:hover::after{
        width:14px;
        height:3px;
        background:var(--tl-marker-hover);
      }
      .tl-timeline-marker.tl-marker-active,
      .tl-timeline-marker.active{
        opacity:1;
      }
      .tl-timeline-marker.tl-marker-active::after,
      .tl-timeline-marker.active::after{
        width:18px;
        height:4px;
        background:var(--tl-marker-active);
      }
      .tl-timeline-marker:focus-visible{
        outline:2px solid var(--tl-focus);
        outline-offset:2px;
      }
      .tl-hover-card{
        position:absolute;
        top:50%;
        right:calc(var(--tl-rail-width) + var(--tl-preview-gap));
        width:var(--tl-preview-width);
        max-height:min(360px, calc(100vh - 136px));
        padding:14px 10px;
        border:1px solid var(--tl-preview-border);
        border-radius:18px;
        background:var(--tl-preview-bg);
        box-shadow:var(--tl-preview-shadow);
        backdrop-filter:blur(16px);
        -webkit-backdrop-filter:blur(16px);
        transform:translateY(-50%);
        overflow-y:auto;
        overflow-x:hidden;
        box-sizing:border-box;
        overscroll-behavior:contain;
        scrollbar-width:thin;
        scrollbar-color:rgba(148,163,184,.45) transparent;
      }
      .tl-hover-card::-webkit-scrollbar{width:6px;}
      .tl-hover-card::-webkit-scrollbar-thumb{
        background:rgba(148,163,184,.40);
        border-radius:999px;
      }
      .tl-hover-row{
        display:grid;
        grid-template-columns:minmax(0,1fr) 18px;
        align-items:center;
        gap:10px;
        width:100%;
        min-height:30px;
        padding:0 2px 0 8px;
        border:0;
        border-radius:10px;
        background:transparent;
        color:var(--tl-preview-muted);
        cursor:pointer;
        font-size:14px;
        line-height:1.25;
        text-align:left;
      }
      .tl-hover-row:hover{
        color:var(--tl-preview-text);
        background:rgba(148,163,184,.10);
      }
      .tl-hover-row.active{
        color:var(--tl-marker-hover);
        font-weight:500;
      }
      .tl-hover-title{
        min-width:0;
        overflow:hidden;
        white-space:nowrap;
        text-overflow:ellipsis;
      }
      .tl-hover-mark{
        width:10px;
        height:3px;
        border-radius:999px;
        background:var(--tl-track);
        justify-self:end;
      }
      .tl-hover-row.active .tl-hover-mark{
        width:16px;
        background:var(--tl-marker-hover);
      }
      .tl-turn-focus{
        border-radius:18px;
        box-shadow:0 0 0 2px rgba(37,99,235,.35), 0 0 0 8px rgba(37,99,235,.10);
        transition:box-shadow .18s ease;
      }
    `;
    root.document.head.appendChild(style);
  }

  function removeStyle() {
    const style = root.document && root.document.getElementById(CONSTANTS.STYLE_ID);
    if (style) style.remove();
  }

  ns.styles = {
    ensureStyle: ensureStyle,
    removeStyle: removeStyle
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
