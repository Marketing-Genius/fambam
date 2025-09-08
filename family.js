<!-- family.js -->
<script>
/*
  Family Store (single-device)
  Keys: hub:family:parents, hub:family:kids, hub:family:pin, hub:family:v
  Photos are small data URLs; use your existing compressor when setting.
*/
window.Family = (() => {
  const K = {
    parents: 'hub:family:parents',
    kids: 'hub:family:kids',
    pin: 'hub:family:pin',
    ver: 'hub:family:v'
  };
  const VERSION = 1;
  const listeners = new Set();

  // --- utils ---
  const uid = () => Math.random().toString(36).slice(2,10);
  const load = (k, f) => { try { const v=JSON.parse(localStorage.getItem(k)); return v ?? f; } catch{ return f; } };
  const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const emit = () => listeners.forEach(fn => { try{ fn(); }catch{} });

  // --- defaults / seed ---
  function ensureSeed() {
    const v = load(K.ver, 0);
    if (!v) {
      // seed parents (empty) and kids (from your current Breakfast defaults)
      const kids = [
        { id: uid(), name: 'Emilia',   photo: null, enabled: true },
        { id: uid(), name: 'Hudson',   photo: null, enabled: true },
        { id: uid(), name: 'Penelope', photo: null, enabled: true },
        { id: uid(), name: 'Jasper',   photo: null, enabled: true },
      ];
      save(K.parents, []);
      save(K.kids, kids);
      save(K.pin, null); // set later
      save(K.ver, VERSION);
    }
  }

  // Optional one-time migration from old Breakfast keys
  function migrateFromBreakfastIfPresent() {
    const oldKidsRaw = localStorage.getItem('bc:kids');
    if (!oldKidsRaw) return;
    try {
      const oldKids = JSON.parse(oldKidsRaw);
      if (Array.isArray(oldKids) && oldKids.length) {
        const mapped = oldKids.map(k => ({
          id: k.id || uid(),
          name: k.name || 'Kid',
          photo: k.photo || null,
          enabled: true
        }));
        save(K.kids, mapped);
      }
      // do not delete old keys; keep Breakfast compatible during rollout
    } catch {}
  }

  // --- parents ---
  function getParents() { return load(K.parents, []); }
  function upsertParent(p) {
    const arr = getParents();
    const i = arr.findIndex(x => x.id === p.id);
    if (i >= 0) arr[i] = {...arr[i], ...p}; else arr.push({...p, id: p.id || uid()});
    save(K.parents, arr); emit();
  }
  function removeParent(id) {
    save(K.parents, getParents().filter(p => p.id !== id)); emit();
  }

  // PIN (4–8 digits suggested)
  function setPin(pin) { save(K.pin, pin || null); emit(); }
  function verifyPin(pin) { const real = load(K.pin, null); return real ? String(real) === String(pin) : true; }

  // --- kids ---
  function getKids() { return load(K.kids, []); }
  function getActiveKids() { return getKids().filter(k => k.enabled !== false); }
  function upsertKid(kid) {
    const arr = getKids();
    const i = arr.findIndex(x => x.id === kid.id);
    if (i >= 0) arr[i] = {...arr[i], ...kid}; else arr.push({...kid, id: kid.id || uid(), enabled: true});
    save(K.kids, arr); emit();
  }
  function removeKid(id) {
    save(K.kids, getKids().filter(k => k.id !== id)); emit();
  }
  function setKidEnabled(id, enabled) {
    const arr = getKids(); const k = arr.find(x => x.id === id); if (!k) return;
    k.enabled = !!enabled; save(K.kids, arr); emit();
  }

  // subscribe to changes (features can redraw if needed)
  function onChange(fn){ listeners.add(fn); return () => listeners.delete(fn); }

  // boot
  ensureSeed();
  migrateFromBreakfastIfPresent();

  return {
    // parents
    getParents, upsertParent, removeParent,
    setPin, verifyPin,
    // kids
    getKids, getActiveKids, upsertKid, removeKid, setKidEnabled,
    // events
    onChange
  };
})();
</script>
