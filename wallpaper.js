<!-- wallpaper.js -->
<script>
(function(){
  const VAR = {
    img:   '--wallpaper-image',
    shift: '--wallpaper-shift',
    ov:    '--wp-overlay',
    op:    '--wp-overlay-opacity'
  };
  const KEY = {
    data: 'hub:wallpaper:dataurl',
    cfg:  'ui:wallpaper'
  };

  function pct(v){
    if (v==null) return null;
    const s = String(v).trim();
    return s.endsWith('%') ? s : (isFinite(+s) ? s + '%' : null);
  }

  function applyAll() {
    try{
      // Image (do NOT clobber if none saved)
      const dataUrl = localStorage.getItem(KEY.data);
      if (dataUrl && /^data:image\//.test(dataUrl)) {
        document.documentElement.style.setProperty(VAR.img, `url("${dataUrl}")`);
      }

      // Overlay + shift
      const cfg = JSON.parse(localStorage.getItem(KEY.cfg) || '{}');
      const sh = pct(cfg.shift ?? '40%');
      if (sh) document.documentElement.style.setProperty(VAR.shift, sh);

      const ov = cfg.overlay || {};
      if (ov.type === 'solid' && ov.color){
        document.documentElement.style.setProperty(VAR.ov, ov.color);
      } else if (ov.type === 'gradient' && ov.start && ov.end){
        const angle = Number(ov.angle ?? 180);
        document.documentElement.style.setProperty(
          VAR.ov, `linear-gradient(${angle}deg, ${ov.start}, ${ov.end})`
        );
      }
      if (typeof ov.opacity === 'number'){
        document.documentElement.style.setProperty(VAR.op, String(ov.opacity));
      }
    }catch(_){}
  }

  // Public API used by Settings page, safe on any page
  window.Wallpaper = {
    set(patch={}){
      try{
        // Update storage first
        if ('image' in patch) {
          const v = String(patch.image||'');
          if (v) localStorage.setItem(KEY.data, v);
          else   localStorage.removeItem(KEY.data);
        }
        if ('overlay' in patch || 'shift' in patch){
          const cur = JSON.parse(localStorage.getItem(KEY.cfg) || '{}');
          const next = { ...cur, ...('shift' in patch ? {shift: patch.shift} : {} ) };
          if (patch.overlay) next.overlay = { ...(cur.overlay||{}), ...patch.overlay };
          localStorage.setItem(KEY.cfg, JSON.stringify(next));
        }
      }catch(_){}
      // Then apply to CSS vars immediately
      applyAll();
    },
    get(){
      try{
        return {
          image: localStorage.getItem(KEY.data) || '',
          config: JSON.parse(localStorage.getItem(KEY.cfg) || '{}')
        };
      }catch(_){ return { image:'', config:{} }; }
    }
  };

  // Apply on DOM ready (works across all pages)
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyAll, {once:true});
  } else {
    applyAll();
  }

  // React to changes from other tabs/pages
  window.addEventListener('storage', (e)=>{
    if (e.key === KEY.data || e.key === KEY.cfg) applyAll();
  });
})();
</script>
