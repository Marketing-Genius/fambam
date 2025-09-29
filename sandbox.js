// Stop pinch-zoom / gestures stealing focus on iOS
['gesturestart','gesturechange','gestureend'].forEach(evt =>
  window.addEventListener(evt, e => e.preventDefault(), { passive:false })
);
document.addEventListener('DOMContentLoaded', ()=>{
  const el = document.getElementById('world');
  el.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive:false });
});

(()=>{
  const cvs = document.getElementById('world');
  const ctx = cvs.getContext('2d');
  let W=innerWidth,H=innerHeight,DPR=devicePixelRatio||1;
  let scale=1,camX=0,camY=0;

  function resize(){
    W=innerWidth; H=innerHeight; DPR=devicePixelRatio||1;
    cvs.width=Math.round(W*DPR); cvs.height=Math.round(H*DPR);
    cvs.style.width=W+'px'; cvs.style.height=H+'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);
  }
  addEventListener('resize',resize); resize();

  // --- World ---
  const gravity={y:800};
  const bounds={left:-2000,right:2000,top:-2000,bottom:1200};
  const bodies=[]; let nextId=1;
  const MAT={WOOD:{hp:100}, METAL:{hp:220}};
  function addBox(x,y,w,h,mat,opts={}){
    bodies.push({id:nextId++,x,y,w,h,vx:0,vy:0,static:!!opts.static,mat, hp:opts.hp??mat.hp});
  }
  addBox(-800,900,1600,60,MAT.METAL,{static:true});

  // --- Interaction state ---
  const state={tool:'hand',paused:false,deleting:false};
  const ui=document.getElementById('ui');
  const toolBtns=[...ui.querySelectorAll('.btn[data-tool]')];
  toolBtns.forEach(b=>{
    b.addEventListener('click',()=>{
      toolBtns.forEach(x=>x.dataset.on='0');
      b.dataset.on='1'; state.tool=b.dataset.tool; state.deleting=false;
    });
  });
  document.getElementById('btnDelete').onclick=()=>{state.deleting=!state.deleting;};
  document.getElementById('btnPause').onclick=()=>state.paused=!state.paused;
  document.getElementById('btnReset').onclick=()=>{bodies.length=0; addBox(-800,900,1600,60,MAT.METAL,{static:true});};
  document.getElementById('grav').oninput=e=>gravity.y=+e.target.value;

  // Fullscreen
  function goFullscreen(){
    const el=document.documentElement;
    if(!document.fullscreenElement && el.requestFullscreen){
      el.requestFullscreen({navigationUI:'hide'}).catch(()=>{});
    } else if(document.fullscreenElement && document.exitFullscreen){
      document.exitFullscreen();
    } else {
      document.body.classList.toggle('fs-sim');
    }
  }
  document.getElementById('btnFullscreen').onclick=goFullscreen;

  // --- Physics ---
  function step(dt){
    for(const b of bodies){
      if(b.static) continue;
      b.vy+=gravity.y*dt;
      b.x+=b.vx*dt; b.y+=b.vy*dt;
      if(b.y+b.h>bounds.bottom){b.y=bounds.bottom-b.h;b.vy*=-0.2;}
    }
  }

  // --- Draw ---
  function draw(){
    ctx.setTransform(DPR,0,0,DPR,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.save();
    ctx.translate(-camX*scale,-camY*scale); ctx.scale(scale,scale);
    for(const b of bodies){
      ctx.fillStyle=(b.mat===MAT.WOOD)?'#9a6e4c':'#5b6775';
      ctx.fillRect(b.x,b.y,b.w,b.h);
    }
    ctx.restore();
  }

  // --- Main loop ---
  let last=0;
  function frame(t){
    requestAnimationFrame(frame);
    const dt=Math.min(0.03,(t-last)/1000||0.016);
    last=t;
    if(!state.paused) step(dt);
    draw();
  }
  requestAnimationFrame(frame);
})();
