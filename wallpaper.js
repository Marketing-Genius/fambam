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
