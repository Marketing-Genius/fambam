// --- Global gesture guards (iOS Safari pinch/gesture) ---
['gesturestart','gesturechange','gestureend'].forEach(evt =>
  window.addEventListener(evt, e => e.preventDefault(), { passive:false })
);

document.addEventListener('DOMContentLoaded', () => {
  const cvs = document.getElementById('world');
  const ctx = cvs.getContext('2d', { alpha: false });

  // Block two-finger pinch on the canvas
  cvs.addEventListener('touchmove', e => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive:false });

  // ---- Canvas / view ----
  let W = innerWidth, H = innerHeight, DPR = window.devicePixelRatio || 1;
  let scale = 1, camX = 0, camY = 0;

  function resize(){
    W = innerWidth; H = innerHeight; DPR = window.devicePixelRatio || 1;
    cvs.width  = Math.round(W * DPR);
    cvs.height = Math.round(H * DPR);
    cvs.style.width  = W + 'px';
    cvs.style.height = H + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- Simple world (AABB boxes) ----
  const gravity = { y: 800 };
  const bounds  = { left:-2000, right:2000, top:-2000, bottom: 1200 };

  const MAT = {
    WOOD:  { name:'wood',  hp:100, color:'#9a6e4c', stroke:'#e9d5b5' },
    METAL: { name:'metal', hp:220, color:'#5b6775', stroke:'#cbd5e1' }
  };

  /** @type {{id:number,x:number,y:number,w:number,h:number,vx:number,vy:number,static?:boolean,mat:any,hp:number}[]} */
  const bodies = [];
  let nextId = 1;

  function addBox(x,y,w,h,mat,opts={}){
    bodies.push({
      id: nextId++,
      x,y,w,h,
      vx:0, vy:0,
      static: !!opts.static,
      mat,
      hp: opts.hp ?? mat.hp
    });
  }

  // Ground + a couple blocks to see motion
  function seed(){
    bodies.length = 0;
    addBox(-800, 900, 1600, 60, MAT.METAL, { static:true }); // ground
    addBox(-60, 200, 120, 60, MAT.WOOD);
    addBox( 90, 100, 120, 60, MAT.METAL);
  }
  seed();

  // ---- Interaction UI ----
  const ui = document.getElementById('ui');
  const toolBtns = Array.from(ui.querySelectorAll('.btn[data-tool]'));
  const btnDelete = document.getElementById('btnDelete');
  const btnPause  = document.getElementById('btnPause');
  const btnReset  = document.getElementById('btnReset');
  const btnFS     = document.getElementById('btnFullscreen');
  const grav      = document.getElementById('grav');

  const state = { tool: 'hand', deleting:false, paused:false };

  toolBtns.forEach(b => {
    b.addEventListener('click', () => {
      // ignore disabled “coming soon” tools
      if (b.disabled) return;
      toolBtns.forEach(x => x.dataset.on = '0');
      b.dataset.on = '1';
      state.tool = b.dataset.tool;
      state.deleting = false;
      btnDelete.dataset.on = '0';
    });
  });

  btnDelete.addEventListener('click', () => {
    state.deleting = !state.deleting;
    btnDelete.dataset.on = state.deleting ? '1' : '0';
  });

  btnPause.addEventListener('click', () => {
    state.paused = !state.paused;
    btnPause.textContent = state.paused ? '▶️ Resume' : '⏸️ Pause';
  });

  btnReset.addEventListener('click', () => {
    seed();
  });

  if (grav) {
    grav.addEventListener('input', e => {
      gravity.y = Number(e.target.value) || 800;
    });
  }

  function goFullscreen(){
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen({ navigationUI:'hide' }).catch(()=>{});
      return;
    }
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen();
      return;
    }
    // iOS fallback (PWA best). Hide chrome and use 100svh
    document.body.classList.toggle('fs-sim');
  }
  btnFS.addEventListener('click', goFullscreen);

  // ---- Pointer input (drag/place/pan/zoom) ----
  const worldToScreen = (wx,wy)=>[(wx-camX)*scale,(wy-camY)*scale];
  const screenToWorld = (sx,sy)=>[sx/scale+camX, sy/scale+camY];

  let dragging = null, dragOffX = 0, dragOffY = 0;
  let panning = false, lastPX = 0, lastPY = 0;

  function pickBody(wx,wy){
    for(let i=bodies.length-1;i>=0;i--){
      const b = bodies[i];
      if (wx>=b.x && wx<=b.x+b.w && wy>=b.y && wy<=b.y+b.h) return b;
    }
    return null;
  }

  cvs.addEventListener('pointerdown', e=>{
    cvs.setPointerCapture(e.pointerId);
    const [wx,wy] = screenToWorld(e.clientX, e.clientY);

    // Middle mouse (or secondary touch) pans
    if (e.button === 1 || (e.pointerType==='touch' && !e.isPrimary)) {
      panning = true; lastPX = e.clientX; lastPY = e.clientY; return;
    }

    if (state.deleting){
      const b = pickBody(wx,wy);
      if (b && !b.static){
        bodies.splice(bodies.indexOf(b),1);
      }
      return;
    }

    switch(state.tool){
      case 'hand':{
        const b = pickBody(wx,wy);
        if (b && !b.static){
          dragging = b;
          dragOffX = wx - b.x; dragOffY = wy - b.y;
          b.vx = b.vy = 0;
        }
        break;
      }
      case 'wood':  addBox(wx-30, wy-20, 60,40, MAT.WOOD);  break;
      case 'metal': addBox(wx-30, wy-20, 60,40, MAT.METAL); break;
      case 'robot': addBox(wx-40, wy-40, 80,80, MAT.WOOD, { hp:130 }); break;
      // “water/fire/acid” are disabled in UI for now
    }
  });

  cvs.addEventListener('pointermove', e=>{
    const [wx,wy] = screenToWorld(e.clientX, e.clientY);
    if (panning){
      camX -= (e.clientX - lastPX) / scale;
      camY -= (e.clientY - lastPY) / scale;
      lastPX = e.clientX; lastPY = e.clientY;
      return;
    }
    if (dragging){
      dragging.x = wx - dragOffX;
      dragging.y = wy - dragOffY;
      return;
    }
  });

  window.addEventListener('pointerup', ()=>{
    panning = false;
    dragging = null;
  });

  // Wheel zoom (desktop)
  cvs.addEventListener('wheel', e=>{
    e.preventDefault();
    const [wx,wy] = screenToWorld(e.clientX, e.clientY);
    const s0 = scale;
    scale = Math.max(0.3, Math.min(2.5, scale * (e.deltaY<0 ? 1.1 : 0.9)));
    // zoom to cursor
    camX = wx - (e.clientX/scale);
    camY = wy - (e.clientY/scale);
  }, { passive:false });

  // ---- Physics ----
  function aabbOverlap(a,b){
    return !(a.x+a.w<=b.x || a.x>=b.x+b.w || a.y+a.h<=b.y || a.y>=b.y+b.h);
  }
  function resolveAABB(a,b){
    const dx1 = (b.x+b.w) - a.x;
    const dx2 = (a.x+a.w) - b.x;
    const dy1 = (b.y+b.h) - a.y;
    const dy2 = (a.y+a.h) - b.y;
    const minX = dx1<dx2 ? dx1 : -dx2;
    const minY = dy1<dy2 ? dy1 : -dy2;
    if (Math.abs(minX) < Math.abs(minY)){
      if (!a.static && !b.static){ a.x +=  minX/2; b.x -= minX/2; a.vx *= 0.8; b.vx *= 0.8; }
      else if (!a.static){ a.x += minX; a.vx *= -0.2; }
      else if (!b.static){ b.x -= minX; b.vx *= -0.2; }
    } else {
      if (!a.static && !b.static){ a.y +=  minY/2; b.y -= minY/2; a.vy *= 0.4; b.vy *= 0.4; }
      else if (!a.static){ a.y += minY; a.vy *= (minY<0? -0.05:0); a.vx *= 0.9; }
      else if (!b.static){ b.y -= minY; b.vy *= (minY>0? -0.05:0); b.vx *= 0.9; }
    }
  }

  function step(dt){
    for (const b of bodies){
      if (b.static) continue;
      b.vy += gravity.y * dt;
      b.x  += b.vx * dt;
      b.y  += b.vy * dt;

      // bounds ground
      if (b.y + b.h > bounds.bottom){ b.y = bounds.bottom - b.h; b.vy *= -0.12; b.vx *= 0.98; }
      if (b.x < bounds.left){ b.x = bounds.left; b.vx *= -0.2; }
      if (b.x + b.w > bounds.right){ b.x = bounds.right - b.w; b.vx *= -0.2; }
      if (b.y < bounds.top){ b.y = bounds.top; b.vy *= 0; }

      // pairwise
      for (const c of bodies){
        if (c===b || c.removed) continue;
        if (!aabbOverlap(b,c)) continue;
        resolveAABB(b,c);
      }
    }
  }

  // ---- Render ----
  function draw(){
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0,0,W,H);

    ctx.save();
    ctx.translate(-camX*scale, -camY*scale);
    ctx.scale(scale, scale);

    for (const b of bodies){
      ctx.lineWidth = 2;
      if (b.static){ ctx.fillStyle='#1f2937'; ctx.strokeStyle='#475569'; }
      else if (b.mat===MAT.WOOD){ ctx.fillStyle=MAT.WOOD.color; ctx.strokeStyle=MAT.WOOD.stroke; }
      else { ctx.fillStyle=MAT.METAL.color; ctx.strokeStyle=MAT.METAL.stroke; }
      ctx.fillRect(b.x,b.y,b.w,b.h);
      ctx.strokeRect(b.x,b.y,b.w,b.h);
    }

    ctx.restore();
  }

  // ---- Main loop ----
  let last = 0;
  function frame(t){
    requestAnimationFrame(frame);
    const dt = Math.min(0.03, (t-last)/1000 || 0.016);
    last = t;
    if (!state.paused) step(dt);
    draw();
  }
  requestAnimationFrame(frame);

  // simple console breadcrumb
  console.log('[Sandbox] ready');
});
