(function(root) {
  const ns = root.TLTimelineModules = root.TLTimelineModules || {};
  const CONSTANTS = ns.utils.CONSTANTS;

  function ensureStyle() {
    if (!root.document || root.document.getElementById(CONSTANTS.STYLE_ID)) return;
    const style = root.document.createElement('style');
    style.id = CONSTANTS.STYLE_ID;
    style.textContent = `
      :root{
        --tl-panel-right:clamp(10px,1.4vw,24px);
        --tl-panel-space:42px;
        --tl-rail-width:44px;
        --tl-preview-width:min(302px, calc(100vw - 32px));
        --tl-blue:#6ea0ff;
        --tl-preview-bg:#202020;
        --tl-preview-border:#343434;
        --tl-preview-shadow:0 18px 36px rgba(0,0,0,.26);
        --tl-preview-text:#f5f5f5;
        --tl-preview-muted:#a7a7a7;
        --tl-row-hover-bg:rgba(255,255,255,.04);
        --tl-marker:#5b5b5b;
        --tl-marker-hover:#8aaeff;
        --tl-active-text:var(--tl-blue);
        --tl-marker-active:var(--tl-blue);
        --tl-focus:rgba(110,160,255,.34);
      }
      html.dark{
        --tl-blue:#6ea0ff;
        --tl-preview-bg:#202020;
        --tl-preview-border:#343434;
        --tl-preview-shadow:0 18px 36px rgba(0,0,0,.26);
        --tl-preview-text:#f5f5f5;
        --tl-preview-muted:#a7a7a7;
        --tl-row-hover-bg:rgba(255,255,255,.04);
        --tl-marker:#5b5b5b;
        --tl-marker-hover:#8aaeff;
        --tl-active-text:var(--tl-blue);
        --tl-marker-active:var(--tl-blue);
        --tl-focus:rgba(110,160,255,.34);
      }
      @media (prefers-color-scheme: dark){
        html:not(.light){
          --tl-blue:#6ea0ff;
          --tl-preview-bg:#202020;
          --tl-preview-border:#343434;
          --tl-preview-shadow:0 18px 36px rgba(0,0,0,.26);
          --tl-preview-text:#f5f5f5;
          --tl-preview-muted:#a7a7a7;
          --tl-row-hover-bg:rgba(255,255,255,.04);
          --tl-marker:#5b5b5b;
          --tl-marker-hover:#8aaeff;
          --tl-active-text:var(--tl-blue);
          --tl-marker-active:var(--tl-blue);
          --tl-focus:rgba(110,160,255,.34);
        }
      }
      body.tl-timeline-expanded.tl-layout-comfortable .tl-chat-width-expanded{
        max-width:min(1120px, calc(100vw - var(--tl-panel-space))) !important;
        width:100% !important;
        margin-left:auto !important;
        margin-right:auto !important;
        transition:max-width .18s ease;
      }
      body.tl-timeline-expanded.tl-layout-wide .tl-chat-width-expanded{
        max-width:calc(100vw - var(--tl-panel-space)) !important;
        width:100% !important;
        margin-left:auto !important;
        margin-right:auto !important;
        transition:max-width .18s ease;
      }
      body.tl-timeline-expanded.tl-layout-full .tl-chat-width-expanded{
        max-width:calc(100vw - var(--tl-panel-space) - 18px) !important;
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
        height:min(108px, calc(100vh - 96px));
        min-height:48px;
        max-height:min(108px, calc(100vh - 96px));
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
        width:var(--tl-preview-width);
      }
      #${CONSTANTS.PANEL_ID}.tl-previewing::before{
        display:none;
      }
      .tl-marker-rail{
        position:absolute;
        top:0;
        right:0;
        width:var(--tl-rail-width);
        height:100%;
        min-height:48px;
        max-height:min(108px, calc(100vh - 96px));
        padding:0;
        display:block;
        background:transparent;
        border:0;
        border-radius:0;
        box-shadow:none;
        overflow:visible;
        box-sizing:border-box;
        cursor:pointer;
      }
      html.dark .tl-marker-rail{
        background:transparent;
        border-color:transparent;
        box-shadow:none;
      }
      #${CONSTANTS.PANEL_ID}.tl-previewing .tl-marker-rail{
        opacity:0;
        pointer-events:none;
      }
      @media (prefers-color-scheme: dark){
        html:not(.light) .tl-marker-rail{
          background:transparent;
          border-color:transparent;
          box-shadow:none;
        }
      }
      .tl-marker-track{
        position:relative;
        width:100%;
        height:100%;
        min-height:48px;
        display:flex;
        align-items:center;
        overflow-y:visible;
        overflow-x:visible;
        scrollbar-width:none;
      }
      .tl-marker-track::-webkit-scrollbar{display:none;}
      .tl-marker-track::before{display:none;}
      .tl-marker-track-content{
        position:relative;
        width:100%;
        min-height:48px;
      }
      .tl-timeline-marker{
        position:absolute;
        left:50%;
        transform:translate(-50%, -50%);
        width:44px;
        height:22px;
        min-height:22px;
        padding:0;
        border:0;
        border-radius:6px;
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
        width:16px;
        height:3px;
        border-radius:999px;
        background:var(--tl-marker);
        transform:translate(-50%, -50%);
        opacity:.45;
        transition:width .16s ease, height .16s ease, background .16s ease, opacity .16s ease;
      }
      .tl-timeline-marker:hover{
        opacity:.96;
      }
      .tl-timeline-marker:hover::after{
        width:24px;
        height:4px;
        background:var(--tl-marker-hover);
        opacity:.85;
      }
      .tl-timeline-marker.tl-marker-active,
      .tl-timeline-marker.active{
        opacity:1;
      }
      .tl-timeline-marker.tl-marker-active::after,
      .tl-timeline-marker.active::after{
        width:34px;
        height:4px;
        background:var(--tl-marker-active);
        opacity:1;
      }
      .tl-timeline-marker:focus-visible{
        outline:2px solid var(--tl-focus);
        outline-offset:2px;
      }
      .tl-hover-card{
        position:absolute;
        top:50%;
        right:0;
        width:var(--tl-preview-width);
        max-height:min(224px, calc(100vh - 96px));
        padding:13px 0;
        border:1px solid var(--tl-preview-border);
        border-radius:18px;
        background:var(--tl-preview-bg);
        box-shadow:var(--tl-preview-shadow);
        transform:translateY(-50%);
        animation:tl-hover-card-in .14s ease-out both;
        overflow:hidden;
        overflow-x:hidden;
        box-sizing:border-box;
        overscroll-behavior:contain;
        scrollbar-width:none;
      }
      @keyframes tl-hover-card-in{
        from{
          opacity:.2;
        }
        to{
          opacity:1;
        }
      }
      .tl-hover-row{
        position:relative;
        width:100%;
        min-height:42px;
        height:42px;
        padding:0 16px 0 30px;
        border:0;
        background:transparent;
        color:var(--tl-preview-text);
        cursor:pointer;
        font-size:13px;
        line-height:1.2;
        text-align:left;
        box-sizing:border-box;
      }
      .tl-hover-title-button{
        display:grid;
        grid-template-columns:minmax(0,1fr) 14px;
        align-items:center;
        gap:10px;
        width:100%;
        min-width:0;
        min-height:42px;
        padding:0;
        border:0;
        background:transparent;
        color:inherit;
        cursor:pointer;
        font:inherit;
        text-align:left;
      }
      .tl-hover-title-button::after{
        content:"";
        width:10px;
        height:3px;
        border-radius:999px;
        background:currentColor;
        opacity:.36;
      }
      .tl-hover-row:hover{
        color:var(--tl-preview-text);
        background:var(--tl-row-hover-bg);
      }
      .tl-hover-row.active{
        color:var(--tl-active-text);
        font-weight:400;
        background:transparent;
      }
      .tl-hover-row.active .tl-hover-title-button::after{
        width:14px;
        height:4px;
        opacity:1;
      }
      .tl-hover-body{
        display:block;
        min-width:0;
      }
      .tl-hover-title{
        display:block;
        min-width:0;
        overflow:hidden;
        white-space:nowrap;
        text-overflow:ellipsis;
        text-align:left;
      }
      .tl-hover-list{
        position:relative;
        max-height:224px;
        overflow-y:auto;
        overflow-x:hidden;
        scrollbar-width:none;
        background:var(--tl-preview-bg);
      }
      .tl-hover-card::-webkit-scrollbar{display:none;}
      .tl-hover-list::-webkit-scrollbar{display:none;}
      .tl-hover-list-spacer{
        position:relative;
        min-height:36px;
      }
      .tl-hover-list-window{
        position:absolute;
        top:0;
        left:0;
        right:0;
      }
      .tl-empty-state{
        min-height:72px;
        display:flex;
        align-items:center;
        justify-content:center;
        color:var(--tl-preview-muted);
        font-size:13px;
      }
      .tl-turn-focus{
        border-radius:18px;
        box-shadow:0 0 0 2px rgba(110,160,255,.34), 0 0 0 8px rgba(110,160,255,.12);
        transition:box-shadow .18s ease;
      }
      .katex,
      .katex-display,
      [data-math],
      .math-inline,
      .math-block{
        cursor:pointer;
      }
      .katex,
      [data-math],
      .math-inline,
      .math-block{
        border-radius:4px;
        transition:background-color .15s ease, box-shadow .15s ease;
      }
      .katex:hover,
      [data-math]:hover,
      .math-inline:hover,
      .math-block:hover{
        background:rgba(110,160,255,.12);
        box-shadow:0 0 0 1px rgba(110,160,255,.38);
      }
      .tl-formula-copy-toast{
        position:fixed;
        z-index:1000000;
        max-width:min(280px, calc(100vw - 16px));
        padding:8px 12px;
        border-radius:8px;
        color:#fff;
        font:600 13px/1.2 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        pointer-events:none;
        opacity:0;
        transform:translateY(-8px) scale(.96);
        transition:opacity .16s ease, transform .16s ease;
        white-space:nowrap;
        box-shadow:0 12px 28px rgba(0,0,0,.28);
      }
      .tl-formula-copy-toast.show{
        opacity:1;
        transform:translateY(0) scale(1);
      }
      .tl-formula-copy-toast-success{
        background:linear-gradient(135deg, #6ea0ff, #3f6fd6);
      }
      .tl-formula-copy-toast-error{
        background:linear-gradient(135deg, #ef4444, #b91c1c);
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
