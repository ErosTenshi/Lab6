
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const now = () => performance.now();

const keys = new Set();
window.addEventListener('keydown', e => { keys.add(e.code); });
window.addEventListener('keyup',   e => { keys.delete(e.code); });

const world = {
  gravity: 1800,       
  scrollSpeed: 200,    
  tileW: 120,
  groundY: 360,
  paused: false,
  cameraX: 0,
};

const player = {
  x: 80, y: 0, w: 42, h: 54,
  vx: 0, vy: 0,
  speed: 220,
  jumpVel: -600,
  onGround: false,
  color: '#ff4040',
  score: 0,
  lives: 3,
};


const platforms = []; 
const coins = [];     
const snails = [];    

function buildWorld(seedXStart=0, chunks=16) {
  const startX = seedXStart;
  let cursorX = startX;
  for (let i=0; i<chunks; i++) {
    
    const gap = i === 0 ? 0 : 40 + Math.random()*80;
    cursorX += gap;
    const width = 180 + Math.random()*140;
    const y = world.groundY - (Math.random()<0.35 ? 80 : 0);
    platforms.push({x: cursorX, y: y, w: width, h: 18});
    
    const nCoins = 2 + Math.floor(Math.random()*3);
    for (let c=0;c<nCoins;c++){
      coins.push({x: cursorX + 24 + c*32, y: y-22, r: 8, collected:false});
    }
    
    if (Math.random() < 0.45) {
      const sx = cursorX + 40 + Math.random()*(width-80);
      snails.push({x: sx, y: y-18, w: 34, h: 24, vx: 40*(Math.random()<0.5?-1:1)});
    }
    cursorX += width;
  }
}
buildWorld(0, 24);

function drawBackground(camX) {
  
  const g = ctx.createLinearGradient(0,0,0,canvas.height);
  g.addColorStop(0, '#9ed2ff');
  g.addColorStop(1, '#cfe6ff');
  ctx.fillStyle = g;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  for (let i=0;i<6;i++){
    const cx = ((i*300) - (camX*0.2)) % (canvas.width+320) - 160;
    const cy = 60 + 40*Math.sin((i*1.3)+(camX*0.0006));
    drawCloud(cx,cy);
  }


  ctx.fillStyle = '#6db36d';
  const baseY = world.groundY + 30;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let x=0;x<=canvas.width;x+=8){
    const wx = x + camX*0.45;
    const y = baseY - 22*Math.sin(wx*0.01) - 12*Math.sin(wx*0.03);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  
  ctx.fillStyle = '#5a7f3a';
  ctx.fillRect(0, world.groundY, canvas.width, canvas.height-world.groundY);
}

function drawCloud(x,y){
  ctx.beginPath();
  ctx.arc(x,y,22,0,Math.PI*2);
  ctx.arc(x+24,y+6,18,0,Math.PI*2);
  ctx.arc(x-22,y+10,16,0,Math.PI*2);
  ctx.fill();
}


