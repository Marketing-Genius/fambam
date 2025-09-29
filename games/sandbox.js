// Stop iOS Safari’s native pinch/gesture from zooming the PAGE.
['gesturestart','gesturechange','gestureend'].forEach(evt =>
  window.addEventListener(evt, e => e.preventDefault(), { passive:false })
);

document.addEventListener('DOMContentLoaded', () => {
  const cvs = document.getElementById('world');
  const ctx = cvs.getContext('2d', { alpha:false });

  // Block browser two-finger zoom, we’ll handle pinch ourselves
  cvs.addEventListener('touchmove', e => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  }, { passive:false });

  // -------- Canvas / Viewport --------
  let W = innerWidth, H = innerHeight, DPR = devicePixelRatio || 1;
  let scale = 1, camX = 0, camY = 0;

  function resize(){
    W = innerWidth; H = innerHeight; DPR = devicePixelRatio || 1;
    cvs.width  = Math.round(W*DPR);
    cvs.height = Math.round(H*DPR);
    cvs.style.width = W+'px';
    cvs.style.height = H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
    rebuildGrid(); // keep grid sized with the view
  }
  addEventListener('resize', resize); resize();

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
                || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // -------- World (AABB boxes) --------
  const gravity = { y: 800 };
  const bounds  = { left:-2000, right:2000, top:-2000, bottom:1200 };

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
      mat, hp: opts.hp ?? mat.hp
    });
  }

  function seed(){
    bodies.length = 0;
    // Ground platform that fluids & boxes collide with
    addBox(-800, 900, 1600, 60, MAT.METAL, { static:true });
    // A couple blocks to play with
    addBox(-60, 200, 120, 60, MAT.WOOD);
    addBox( 90, 100, 120, 60, MAT.METAL);
    clearFluids();
  }
  seed();

  // -------- Fluids (falling-sand grid) --------
  const CELL = 4;           // px per cell (perf knob)
  let gw = 0, gh = 0;
  let grid, heat;           // Uint8Arrays

  const G_EMPTY = 0, G_WATER = 1, G_FIRE = 2, G_ACID = 3, G_OIL = 4;

  function rebuildGrid(){
    gw = Math.ceil((W/scale)/CELL) + 128;
    gh = Math.ceil((H/scale)/CELL) + 128;
    grid = new Uint8Array(gw*gh);
    heat = new Uint8Array(gw*gh);
  }
  function clearFluids(){ if (grid) grid.fill(0); if (heat) heat.fill(0); }

  const gi = (x,y)=> y*gw + x;
  const inG = (x,y)=> (x>=0 && y>=0 && x<gw && y<gh);

  function cellBlocked(gx,gy){
    // Collide with static bodies (e.g., ground)
    const wx = gx*CELL + CELL*0.5;
    const wy = gy*CELL + CELL*0.5;
    for (const b of bodies){
      if (!b.static) continue;
      if (wx>=b.x && wx<=b.x+b.w && wy>=b.y && wy<=b.y+b.h) return true;
    }
    return false;
  }

  function setCellWorld(wx,wy,type){
    const gx = Math.floor(wx/CELL), gy = Math.floor(wy/CELL);
    if (!inG(gx,gy)) return;
    grid[gi(gx,gy)] = type;
    if (type===G_FIRE) heat[gi(gx,gy)] = 255;
  }
  function brush(wx,wy,type,r){
    for(let yy=-r; yy<=r; yy++){
      for(let xx=-r; xx<=r; xx++){
        if (xx*xx+yy*yy <= r*r) setCellWorld(wx + xx*CELL, wy + yy*CELL, type);
      }
    }
  }
  function nbrHas(x,y,type){
    return (inG(x-1,y) && grid[gi(x-1,y)]===type)
        || (inG(x+1,y) && grid[gi(x+1,y)]===type)
        || (inG(x,y-1) && grid[gi(x,y-1)]===type)
        || (inG(x,y+1) && grid[gi(x,y+1)]===type);
  }
  function swap(i,j){ const t=grid[i]; grid[i]=grid[j]; grid[j]=t; }

  function stepGrid(){
    if (!grid) return;

    // fall / flow (bottom-up sweep)
    const dir = (tick & 1) ? 1 : -1;
    for (let y=gh-2; y>=1; y--){
      const xStart = dir>0 ? 1 : gw-2, xEnd = dir>0 ? gw-1 : 0;
      for (let x=xStart; x!==xEnd; x+=dir){
        const idx = gi(x,y), t = grid[idx];
        if (t===G_EMPTY || t===G_FIRE) continue;

        // down
        const dn = gi(x,y+1);
        if (grid[dn]===G_EMPTY && !cellBlocked(x,y+1)){ swap(idx, dn); continue; }

        // diagonals
        const dl = gi(x-1,y+1), dr = gi(x+1,y+1);
        const canDL = inG(x-1,y+1) && grid[dl]===G_EMPTY && !cellBlocked(x-1,y+1);
        const canDR = inG(x+1,y+1) && grid[dr]===G_EMPTY && !cellBlocked(x+1,y+1);
        if (canDL && canDR){ swap(idx, (Math.random()<0.5?dl:dr)); continue; }
        if (canDL){ swap(idx, dl); continue; }
        if (canDR){ swap(idx, dr); continue; }

        // sideways seep for liquids
        if (t===G_WATER || t===G_OIL || t===G_ACID){
          const side = (Math.random()<0.5 ? -1 : 1);
          const si = gi(x+side,y);
          if (inG(x+side,y) && grid[si]===G_EMPTY && !cellBlocked(x+side,y)) swap(idx, si);
        }
      }
    }

    // fire heat + extinguish
    for (let y=1; y<gh-1; y++){
      for (let x=1; x<gw-1; x++){
        const i = gi(x,y);
        if (grid[i]===G_FIRE){
          if (nbrHas(x,y,G_WATER)){ grid[i]=G_EMPTY; continue; }
          // warm up neighbors for fun glow
          heat[i] = 255;
          [i-1,i+1,i-gw,i+gw].forEach(j => { if (j>=0 && j<heat.length) heat[j] = Math.min(255, heat[j]+6); });
          if (Math.random()<0.01) grid[i]=G_EMPTY;
        } else {
          heat[i] = Math.max(0, heat[i]-1);
        }
      }
    }
  }

  // -------- UI + Tools --------
  const ui = document.getElementById('ui');
  const toolBtns = Array.from(ui.querySelectorAll('.btn[data-tool]'));
  const btnDelete = document.getElementById('btnDelete');
  const btnPause  = document.getElementById('btnPause');
  const btnReset  = document.getElementById('btnReset');
  const btnFS     = document.getElementById('btnFullscreen');
  const grav      = document.getElementById('grav');

  const state = { tool:'hand', deleting:false, paused:false };

  toolBtns.forEach(b=>{
    b.addEventListener('click', ()=>{
      toolBtns.forEach(x=>x.dataset.on='0');
      b.dataset.on='1';
      state.tool = b.dataset.tool;
      state.deleting = false;
      btnDelete.dataset.on = '0';
    });
  });

  btnDelete.addEventListener('click', ()=>{
    state.deleting = !state.deleting;
    btnDelete.dataset.on = state.deleting ? '1' : '0';
  });

  btnPause.addEventListener('click', ()=>{
    state.paused = !state.paused;
    btnPause.textContent = state.paused ? '▶️ Resume' : '⏸️ Pause';
  });

  btnReset.addEventListener('click', ()=>{ seed(); });

  if (grav) grav.addEventListener('input', e=> { gravity.y = Number(e.target.value)||800; });

  function goFullscreen(){
    // On iOS/iPadOS, avoid the Fullscreen API to prevent the system “typing in fullscreen” modal
    if (isIOS){
      document.body.classList.toggle('fs-sim');
      return;
    }
    const root = document.documentElement;
    if (!document.fullscreenElement && root.requestFullscreen){
      root.requestFullscreen({ navigationUI:'hide' }).catch(()=>{});
    } else if (document.fullscreenElement && document.exitFullscreen){
      document.exitFullscreen();
    }
  }
  btnFS.addEventListener('click', goFullscreen);

  document.addEventListener('fullscreenchange', ()=>{
    document.body.classList.toggle('fs-true', !!document.fullscreenElement);
  });

  // -------- Pointer / Touch (drag, paint, pan, pinch) --------
  const worldToScreen = (wx,wy)=>[(wx-camX)*scale,(wy-camY)*scale];
  const screenToWorld = (sx,sy)=>[sx/scale+camX, sy/scale+camY];

  let dragging=null, offX=0, offY=0;
  let panning=false, lastPX=0, lastPY=0;

  function pickBody(wx,wy){
    for (let i=bodies.length-1;i>=0;i--){
      const b = bodies[i];
      if (wx>=b.x && wx<=b.x+b.w && wy>=b.y && wy<=b.y+b.h) return b;
    }
    return null;
  }

  cvs.addEventListener('pointerdown', e=>{
    cvs.setPointerCapture(e.pointerId);
    const [wx,wy] = screenToWorld(e.clientX,e.clientY);

    // middle mouse or secondary touch → pan
    if (e.button===1 || (e.pointerType==='touch' && !e.isPrimary)){
      panning = true; lastPX=e.clientX; lastPY=e.clientY; return;
    }

    if (state.deleting){
      const b = pickBody(wx,wy);
      if (b && !b.static) bodies.splice(bodies.indexOf(b),1);
      brush(wx,wy,G_EMPTY,6);
      return;
    }

    switch(state.tool){
      case 'hand':{
        const b = pickBody(wx,wy);
        if (b && !b.static){ dragging=b; offX=wx-b.x; offY=wy-b.y; b.vx=b.vy=0; }
        break;
      }
      case 'wood':  addBox(wx-30,wy-20,60,40,MAT.WOOD); break;
      case 'metal': addBox(wx-30,wy-20,60,40,MAT.METAL); break;
      case 'robot': addBox(wx-40,wy-40,80,80,MAT.WOOD,{hp:130}); break;
      case 'water': brush(wx,wy,G_WATER,8); break;
      case 'fire':  brush(wx,wy,G_FIRE,6);  break;
      case 'acid':  brush(wx,wy,G_ACID,6);  break;
    }
  });

  cvs.addEventListener('pointermove', e=>{
    const [wx,wy] = screenToWorld(e.clientX,e.clientY);
    if (panning){
      camX -= (e.clientX-lastPX)/scale;
      camY -= (e.clientY-lastPY)/scale;
      lastPX=e.clientX; lastPY=e.clientY;
      return;
    }
    if (dragging){
      dragging.x = wx - offX;
      dragging.y = wy - offY;
      return;
    }
    if (e.buttons & 1){
      if (state.tool==='water') brush(wx,wy,G_WATER,8);
      if (state.tool==='fire')  brush(wx,wy,G_FIRE,6);
      if (state.tool==='acid')  brush(wx,wy,G_ACID,6);
    }
  });

  addEventListener('pointerup', ()=>{ panning=false; dragging=null; });

  // Desktop wheel zoom
  cvs.addEventListener('wheel', e=>{
    e.preventDefault();
    const [wx,wy] = screenToWorld(e.clientX,e.clientY);
    const s0 = scale;
    scale = Math.max(0.3, Math.min(3, scale * (e.deltaY<0 ? 1.12 : 0.9)));
    camX = wx - (e.clientX/scale);
    camY = wy - (e.clientY/scale);
  }, { passive:false });

  // Touch pinch zoom (our own, so the page never zooms)
  let pinchPrevDist = 0, pinchMidX = 0, pinchMidY = 0;
  cvs.addEventListener('touchstart', e=>{
    if (e.touches.length===2){
      pinchPrevDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchMidX = (e.touches[0].clientX + e.touches[1].clientX)/2;
      pinchMidY = (e.touches[0].clientY + e.touches[1].clientY)/2;
    }
  }, { passive:false });

  cvs.addEventListener('touchmove', e=>{
    if (e.touches.length===2){
      e.preventDefault();
      const d = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const [wx,wy] = screenToWorld(pinchMidX, pinchMidY);
      const factor = d / (pinchPrevDist || d);
      pinchPrevDist = d;
      scale = Math.max(0.3, Math.min(3, scale * factor));
      camX = wx - (pinchMidX/scale);
      camY = wy - (pinchMidY/scale);
    }
  }, { passive:false });

  // -------- Physics --------
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
      if (!a.static && !b.static){ a.x+=minX/2; b.x-=minX/2; a.vx*=0.8; b.vx*=0.8; }
      else if (!a.static){ a.x+=minX; a.vx*=-0.2; } else if (!b.static){ b.x-=minX; b.vx*=-0.2; }
    } else {
      if (!a.static && !b.static){ a.y+=minY/2; b.y-=minY/2; a.vy*=0.4; b.vy*=0.4; }
      else if (!a.static){ a.y+=minY; a.vy*=(minY<0?-0.05:0); a.vx*=0.9; }
      else if (!b.static){ b.y-=minY; b.vy*=(minY>0?-0.05:0); b.vx*=0.9; }
    }
  }

  function stepPhysics(dt){
    for (const b of bodies){
      if (b.static) continue;
      b.vy += gravity.y * dt;
      b.x  += b.vx * dt;
      b.y  += b.vy * dt;

      if (b.y + b.h > bounds.bottom){ b.y = bounds.bottom - b.h; b.vy *= -0.12; b.vx *= 0.98; }
      if (b.x < bounds.left){ b.x = bounds.left; b.vx *= -0.2; }
      if (b.x + b.w > bounds.right){ b.x = bounds.right - b.w; b.vx *= -0.2; }
      if (b.y < bounds.top){ b.y = bounds.top; b.vy *= 0; }

      for (const c of bodies){
        if (c===b || c.removed) continue;
        if (!aabbOverlap(b,c)) continue;
        resolveAABB(b,c);
      }
    }
  }

  // -------- Render --------
  function draw(){
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(0,0,W,H);

    ctx.save();
    ctx.translate(-camX*scale, -camY*scale);
    ctx.scale(scale, scale);

    // Fluids
    if (grid){
      const vis = CELL;
      for (let y=0;y<gh;y++){
        for (let x=0;x<gw;x++){
          const t = grid[gi(x,y)];
          if (!t) continue;
          if (t===G_WATER) ctx.fillStyle='rgba(96,165,250,0.9)';
          else if (t===G_OIL) ctx.fillStyle='rgba(120,89,61,0.9)';
          else if (t===G_ACID) ctx.fillStyle='rgba(34,197,94,0.9)';
          else if (t===G_FIRE) ctx.fillStyle='rgba(252,165,3,0.92)';
          ctx.fillRect(x*CELL, y*CELL, vis, vis);
        }
      }
    }

    // Bodies
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

  // -------- Main loop --------
  let last=0, tick=0;
  function frame(t){
    requestAnimationFrame(frame);
    const dt = Math.min(0.03, (t-last)/1000 || 0.016);
    last = t;
    if (!state.paused){
      stepPhysics(dt);
      stepGrid();
      tick++;
    }
    draw();
  }
  requestAnimationFrame(frame);

  console.log('[Sandbox] ready');
});
