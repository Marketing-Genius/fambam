// wallpaper.js — universal & live-preview ready
(function () {
  const IMG_KEY = 'hub:wallpaper:dataurl';
  const CFG_KEY = 'ui:wallpaper';

  const jget = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };

  function overlayCssFrom(cfg) {
    const ov = (cfg && cfg.overlay) || {};
    if (ov.type === 'gradient' && ov.start && ov.end) {
      const ang = Number(ov.angle ?? 180);
      return `linear-gradient(${ang}deg, ${ov.start}, ${ov.end})`;
    }
    // solid default (accepts hex/rgba/etc.)
    return ov.color || 'rgba(64,76,105,0.90)';
  }

  function applyAll() {
    // --- IMAGE ---
    const dataUrl = localStorage.getItem(IMG_KEY) || '';
    if (dataUrl) {
      document.documentElement.style.setProperty('--wallpaper-image', `url("${dataUrl}")`);
      const tag = ensureStyle('__wp_img');
      tag.textContent = `body::before{background-image:url("${dataUrl}") !important}`;
    } else {
      document.documentElement.style.setProperty('--wallpaper-image', `url('')`);
      removeStyle('__wp_img');
    }

    // --- OVERLAY + SHIFT ---
    const cfg = jget(CFG_KEY, {});
    const cssOverlay = overlayCssFrom(cfg);
    const opacity = (cfg.overlay && typeof cfg.overlay.opacity === 'number') ? cfg.overlay.opacity : 1;
    const shift = (cfg.shift || '40%').toString();

    document.documentElement.style.setProperty('--wp-overlay', cssOverlay);
    document.documentElement.style.setProperty('--wp-overlay-opacity', String(opacity));
    document.documentElement.style.setProperty('--wallpaper-shift', shift);

    // Force overlay on every page (no reliance on var timing)
    const ovTag = ensureStyle('__wp_ov');
    ovTag.textContent = `body::after{background:${cssOverlay} !important;opacity:${opacity} !important}`;
  }

  function ensureStyle(id) {
    let tag = document.getElementById(id);
    if (!tag) {
      tag = document.createElement('style');
      tag.id = id;
      (document.head || document.documentElement).prepend(tag);
    }
    return tag;
  }
  function removeStyle(id){ const t = document.getElementById(id); if (t) t.remove(); }

  // Public API for live updates from sliders
  function mergeOverlay(cur, patchOv){
    const ov = { ...(cur.overlay||{}) , ...(patchOv||{}) };
    // normalize type based on keys present
    if (ov.start && ov.end) ov.type = 'gradient';
    if (ov.color && !ov.start && !ov.end) ov.type = 'solid';
    return ov;
  }
  function saveCfg(next){
    const cur = jget(CFG_KEY, {});
    const merged = { ...cur, ...next, overlay: mergeOverlay(cur, next && next.overlay) };
    localStorage.setItem(CFG_KEY, JSON.stringify(merged));
    return merged;
  }

  window.Wallpaper = {
    apply: applyAll,
    get: () => jget(CFG_KEY, {}),
    set(next){ saveCfg(next||{}); applyAll(); },
    image(url){
      if (url === undefined) return localStorage.getItem(IMG_KEY)||'';
      if (!url) localStorage.removeItem(IMG_KEY); else localStorage.setItem(IMG_KEY, url);
      applyAll();
    }
  };

  // Initial paint + cross-tab sync
  applyAll();
  window.addEventListener('storage', (e)=>{ if (e.key===IMG_KEY || e.key===CFG_KEY) applyAll(); });
})();