function drawRect(x,y,w,h, color){
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

function drawCoin(c){
  const x = c.x - world.cameraX;
  const y = c.y;
  if (x < -20 || x > canvas.width+20) return;
  ctx.beginPath();
  ctx.arc(x, y, c.r, 0, Math.PI*2);
  ctx.fillStyle = c.collected ? 'rgba(255,215,0,.35)' : '#ffd21f';
  ctx.fill();
  ctx.strokeStyle = '#c49b00';
  ctx.stroke();
}


let runTimer = 0;
function drawPlayer(dt){
  runTimer += dt;
  const leg = Math.sin(runTimer*10);
  const x = player.x - world.cameraX;
  
  drawRect(x, player.y, player.w, player.h, player.color);
  
  ctx.fillStyle = '#702b2b';
  ctx.fillRect(x+6, player.y+player.h-6, 10, 6 + leg*2);
  ctx.fillRect(x+player.w-16, player.y+player.h-6, 10, 6 - leg*2);
  
  ctx.fillStyle = '#fff';
  ctx.fillRect(x+player.w-14, player.y+10, 9, 9);
  ctx.fillStyle = '#222';
  ctx.fillRect(x+player.w-11, player.y+13, 4, 4);
}

function aabb(ax,ay,aw,ah,bx,by,bw,bh){
  return ax < bx+bw && ax+aw > bx && ay < by+bh && ay+ah > by;
}

function resolvePlayerPlatform(pf){
 
  const prevBottom = player._prevY + player.h;
  const currBottom = player.y + player.h;
  if (prevBottom <= pf.y && currBottom >= pf.y && 
      player.x+player.w > pf.x && player.x < pf.x+pf.w) {
    player.y = pf.y - player.h;
    player.vy = 0;
    player.onGround = true;
  }
}

let fps=0, lastFpsT=0, frames=0;
function drawHUD() {
  ctx.fillStyle = '#000';
  ctx.globalAlpha = 0.8;
  ctx.fillRect(8,8,150,54);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.fillText(`Score: ${player.score}`, 14, 26);
  ctx.fillText(`Lives: ${player.lives}`, 14, 40);
  ctx.fillText(`FPS: ${fps.toFixed(0)}`, 14, 54);
}


let last = now();
function loop() {
  const t = now();
  let dt = (t - last) / 1000;
  if (dt > 0.05) dt = 0.05; 
  last = t;

  if (!world.paused) update(dt);
  render(dt);
  requestAnimationFrame(loop);

  
  frames++;
  if (t - lastFpsT > 1000) {
    fps = frames * 1000 / (t - lastFpsT);
    frames = 0;
    lastFpsT = t;
  }
}


function update(dt){
  
  player.vx = 0;
  if (keys.has('ArrowRight')) player.vx += player.speed;
  if (keys.has('ArrowLeft'))  player.vx -= player.speed;

  if ((keys.has('Space') || keys.has('ArrowUp')) && player.onGround) {
    player.vy = player.jumpVel;
    player.onGround = false;
    console.log('[DBG] Jump! vy=', player.vy.toFixed(1));
  }

  if (keys.has('KeyP')) { world.paused = !world.paused; keys.delete('KeyP'); }

  
  player.vy += world.gravity * dt;

  
  player._prevY = player.y;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  
  if (player.y + player.h > world.groundY) {
    player.y = world.groundY - player.h;
    player.vy = 0;
    player.onGround = true;
  }

  
  const startX = world.cameraX - 200, endX = world.cameraX + canvas.width + 200;
  for (const pf of platforms) {
    if (pf.x+pf.w < startX || pf.x > endX) continue;
    resolvePlayerPlatform(pf);
  }

  
  for (const c of coins) {
    if (!c.collected && aabb(player.x,player.y,player.w,player.h, c.x-c.r, c.y-c.r, c.r*2, c.r*2)){
      c.collected = true;
      player.score += 10;
    }
  }

  
  for (const s of snails) {
    s.x += s.vx * dt;
    const pf = platforms.find(pf => s.x > pf.x && s.x < pf.x+pf.w && Math.abs((pf.y - s.y) - 18) < 3);
    if (pf) {
      if (s.x < pf.x+8) { s.x = pf.x+8; s.vx = Math.abs(s.vx); }
      if (s.x > pf.x+pf.w-42) { s.x = pf.x+pf.w-42; s.vx = -Math.abs(s.vx); }
      s.y = pf.y - 18;
    }
    if (aabb(player.x,player.y,player.w,player.h, s.x, s.y, 34, 24)) {
      if (player.vy > 120) { 
        player.vy = player.jumpVel*0.55;
        player.score += 25;
        s.x = -99999;
      } else {
        if (!player._hurtCD || performance.now() - player._hurtCD > 900) {
          player.lives = Math.max(0, player.lives-1);
          player.vx = -Math.sign(s.vx||1) * 260;
          player.vy = -420;
          player._hurtCD = performance.now();
          console.log('[DBG] Ouch! lives=', player.lives);
        }
      }
    }
  }

  world.cameraX += world.scrollSpeed * dt;
  const targetCam = player.x - canvas.width * 0.35;
  world.cameraX = Math.max(world.cameraX, targetCam);

  const farthest = platforms.reduce((m,p)=>Math.max(m,p.x+p.w), 0);
  if (farthest - world.cameraX < canvas.width*1.5) {
    buildWorld(farthest + 80, 12);
  }
}

function render(dt){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawBackground(world.cameraX);

  for (const pf of platforms) {
    const x = pf.x - world.cameraX;
    if (x+pf.w < -5 || x > canvas.width+5) continue;
    ctx.fillStyle = '#3d5c2a';
    ctx.fillRect(x, pf.y, pf.w, pf.h);
    ctx.fillStyle = '#6e9a45';
    ctx.fillRect(x, pf.y, pf.w, 4);
  }

  for (const c of coins) drawCoin(c);

  for (const s of snails) {
    const x = s.x - world.cameraX;
    if (x < -40 || x > canvas.width+40) continue;
    
    ctx.fillStyle = '#7f4c1f';
    ctx.fillRect(x, s.y, 34, 16);
    
    ctx.fillStyle = '#c56a2d';
    ctx.beginPath();
    ctx.arc(x+18, s.y+10, 12, 0, Math.PI*2);
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(x+4, s.y-6, 4, 10);
    ctx.fillStyle = '#222';
    ctx.fillRect(x+5, s.y-4, 2, 2);
  }

  drawPlayer(dt);
  drawHUD();
}

(function boot(){
  const first = platforms.find(p => p.x <= 120);
  if (first) { player.x = 100; player.y = first.y - player.h; player.onGround = true; }
  loop();
})();

console.log('[DBG] Game loaded. Use DevTools → Performance to profile frames.');
