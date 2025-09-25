/* wallpaper.js — universal wallpaper + overlay */
(function(){
  const KEY_CFG = 'ui:wallpaper';              // overlay + shift live here
  const KEY_IMG = 'hub:wallpaper:dataurl';     // legacy image store

  const droot = document.documentElement;

  function clamp01(v){ v = Number(v); return isNaN(v) ? 1 : Math.max(0, Math.min(1, v)); }

  function loadCfg(){
    // overlay + shift
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem(KEY_CFG) || '{}') || {}; } catch {}
    // image (kept separately for backwards compatibility)
    const img = localStorage.getItem(KEY_IMG) || '';
    if (img && !cfg.image) cfg.image = img;
    return cfg;
  }

  function apply(cfg){
    cfg = cfg || {};
    // image
    droot.style.setProperty('--wallpaper-image', cfg.image ? `url('${cfg.image}')` : `url('')`);
    // vertical shift
    if (cfg.shift) droot.style.setProperty('--wallpaper-shift', cfg.shift);

    // overlay
    const ov = cfg.overlay || {};
    const type = ov.type || 'solid';
    const opacity = clamp01(ov.opacity ?? 0.90);

    let overlay = 'rgba(64,76,105,0.90)';

    if (type === 'solid'){
      // Expect hex8 or rgba; if hex without alpha, opacity will come from the color
      overlay = ov.color || overlay;
    } else {
      const start = ov.start || 'rgba(64,76,105,1)';
      const end   = ov.end   || 'rgba(30,41,59,1)';
      const angle = Number(ov.angle ?? 180);
      overlay = `linear-gradient(${angle}deg, ${start}, ${end})`;
    }

    droot.style.setProperty('--wp-overlay', overlay);
    // Optional: expose opacity for themes that use it in CSS
    droot.style.setProperty('--wp-overlay-opacity', String(opacity));
  }

  function saveCfg(patch){
    const cur = loadCfg();
    const next = { ...cur, ...patch };

    // image is stored under KEY_IMG for legacy pages
    if ('image' in patch){
      try { localStorage.setItem(KEY_IMG, patch.image || ''); } catch {}
    }

    // never persist "image" inside KEY_CFG
    const { image, ...persist } = next;
    try { localStorage.setItem(KEY_CFG, JSON.stringify(persist)); } catch {}

    apply(next);
  }

  // Boot
  function boot(){ apply(loadCfg()); }

  // Sync across tabs & BFCache
  window.addEventListener('storage', (e)=>{
    if (e.key === KEY_CFG || e.key === KEY_IMG) boot();
  });
  document.addEventListener('DOMContentLoaded', boot, { once:true });
  window.addEventListener('pageshow', boot);

  // Public API
  window.Wallpaper = {
    get: loadCfg,
    set(patch){ saveCfg(patch || {}); },
    clearImage(){ try{ localStorage.removeItem(KEY_IMG); }catch{}; boot(); }
  };
})();
