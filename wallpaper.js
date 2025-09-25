(() => {
  const KEY = 'hub:wallpaper:dataurl';

  function apply() {
    try {
      const data = localStorage.getItem(KEY);
      const val = data ? `url("${data}")` : `url("")`;
      document.documentElement.style.setProperty('--wallpaper', val);
    } catch (e) {
      // ignore
    }
  }

  function set(dataUrl) {
    try { localStorage.setItem(KEY, dataUrl || ''); } catch {}
    apply();
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch {}
    apply();
  }

  // Export
  window.Wallpaper = { apply, set, clear, KEY };

  // Run on normal load…
  document.addEventListener('DOMContentLoaded', apply, { once: true });
  // …and when coming back via back/forward cache
  window.addEventListener('pageshow', apply);
  // keep pages in sync if storage changes elsewhere
  window.addEventListener('storage', (e) => { if (e.key === KEY) apply(); });
})();
/* wallpaper.js: global wallpaper/overlay manager */
(function () {
  const KEY = 'ui:wallpaper';
  const droot = document.documentElement;

  function applyWallpaper(cfg){
    cfg = cfg || {};
    // Image/shift (optional)
    if (cfg.image) droot.style.setProperty('--wallpaper-image', `url('${cfg.image}')`);
    if (cfg.shift) droot.style.setProperty('--wallpaper-shift', cfg.shift);

    // Overlay
    const type = cfg.overlay?.type || 'solid'; // 'solid'|'gradient'
    const opacity = clamp01(cfg.overlay?.opacity ?? 0.90);
    droot.style.setProperty('--wp-overlay-opacity', String(opacity));

    let overlay = 'rgba(64,76,105,0.90)';
    if (type === 'solid') {
      const color = cfg.overlay?.color || 'rgba(64,76,105,1)';
      overlay = color; // can be rgba/hex8
    } else {
      const start = cfg.overlay?.start || 'rgba(64,76,105,1)';
      const end   = cfg.overlay?.end   || 'rgba(30,41,59,1)';
      const angle = Number(cfg.overlay?.angle ?? 180);
      overlay = `linear-gradient(${angle}deg, ${start}, ${end})`;
    }
    droot.style.setProperty('--wp-overlay', overlay);
  }

  function clamp01(v){ v = Number(v); return isNaN(v) ? 1 : Math.max(0, Math.min(1, v)); }

  function loadCfg(){
    try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch { return {}; }
  }

  // Initial
  applyWallpaper(loadCfg());

  // Live updates from any tab
  window.addEventListener('storage', (e)=>{
    if (e.key === KEY) {
      try { applyWallpaper(JSON.parse(e.newValue || '{}')); } catch {}
    }
  });

  // Expose a tiny API (optional)
  window.Wallpaper = {
    get: loadCfg,
    set(next){
      const merged = { ...loadCfg(), ...next };
      localStorage.setItem(KEY, JSON.stringify(merged));
      applyWallpaper(merged);
    }
  };
})();