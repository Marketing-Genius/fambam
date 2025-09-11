<script>
// wallpaper.js — read/apply the home wallpaper everywhere
(function(){
  const KEY = 'hub:wallpaper:dataurl';

  function apply(url){
    document.documentElement.style.setProperty('--wallpaper', url ? `url("${url}")` : 'url("")');
  }

  // Apply on load
  try { apply(localStorage.getItem(KEY)); } catch {}

  // If another tab/page updates the wallpaper, update this one too
  window.addEventListener('storage', (e)=>{
    if (e.key === KEY) apply(e.newValue);
  });

  // Optional helper you can call from any page that *sets* the wallpaper
  window.Wallpaper = {
    get(){ try { return localStorage.getItem(KEY); } catch { return null; } },
    set(dataUrl){ try { localStorage.setItem(KEY, dataUrl || ''); apply(dataUrl); } catch {} }
  };
})();
</script>
