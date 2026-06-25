import React, { useEffect, useRef, useState } from 'react';

// --- Block Types ---
const B = {
  AIR: 0, GRASS: 1, DIRT: 2, STONE: 3, WOOD: 4, LEAVES: 5,
  COAL: 6, IRON: 7, GOLD: 8, DIAMOND: 9, BEDROCK: 10, SAND: 11, WATER: 12,
} as const;

const BLOCK_COLOR: Record<number, string> = {
  [B.GRASS]: '#56ab2f', [B.DIRT]: '#8B4513', [B.STONE]: '#7f7f7f',
  [B.WOOD]: '#8B6914', [B.LEAVES]: '#228B22', [B.COAL]: '#555',
  [B.IRON]: '#d4a57a', [B.GOLD]: '#ffd700', [B.DIAMOND]: '#00e5ff',
  [B.BEDROCK]: '#2a2a2a', [B.SAND]: '#e8d44d', [B.WATER]: '#2196F3',
};

const BLOCK_NAME: Record<number, string> = {
  [B.GRASS]: 'Grass', [B.DIRT]: 'Dirt', [B.STONE]: 'Stone', [B.WOOD]: 'Wood',
  [B.LEAVES]: 'Leaves', [B.COAL]: 'Coal', [B.IRON]: 'Iron', [B.GOLD]: 'Gold',
  [B.DIAMOND]: 'Diamond!', [B.BEDROCK]: 'Bedrock', [B.SAND]: 'Sand', [B.WATER]: 'Water',
};

const BREAK_TIME: Record<number, number> = {
  [B.GRASS]: 600, [B.DIRT]: 500, [B.STONE]: 1800, [B.WOOD]: 1200,
  [B.LEAVES]: 300, [B.COAL]: 2000, [B.IRON]: 2500, [B.GOLD]: 3000,
  [B.DIAMOND]: 4000, [B.BEDROCK]: Infinity, [B.SAND]: 500, [B.WATER]: Infinity,
};

const BLOCK_SCORE: Record<number, number> = {
  [B.GRASS]: 2, [B.DIRT]: 1, [B.STONE]: 5, [B.WOOD]: 8,
  [B.LEAVES]: 1, [B.COAL]: 15, [B.IRON]: 25, [B.GOLD]: 50, [B.DIAMOND]: 200,
};

// --- Constants ---
const BS = 32; // block size px
const WW = 200; // world width blocks
const WH = 64;  // world height blocks
const CW = 800; // canvas width
const CH = 500; // canvas height
const PW = 18;  // player width
const PH = 32;  // player height
const GRAVITY = 0.45;
const JUMP_V = -10;
const WALK_SPEED = 4;

// --- Noise ---
function hash(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}
function smoothH(x: number): number {
  return hash(x, 1) * 0.5 + hash(x * 2, 2) * 0.3 + hash(x * 4, 3) * 0.2;
}

// --- World Generation ---
function generateWorld(): Uint8Array {
  const world = new Uint8Array(WW * WH);
  const getIdx = (x: number, y: number) => y * WW + x;
  const set = (x: number, y: number, b: number) => { world[getIdx(x, y)] = b; };

  const heights: number[] = [];
  for (let x = 0; x < WW; x++) {
    heights[x] = Math.floor(smoothH(x * 0.04) * 12 + 30);
  }

  for (let y = 0; y < WH; y++) {
    for (let x = 0; x < WW; x++) {
      const sy = heights[x];
      if (y >= WH - 2) {
        set(x, y, B.BEDROCK);
      } else if (y === sy) {
        set(x, y, B.GRASS);
      } else if (y > sy && y < sy + 4) {
        set(x, y, B.DIRT);
      } else if (y >= sy + 4) {
        const r = hash(x, y);
        if (r < 0.025 && y > 48) set(x, y, B.DIAMOND);
        else if (r < 0.05 && y > 42) set(x, y, B.GOLD);
        else if (r < 0.1 && y > 36) set(x, y, B.IRON);
        else if (r < 0.16) set(x, y, B.COAL);
        else set(x, y, B.STONE);
      }
    }
  }

  // Trees
  for (let tx = 6; tx < WW - 6; tx += Math.floor(hash(tx, 99) * 7 + 5)) {
    const sy = heights[tx];
    const th = Math.floor(hash(tx, 77) * 3 + 4);
    for (let ty = sy - th; ty < sy; ty++) if (ty >= 0) set(tx, ty, B.WOOD);
    const lt = sy - th;
    for (let ly = lt - 2; ly <= lt + 1; ly++) {
      for (let lx = tx - 2; lx <= tx + 2; lx++) {
        if (ly >= 0 && lx >= 0 && lx < WW && world[getIdx(lx, ly)] === B.AIR)
          set(lx, ly, B.LEAVES);
      }
    }
  }

  return world;
}

