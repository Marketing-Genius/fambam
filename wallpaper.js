// wallpaper.js — universal, works on every page without page-specific boot code
(function () {
  const IMG_KEY = 'hub:wallpaper:dataurl';
  const CFG_KEY = 'ui:wallpaper';

  // Helper: safe JSON parse
  const jget = (k, d) => {
    try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; }
  };

  function applyAll() {
    // 1) image
    const dataUrl = localStorage.getItem(IMG_KEY) || '';
    if (dataUrl) {
      // CSS var for normal flow
      document.documentElement.style.setProperty('--wallpaper-image', `url("${dataUrl}")`);

      // Fallback: inject/refresh an inline style that sets the real rule,
      // so the image shows even if vars or timing ever fail.
      let tag = document.getElementById('__wp_inline');
      const css = `body::before{background-image:url("${dataUrl}") !important}`;
      if (!tag) {
        tag = document.createElement('style');
        tag.id = '__wp_inline';
        tag.textContent = css;
        // Put it *early* in <head> so it always wins
        (document.head || document.documentElement).prepend(tag);
      } else {
        tag.textContent = css;
      }
    } else {
      // clear both var + inline rule if no image
      document.documentElement.style.setProperty('--wallpaper-image', `url('')`);
      const tag = document.getElementById('__wp_inline');
      if (tag) tag.remove();
    }

    // 2) overlay + shift
    const cfg = jget(CFG_KEY, {});
    if (cfg && typeof cfg === 'object') {
      if (cfg.shift) {
        document.documentElement.style.setProperty('--wallpaper-shift', String(cfg.shift));
      }
      const ov = cfg.overlay || null;
      if (ov) {
        if (ov.type === 'solid' && ov.color) {
          document.documentElement.style.setProperty('--wp-overlay', ov.color);
        } else if (ov.type === 'gradient' && ov.start && ov.end) {
          const ang = Number(ov.angle ?? 180);
          document.documentElement.style.setProperty('--wp-overlay', `linear-gradient(${ang}deg, ${ov.start}, ${ov.end})`);
        }
        if (typeof ov.opacity === 'number') {
          document.documentElement.style.setProperty('--wp-overlay-opacity', String(ov.opacity));
        }
      }
    }
  }

  // Run ASAP (before CSS paints if possible)
  applyAll();

  // Live-sync if another tab/page updates settings
  window.addEventListener('storage', (e) => {
    if (e.key === IMG_KEY || e.key === CFG_KEY) applyAll();
  });

  // Safety: if DOM was not ready yet for the <style> prepend, try once more
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAll, { once: true });
  }
})();
