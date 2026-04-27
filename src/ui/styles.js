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
        --tl-panel-space:58px;
        --tl-rail-width:30px;
        --tl-preview-gap:12px;
        --tl-preview-width:min(clamp(500px,44vw,620px), calc(100vw - 76px));
        --tl-preview-bg:#ffffff;
        --tl-preview-surface:#f7f8fb;
        --tl-preview-border:#d9dde6;
        --tl-preview-shadow:0 20px 44px rgba(15,23,42,.15);
        --tl-track:#d7dce5;
        --tl-preview-text:#101828;
        --tl-preview-muted:#596375;
        --tl-preview-subtle:#8a94a6;
        --tl-row-active-bg:#f3f6fb;
        --tl-row-hover-bg:#f7f9fc;
        --tl-marker:#cfd6e2;
        --tl-marker-hover:#256f7a;
        --tl-marker-active:#256f7a;
        --tl-focus:rgba(37,111,122,.32);
      }
      html.dark{
        --tl-track:rgba(255,255,255,.16);
        --tl-preview-bg:#18181b;
        --tl-preview-surface:#202024;
        --tl-preview-border:#34343a;
        --tl-preview-shadow:0 18px 52px rgba(0,0,0,.40);
        --tl-preview-text:#f4f4f5;
        --tl-preview-muted:#b6bac3;
        --tl-preview-subtle:#8a8f9a;
        --tl-row-active-bg:rgba(96,165,250,.16);
        --tl-row-hover-bg:rgba(255,255,255,.07);
        --tl-marker:#5b6472;
        --tl-marker-hover:#60a5fa;
        --tl-marker-active:#60a5fa;
        --tl-focus:rgba(96,165,250,.42);
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
        background:rgba(255,255,255,.92);
        border:1px solid rgba(15,23,42,.08);
        border-radius:8px;
        box-shadow:0 8px 22px rgba(15,23,42,.07);
        overflow:hidden;
        box-sizing:border-box;
        cursor:pointer;
      }
      html.dark .tl-marker-rail{
        background:rgba(24,24,27,.96);
        border-color:rgba(255,255,255,.12);
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
        width:28px;
        height:24px;
        min-height:24px;
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
        width:12px;
        height:4px;
        border-radius:999px;
        background:var(--tl-accent, var(--tl-marker));
        transform:translate(-50%, -50%);
        opacity:.38;
        transition:width .16s ease, height .16s ease, background .16s ease, opacity .16s ease;
      }
      .tl-timeline-marker:hover{
        opacity:.96;
      }
      .tl-timeline-marker:hover::after{
        width:18px;
        height:4px;
        background:var(--tl-accent, var(--tl-marker-hover));
        opacity:.85;
      }
      .tl-timeline-marker.tl-marker-active,
      .tl-timeline-marker.active{
        opacity:1;
      }
      .tl-timeline-marker.tl-marker-active::after,
      .tl-timeline-marker.active::after{
        width:22px;
        height:5px;
        background:var(--tl-accent, var(--tl-marker-active));
        opacity:1;
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
        max-height:min(460px, calc(100vh - 136px));
        padding:0;
        border:1px solid var(--tl-preview-border);
        border-radius:6px;
        background:var(--tl-preview-bg);
        box-shadow:var(--tl-preview-shadow);
        transform:translateY(-50%);
        overflow:hidden;
        overflow-x:hidden;
        box-sizing:border-box;
        overscroll-behavior:contain;
        scrollbar-width:thin;
        scrollbar-color:rgba(148,163,184,.45) transparent;
      }
      .tl-report-header{
        display:flex;
        align-items:flex-end;
        justify-content:space-between;
        gap:14px;
        padding:14px 16px 11px;
        border-bottom:1px solid var(--tl-preview-border);
        background:linear-gradient(180deg,#fff 0%,#fafbfe 100%);
      }
      html.dark .tl-report-header{
        background:linear-gradient(180deg,#18181b 0%,#1f2026 100%);
      }
      .tl-report-heading{
        min-width:0;
      }
      .tl-report-eyebrow{
        margin-bottom:3px;
        color:var(--tl-preview-subtle);
        font-size:10px;
        line-height:1;
        text-transform:uppercase;
        letter-spacing:0;
      }
      .tl-report-title{
        color:var(--tl-preview-text);
        font-family:Georgia,"Times New Roman",serif;
        font-size:19px;
        font-weight:700;
        line-height:1.1;
      }
      .tl-report-meta{
        flex:0 0 auto;
        color:var(--tl-preview-muted);
        font-size:12px;
        line-height:1.2;
        white-space:nowrap;
      }
      .tl-export-toolbar{
        position:relative;
        top:auto;
        z-index:1;
        display:grid;
        grid-template-columns:minmax(0,1fr);
        align-items:center;
        gap:10px;
        margin:0;
        padding:12px 14px;
        border-bottom:1px solid var(--tl-preview-border);
        background:var(--tl-preview-surface);
      }
      .tl-search-wrap{
        grid-column:1 / -1;
        min-width:0;
      }
      .tl-toolbar-controls{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        min-width:0;
      }
      .tl-search-input{
        width:100%;
        height:34px;
        padding:0 12px;
        border:1px solid var(--tl-preview-border);
        border-radius:7px;
        background:#fff;
        color:var(--tl-preview-text);
        font:13px/1 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        outline:none;
        box-sizing:border-box;
      }
      .tl-search-input::placeholder{
        color:var(--tl-preview-subtle);
      }
      .tl-search-input:focus{
        border-color:var(--tl-marker-hover);
        box-shadow:0 0 0 2px var(--tl-focus);
      }
      .tl-export-choices,
      .tl-export-buttons{
        display:flex;
        align-items:center;
        gap:0;
        min-width:0;
      }
      .tl-export-choices{
        flex:0 1 auto;
        flex-wrap:wrap;
        border:1px solid var(--tl-preview-border);
        border-radius:7px;
        overflow:hidden;
        width:max-content;
        max-width:100%;
      }
      .tl-export-buttons{
        flex:0 0 auto;
        justify-content:flex-end;
        flex-wrap:wrap;
        gap:6px;
        margin-left:auto;
      }
      .tl-export-choice{
        display:inline-flex;
        align-items:center;
        gap:5px;
        min-width:0;
        height:26px;
        padding:0 9px;
        border:0;
        border-right:1px solid var(--tl-preview-border);
        border-radius:0;
        background:#fff;
        color:var(--tl-preview-muted);
        font-size:12px;
        line-height:1;
        white-space:nowrap;
        cursor:pointer;
      }
      .tl-export-choice:last-child{
        border-right:0;
      }
      .tl-export-choice input{
        width:12px;
        height:12px;
        margin:0;
        accent-color:var(--tl-marker-hover);
      }
      .tl-layout-control{
        position:relative;
        display:inline-flex;
      }
      .tl-export-button{
        min-width:48px;
        height:26px;
        padding:0 10px;
        border:1px solid var(--tl-preview-border);
        border-radius:7px;
        background:var(--tl-preview-surface);
        color:var(--tl-preview-text);
        font-size:12px;
        line-height:1;
        cursor:pointer;
      }
      .tl-layout-button{
        min-width:44px;
      }
      @media (max-width: 560px){
        .tl-toolbar-controls{
          align-items:flex-start;
          flex-direction:column;
          gap:8px;
        }
        .tl-export-buttons{
          justify-content:flex-start;
          margin-left:0;
        }
      }
      html.dark .tl-export-button{
        background:var(--tl-preview-surface);
      }
      html.dark .tl-search-input,
      html.dark .tl-export-choice{
        background:var(--tl-preview-surface);
      }
      .tl-export-button:hover{
        border-color:var(--tl-marker-hover);
        color:var(--tl-marker-hover);
      }
      .tl-selection-toggle.active{
        border-color:var(--tl-marker-hover);
        color:var(--tl-marker-hover);
        background:var(--tl-row-active-bg);
      }
      .tl-export-button:focus-visible,
      .tl-export-choice input:focus-visible{
        outline:2px solid var(--tl-focus);
        outline-offset:2px;
      }
      .tl-layout-menu{
        position:absolute;
        top:29px;
        right:0;
        z-index:2;
        min-width:74px;
        padding:5px;
        border:1px solid var(--tl-preview-border);
        border-radius:8px;
        background:var(--tl-preview-bg);
        box-shadow:0 14px 34px rgba(15,23,42,.14);
        backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);
      }
      .tl-layout-option{
        display:block;
        width:100%;
        min-height:26px;
        padding:0 8px;
        border:0;
        border-radius:6px;
        background:transparent;
        color:var(--tl-preview-muted);
        font-size:12px;
        text-align:left;
        cursor:pointer;
      }
      .tl-layout-option:hover,
      .tl-layout-option.active{
        color:var(--tl-marker-hover);
        background:rgba(37,99,235,.08);
      }
      .tl-hover-row{
        display:grid;
        grid-template-columns:minmax(0,1fr);
        align-items:center;
        gap:8px;
        position:relative;
        width:100%;
        min-height:52px;
        height:52px;
        padding:0 13px;
        border:0;
        border-bottom:1px solid rgba(148,163,184,.18);
        border-radius:0;
        background:transparent;
        color:var(--tl-preview-text);
        cursor:pointer;
        font-size:13px;
        line-height:1.25;
        text-align:left;
        box-sizing:border-box;
      }
      .tl-hover-row::before{
        content:"";
        position:absolute;
        top:10px;
        bottom:10px;
        left:0;
        width:3px;
        border-radius:999px;
        background:var(--tl-accent, transparent);
        opacity:.24;
      }
      .tl-hover-row.tl-selection-mode{
        grid-template-columns:24px minmax(0,1fr);
      }
      .tl-row-select{
        width:14px;
        height:14px;
        margin:0;
        justify-self:center;
        accent-color:var(--tl-marker-hover);
        cursor:pointer;
      }
      .tl-hover-title-button{
        display:grid;
        grid-template-columns:34px minmax(0,1fr);
        align-items:center;
        gap:10px;
        width:100%;
        min-width:0;
        min-height:52px;
        padding:0;
        border:0;
        background:transparent;
        color:inherit;
        cursor:pointer;
        font:inherit;
        text-align:left;
      }
      .tl-hover-row:hover{
        color:var(--tl-preview-text);
        background:var(--tl-row-hover-bg);
      }
      .tl-hover-row.active{
        color:var(--tl-marker-hover);
        font-weight:500;
        background:var(--tl-row-active-bg);
      }
      .tl-hover-row.active::before{
        background:var(--tl-accent, var(--tl-marker-active));
        opacity:1;
      }
      .tl-hover-row.tl-row-unselected{
        opacity:.55;
      }
      .tl-hover-index{
        color:var(--tl-accent, var(--tl-preview-subtle));
        font-family:Georgia,"Times New Roman",serif;
        font-size:15px;
        font-weight:700;
        line-height:1;
      }
      .tl-hover-body{
        display:grid;
        gap:3px;
        min-width:0;
      }
      .tl-hover-title{
        min-width:0;
        overflow:hidden;
        white-space:nowrap;
        text-overflow:ellipsis;
      }
      .tl-hover-summary{
        min-width:0;
        overflow:hidden;
        color:var(--tl-preview-muted);
        font-size:11px;
        font-weight:400;
        line-height:1.25;
        white-space:nowrap;
        text-overflow:ellipsis;
      }
      .tl-hover-list{
        position:relative;
        max-height:288px;
        overflow-y:auto;
        overflow-x:hidden;
        scrollbar-width:thin;
        scrollbar-color:rgba(100,116,139,.45) transparent;
        background:var(--tl-preview-bg);
      }
      .tl-hover-list::-webkit-scrollbar{width:6px;}
      .tl-hover-list::-webkit-scrollbar-thumb{
        background:rgba(100,116,139,.45);
        border-radius:999px;
      }
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