// --- Draw Daniel character ---
function drawDaniel(ctx: CanvasRenderingContext2D, x: number, y: number, right: boolean, frame: number) {
  ctx.save();
  if (!right) { ctx.translate(x + PW, y); ctx.scale(-1, 1); x = 0; y = 0; }

  const swing = Math.sin(frame * 0.25) * 5;

  // legs
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(x + 3, y + 22, 5, 10 + swing * 0.5 | 0);
  ctx.fillRect(x + 10, y + 22, 5, 10 - swing * 0.5 | 0);
  // shoes
  ctx.fillStyle = '#fff';
  ctx.fillRect(x + 2, y + 30, 7, 3);
  ctx.fillRect(x + 9, y + 30, 7, 3);
  // body
  ctx.fillStyle = '#e53935';
  ctx.fillRect(x + 2, y + 13, 14, 10);
  // arms
  ctx.fillStyle = '#ffcc80';
  ctx.fillRect(x - 1, y + 13 + swing | 0, 3, 9);
  ctx.fillRect(x + 16, y + 13 - swing | 0, 3, 9);
  // head
  ctx.fillStyle = '#ffcc80';
  ctx.fillRect(x + 2, y + 1, 14, 13);
  // hair
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(x + 2, y + 1, 14, 4);
  ctx.fillRect(x + 2, y + 1, 3, 8);
  // eyes
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x + 6, y + 7, 2, 3);
  ctx.fillRect(x + 11, y + 7, 2, 3);
  // smile
  ctx.fillStyle = '#c62828';
  ctx.fillRect(x + 7, y + 11, 5, 2);

  ctx.restore();
}

interface Inv { block: number; count: number; }

interface State {
  world: Uint8Array;
  px: number; py: number;
  vx: number; vy: number;
  grounded: boolean;
  hp: number;
  inv: Inv[];
  slot: number;
  score: number;
  camX: number; camY: number;
  mineX: number; mineY: number; mineStart: number;
  faceRight: boolean;
  walkFrame: number;
  moving: boolean;
}

export default function MinecraftGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State | null>(null);
  const keys = useRef(new Set<string>());
  const mouse = useRef({ x: 0, y: 0, left: false, right: false, rightClick: false });
  const rafRef = useRef(0);
  const lastT = useRef(0);
  const [score, setScore] = useState(0);
  const [hp, setHp] = useState(10);

  useEffect(() => {
    const world = generateWorld();
    // Find spawn
    let spawnX = 100, spawnY = 0;
    for (let y = 0; y < WH; y++) {
      if (world[y * WW + 100] !== B.AIR) { spawnY = (y - 2) * BS; break; }
    }

    stateRef.current = {
      world, px: spawnX * BS, py: spawnY, vx: 0, vy: 0, grounded: false,
      hp: 10,
      inv: [
        { block: B.DIRT, count: 30 }, { block: B.STONE, count: 20 },
        { block: B.WOOD, count: 10 }, { block: B.SAND, count: 10 },
        { block: B.AIR, count: 0 }, { block: B.AIR, count: 0 },
        { block: B.AIR, count: 0 }, { block: B.AIR, count: 0 }, { block: B.AIR, count: 0 },
      ],
      slot: 0, score: 0, camX: 0, camY: 0,
      mineX: -1, mineY: -1, mineStart: 0,
      faceRight: true, walkFrame: 0, moving: false,
    };

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const getBlock = (bx: number, by: number): number => {
      if (bx < 0 || bx >= WW || by < 0 || by >= WH) return B.BEDROCK;
      return stateRef.current!.world[by * WW + bx];
    };
    const setBlock = (bx: number, by: number, v: number) => {
      if (bx < 0 || bx >= WW || by < 0 || by >= WH) return;
      stateRef.current!.world[by * WW + bx] = v;
    };
    const isSolid = (b: number) => b !== B.AIR && b !== B.WATER;

    function update() {
      const s = stateRef.current!;
      const k = keys.current;
      const m = mouse.current;

      // Input
      s.moving = false;
      s.vx = 0;
      if (k.has('ArrowLeft') || k.has('KeyA')) { s.vx = -WALK_SPEED; s.faceRight = false; s.moving = true; }
      if (k.has('ArrowRight') || k.has('KeyD')) { s.vx = WALK_SPEED; s.faceRight = true; s.moving = true; }
      if (s.moving) s.walkFrame++;

      if ((k.has('ArrowUp') || k.has('KeyW') || k.has('Space')) && s.grounded) {
        s.vy = JUMP_V; s.grounded = false;
      }

      // Gravity
      s.vy = Math.min(s.vy + GRAVITY, 18);

      // Horizontal collision
      s.px += s.vx;
      const bx1 = Math.floor(s.px / BS);
      const bx2 = Math.floor((s.px + PW - 1) / BS);
      const by1 = Math.floor(s.py / BS);
      const by2 = Math.floor((s.py + PH - 1) / BS);
      for (let by = by1; by <= by2; by++) {
        if (isSolid(getBlock(bx1, by)) && s.vx < 0) s.px = (bx1 + 1) * BS;
        if (isSolid(getBlock(bx2, by)) && s.vx > 0) s.px = bx2 * BS - PW;
      }

      // Vertical collision
      s.py += s.vy;
      s.grounded = false;
      const nbx1 = Math.floor(s.px / BS);
      const nbx2 = Math.floor((s.px + PW - 1) / BS);
      const nby1 = Math.floor(s.py / BS);
      const nby2 = Math.floor((s.py + PH - 1) / BS);
      for (let bx = nbx1; bx <= nbx2; bx++) {
        if (isSolid(getBlock(bx, nby2)) && s.vy >= 0) {
          s.py = nby2 * BS - PH; s.vy = 0; s.grounded = true;
        }
        if (isSolid(getBlock(bx, nby1)) && s.vy < 0) {
          s.py = (nby1 + 1) * BS; s.vy = 0;
        }
      }

      // Bounds
      s.px = Math.max(0, Math.min(s.px, (WW - 1) * BS));
      if (s.py > WH * BS) { s.py = 0; s.hp = Math.max(0, s.hp - 2); }

      // Camera
      s.camX = Math.max(0, Math.min(s.px - CW / 2 + PW / 2, WW * BS - CW));
      s.camY = Math.max(0, Math.min(s.py - CH / 2 + PH / 2, WH * BS - CH));

      // Mining
      if (m.left) {
        const wx = m.x + s.camX;
        const wy = m.y + s.camY;
        const mbx = Math.floor(wx / BS);
        const mby = Math.floor(wy / BS);
        const b = getBlock(mbx, mby);
        const dist = Math.hypot(wx - (s.px + PW / 2), wy - (s.py + PH / 2));
        if (dist < BS * 6 && b !== B.AIR && BREAK_TIME[b] !== Infinity) {
          if (s.mineX !== mbx || s.mineY !== mby) {
            s.mineX = mbx; s.mineY = mby; s.mineStart = Date.now();
          }
          const prog = (Date.now() - s.mineStart) / BREAK_TIME[b];
          if (prog >= 1) {
            setBlock(mbx, mby, B.AIR);
            const ii = s.inv.findIndex(i => i.block === b);
            if (ii >= 0) s.inv[ii].count++;
            else {
              const empty = s.inv.findIndex(i => i.count === 0);
              if (empty >= 0) s.inv[empty] = { block: b, count: 1 };
            }
            s.score += BLOCK_SCORE[b] || 1;
            s.mineX = -1; s.mineY = -1;
          }
        } else {
          s.mineX = -1; s.mineY = -1;
        }
      } else {
        s.mineX = -1; s.mineY = -1;
      }

      // Place
      if (m.rightClick) {
        m.rightClick = false;
        const wx = m.x + s.camX;
        const wy = m.y + s.camY;
        const mbx = Math.floor(wx / BS);
        const mby = Math.floor(wy / BS);
        if (getBlock(mbx, mby) === B.AIR) {
          const item = s.inv[s.slot];
          if (item && item.count > 0 && item.block !== B.AIR) {
            setBlock(mbx, mby, item.block);
            item.count--;
            if (item.count === 0) item.block = B.AIR;
          }
        }
      }
    }

    function drawBlock(ctx: CanvasRenderingContext2D, b: number, sx: number, sy: number) {
      const c = BLOCK_COLOR[b];
      if (!c) return;

      if (b === B.WATER) {
        ctx.fillStyle = 'rgba(33,150,243,0.65)';
        ctx.fillRect(sx, sy, BS, BS);
        return;
      }

      ctx.fillStyle = c;
      ctx.fillRect(sx, sy, BS, BS);

      // Details
      if (b === B.GRASS) {
        ctx.fillStyle = '#76c442';
        ctx.fillRect(sx, sy, BS, 6);
      }
      if (b === B.STONE) {
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 1;
        ctx.strokeRect(sx + 2, sy + 2, BS - 4, BS - 4);
      }
      if (b === B.WOOD) {
        ctx.fillStyle = '#6d4c1e';
        ctx.fillRect(sx + 4, sy, 4, BS);
        ctx.fillRect(sx + BS - 8, sy, 4, BS);
      }
      if (b === B.COAL || b === B.IRON || b === B.GOLD || b === B.DIAMOND) {
        ctx.fillStyle = '#7f7f7f';
        ctx.fillRect(sx, sy, BS, BS);
        const oc: Record<number, string> = {
          [B.COAL]: '#1a1a1a', [B.IRON]: '#d4a57a', [B.GOLD]: '#ffd700', [B.DIAMOND]: '#00e5ff',
        };
        ctx.fillStyle = oc[b];
        ctx.fillRect(sx + 8, sy + 8, 8, 8);
        ctx.fillRect(sx + 18, sy + 18, 7, 7);
      }
      if (b === B.LEAVES) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let i = 0; i < 4; i++) ctx.fillRect(sx + i * 8, sy + i * 8, 4, 4);
      }

      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, BS, BS);
    }

    function draw() {
      const s = stateRef.current!;
      const m = mouse.current;

      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, CH);
      sky.addColorStop(0, '#87CEEB');
      sky.addColorStop(1, '#d4f0ff');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CW, CH);

      // Clouds
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const cx1 = (200 - (s.camX * 0.1) % 400);
      ctx.fillRect(cx1, 30, 80, 18);
      ctx.fillRect(cx1 + 10, 20, 60, 18);
      const cx2 = (550 - (s.camX * 0.12) % 800);
      ctx.fillRect(cx2, 60, 100, 22);
      ctx.fillRect(cx2 + 15, 45, 70, 22);

      const x0 = Math.max(0, Math.floor(s.camX / BS));
      const x1 = Math.min(WW, Math.ceil((s.camX + CW) / BS) + 1);
      const y0 = Math.max(0, Math.floor(s.camY / BS));
      const y1 = Math.min(WH, Math.ceil((s.camY + CH) / BS) + 1);

      for (let by = y0; by < y1; by++) {
        for (let bx = x0; bx < x1; bx++) {
          const b = s.world[by * WW + bx];
          if (b === B.AIR) continue;
          const sx = bx * BS - s.camX;
          const sy = by * BS - s.camY;
          drawBlock(ctx, b, sx, sy);
        }
      }

      // Mine overlay
      if (s.mineX >= 0) {
        const prog = Math.min(1, (Date.now() - s.mineStart) / BREAK_TIME[s.world[s.mineY * WW + s.mineX]]);
        const sx = s.mineX * BS - s.camX;
        const sy = s.mineY * BS - s.camY;
        ctx.fillStyle = `rgba(0,0,0,${prog * 0.65})`;
        ctx.fillRect(sx, sy, BS, BS);
        const cracks = Math.floor(prog * 5);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        for (let c = 0; c < cracks; c++) {
          ctx.beginPath();
          ctx.moveTo(sx + 6 + c * 5, sy + 4);
          ctx.lineTo(sx + BS - 4, sy + BS - 6 - c * 3);
          ctx.stroke();
        }
        ctx.fillStyle = '#f44336';
        ctx.fillRect(sx, sy + BS - 4, BS * prog, 4);
      }

      // Hover highlight
      const hbx = Math.floor((m.x + s.camX) / BS);
      const hby = Math.floor((m.y + s.camY) / BS);
      const hb = s.world[hby * WW + hbx];
      if (hb && hb !== B.AIR) {
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 2;
        ctx.strokeRect(hbx * BS - s.camX, hby * BS - s.camY, BS, BS);
      }

      // Daniel
      drawDaniel(ctx, s.px - s.camX, s.py - s.camY, s.faceRight, s.walkFrame);

      // HUD - HP
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(10, 10, 204, 22);
      ctx.fillStyle = s.hp > 4 ? '#4caf50' : '#f44336';
      ctx.fillRect(12, 12, (s.hp / 10) * 200, 18);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`❤️ ${s.hp}/10`, 16, 26);

      // Score
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(CW - 155, 10, 145, 24);
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(`⭐ Score: ${s.score}`, CW - 150, 27);

      // Block name tooltip
      if (hb && hb !== B.AIR && BLOCK_NAME[hb]) {
        const nm = BLOCK_NAME[hb];
        ctx.font = 'bold 13px sans-serif';
        const tw = ctx.measureText(nm).width;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(m.x - tw / 2 - 6, m.y - 28, tw + 12, 22);
        ctx.fillStyle = BLOCK_COLOR[hb] || 'white';
        ctx.fillText(nm, m.x - tw / 2, m.y - 12);
      }

      // Hotbar
      const hbY = CH - 52;
      const hbStartX = CW / 2 - 9 * 22;
      for (let i = 0; i < 9; i++) {
        const item = s.inv[i];
        const sx = hbStartX + i * 44;
        ctx.fillStyle = i === s.slot ? 'rgba(255,220,0,0.3)' : 'rgba(0,0,0,0.5)';
        ctx.fillRect(sx, hbY, 40, 40);
        ctx.strokeStyle = i === s.slot ? '#ffd700' : 'rgba(255,255,255,0.25)';
        ctx.lineWidth = i === s.slot ? 2.5 : 1;
        ctx.strokeRect(sx, hbY, 40, 40);
        if (item && item.count > 0 && item.block !== B.AIR) {
          ctx.fillStyle = BLOCK_COLOR[item.block] || '#888';
          ctx.fillRect(sx + 5, hbY + 5, 30, 30);
          ctx.fillStyle = 'white';
          ctx.font = 'bold 11px monospace';
          ctx.fillText(`${item.count}`, sx + 24, hbY + 36);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '10px monospace';
        ctx.fillText(`${i + 1}`, sx + 3, hbY + 13);
      }

      // Controls
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(8, CH - 52, 195, 48);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '11px sans-serif';
      ctx.fillText('WASD / ←→ Move,  Space: Jump', 13, CH - 33);
      ctx.fillText('Left Click: Mine  Right Click: Place', 13, CH - 15);
    }

    function loop(t: number) {
      lastT.current = t;
      update();
      draw();
      setScore(stateRef.current!.score);
      setHp(stateRef.current!.hp);
      rafRef.current = requestAnimationFrame(loop);
    }

    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (down) keys.current.add(e.code); else keys.current.delete(e.code);
      if (down && e.code.startsWith('Digit')) {
        const s = parseInt(e.code.slice(5)) - 1;
        if (s >= 0 && s <= 8) stateRef.current!.slot = s;
      }
    };
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.current.x = e.clientX - r.left;
      mouse.current.y = e.clientY - r.top;
    };
    const onDown = (e: MouseEvent) => {
      if (e.button === 0) mouse.current.left = true;
      if (e.button === 2) { mouse.current.right = true; mouse.current.rightClick = true; }
    };
    const onUp = (e: MouseEvent) => {
      if (e.button === 0) mouse.current.left = false;
      if (e.button === 2) mouse.current.right = false;
    };
    const onWheel = (e: WheelEvent) => {
      const s = stateRef.current!;
      if (e.deltaY > 0) s.slot = (s.slot + 1) % 9;
      else s.slot = (s.slot + 8) % 9;
    };
    const noCtx = (e: Event) => e.preventDefault();

    window.addEventListener('keydown', (e) => onKey(e, true));
    window.addEventListener('keyup', (e) => onKey(e, false));
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('wheel', onWheel);
    canvas.addEventListener('contextmenu', noCtx);

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', (e) => onKey(e, true));
      window.removeEventListener('keyup', (e) => onKey(e, false));
    };
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: CW, marginBottom: 8, alignItems: 'center' }}>
        <button onClick={onBack} style={{ background: '#333', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>← Menu</button>
        <span style={{ color: '#4caf50', fontWeight: 900, fontSize: 20 }}>⛏️ Daniel's Minecraft Adventure</span>
        <span style={{ color: '#ffd700', fontWeight: 700 }}>Score: {score}</span>
      </div>
      <canvas ref={canvasRef} width={CW} height={CH} style={{ border: '2px solid #333', cursor: 'crosshair', display: 'block' }} />
    </div>
  );
}
