import React, { useEffect, useRef, useState } from 'react';
import { loadDanielSheet, drawGameDaniel, isSheetLoaded } from '../../daniel-sprite';
import { useCanvasScale, isMobile, ControlsLRJump } from '../../components/MobileControls';

const CW = 800;
const CH = 480;
const GRAVITY = 0.5;
const JUMP_V = -12;
const WALK = 4.5;
const PW = 24;
const PH = 36;

interface Platform { x: number; y: number; w: number; h: number; color: string; moving?: boolean; mx?: number; mspeed?: number; mdir?: number; }
interface Enemy { x: number; y: number; w: number; h: number; vx: number; alive: boolean; dir: number; color: string; }
interface Star { x: number; y: number; collected: boolean; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; }

interface Level {
  platforms: Platform[];
  enemies: Enemy[];
  stars: Star[];
  startX: number; startY: number;
  goalX: number; goalY: number;
  bg: string[];
}

function makeLevel(n: number): Level {
  const bg = [
    ['#1a237e', '#283593'],
    ['#1b5e20', '#2e7d32'],
    ['#4a148c', '#6a1b9a'],
    ['#b71c1c', '#c62828'],
    ['#e65100', '#bf360c'],
  ][Math.min(n, 4)];

  const colors = ['#66bb6a', '#42a5f5', '#ab47bc', '#ef5350', '#ffa726'];
  const pc = colors[n % colors.length];

  if (n === 0) return {
    bg,
    startX: 60, startY: 300,
    goalX: 1500, goalY: 280,
    platforms: [
      { x: 0, y: 380, w: 300, h: 30, color: pc },
      { x: 350, y: 340, w: 150, h: 25, color: pc },
      { x: 550, y: 300, w: 120, h: 25, color: pc },
      { x: 700, y: 260, w: 150, h: 25, color: pc },
      { x: 900, y: 310, w: 120, h: 25, color: pc },
      { x: 1060, y: 260, w: 180, h: 25, color: pc },
      { x: 1280, y: 220, w: 160, h: 25, color: pc },
      { x: 1480, y: 260, w: 120, h: 25, color: pc },
      // Ground sections
      { x: 0, y: 460, w: 4000, h: 20, color: '#37474f' },
    ],
    enemies: [
      { x: 400, y: 300, w: 28, h: 28, vx: 1.5, alive: true, dir: 1, color: '#ef5350' },
      { x: 900, y: 270, w: 28, h: 28, vx: 1.2, alive: true, dir: 1, color: '#ab47bc' },
      { x: 1100, y: 220, w: 28, h: 28, vx: 1.8, alive: true, dir: 1, color: '#ef5350' },
    ],
    stars: [
      { x: 200, y: 350, collected: false },
      { x: 560, y: 270, collected: false },
      { x: 750, y: 230, collected: false },
      { x: 1000, y: 280, collected: false },
      { x: 1200, y: 190, collected: false },
      { x: 1490, y: 230, collected: false },
    ],
  };

  if (n === 1) return {
    bg, startX: 50, startY: 350,
    goalX: 1700, goalY: 260,
    platforms: [
      { x: 0, y: 400, w: 200, h: 25, color: pc },
      { x: 250, y: 360, w: 100, h: 25, color: pc, moving: true, mx: 250, mspeed: 2, mdir: 1 },
      { x: 400, y: 320, w: 120, h: 25, color: pc },
      { x: 570, y: 280, w: 100, h: 25, color: pc, moving: true, mx: 570, mspeed: 1.5, mdir: 1 },
      { x: 730, y: 240, w: 150, h: 25, color: pc },
      { x: 930, y: 300, w: 100, h: 25, color: pc },
      { x: 1080, y: 250, w: 130, h: 25, color: pc, moving: true, mx: 1080, mspeed: 2, mdir: 1 },
      { x: 1280, y: 200, w: 120, h: 25, color: pc },
      { x: 1460, y: 260, w: 180, h: 25, color: pc },
      { x: 1700, y: 240, w: 150, h: 25, color: pc },
      { x: 0, y: 460, w: 4000, h: 20, color: '#37474f' },
    ],
    enemies: [
      { x: 300, y: 320, w: 28, h: 28, vx: 2, alive: true, dir: 1, color: '#ef5350' },
      { x: 750, y: 200, w: 28, h: 28, vx: 1.5, alive: true, dir: 1, color: '#ff9800' },
      { x: 1100, y: 210, w: 28, h: 28, vx: 2.2, alive: true, dir: 1, color: '#ef5350' },
      { x: 1470, y: 220, w: 28, h: 28, vx: 1.8, alive: true, dir: 1, color: '#ab47bc' },
    ],
    stars: [
      { x: 120, y: 370, collected: false }, { x: 310, y: 330, collected: false },
      { x: 550, y: 250, collected: false }, { x: 790, y: 210, collected: false },
      { x: 1000, y: 270, collected: false }, { x: 1300, y: 170, collected: false },
      { x: 1550, y: 230, collected: false },
    ],
  };

  // Default repeating level pattern for 3, 4, 5
  const plats: Platform[] = [{ x: 0, y: 460, w: 4000, h: 20, color: '#37474f' }];
  const enems: Enemy[] = [];
  const sts: Star[] = [];
  let cx = 50;
  for (let i = 0; i < 12 + n * 2; i++) {
    const gap = 100 + Math.random() * 80;
    const w = 100 + Math.random() * 80;
    const y = 200 + Math.random() * 180;
    plats.push({ x: cx, y, w, h: 25, color: pc, moving: i % 3 === 2, mx: cx, mspeed: 1.5 + n * 0.3, mdir: 1 });
    sts.push({ x: cx + w / 2, y: y - 30, collected: false });
    if (i % 2 === 1) enems.push({ x: cx + 20, y: y - 28, w: 28, h: 28, vx: 1.5 + n * 0.2, alive: true, dir: 1, color: ['#ef5350', '#ab47bc', '#ff9800'][i % 3] });
    cx += w + gap;
  }
  return { bg, startX: 50, startY: 350, goalX: cx - 80, goalY: 160, platforms: plats, enemies: enems, stars: sts };
}

interface State {
  level: number;
  px: number; py: number; vx: number; vy: number;
  grounded: boolean; jumps: number;
  platforms: Platform[];
  enemies: Enemy[];
  stars: Star[];
  particles: Particle[];
  camX: number;
  score: number; lives: number; collected: number;
  alive: boolean; won: boolean;
  walkFrame: number;
  goalX: number; goalY: number;
  bg: string[];
  invincible: number;
}

function drawDaniel(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number, facingRight: boolean) {
  if (isSheetLoaded()) {
    drawGameDaniel(ctx, 4, x - 4, y - 4, PW + 8, PH + 8, !facingRight);
    return;
  }

  ctx.save();
  ctx.translate(x + PW / 2, y + PH / 2);
  if (!facingRight) ctx.scale(-1, 1);

  const leg = Math.sin(frame * 0.3) * 5;

  // Legs
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(-8, 4, 7, 14 + leg | 0);
  ctx.fillRect(1, 4, 7, 14 - leg | 0);
  // Shoes
  ctx.fillStyle = '#fff';
  ctx.fillRect(-10, 16, 9, 4);
  ctx.fillRect(1, 16, 9, 4);
  // Body
  ctx.fillStyle = '#e53935';
  ctx.fillRect(-9, -8, 18, 14);
  // Arms
  const arm = Math.sin(frame * 0.3) * 4;
  ctx.fillStyle = '#ffcc80';
  ctx.fillRect(-13, -7 + arm | 0, 4, 11);
  ctx.fillRect(9, -7 - arm | 0, 4, 11);
  // Head
  ctx.fillStyle = '#ffcc80';
  ctx.fillRect(-8, -20, 16, 14);
  // Hair
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(-8, -20, 16, 4);
  ctx.fillRect(-8, -20, 4, 8);
  // Eyes
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-5, -14, 2, 3);
  ctx.fillRect(2, -14, 2, 3);
  // Smile
  ctx.fillStyle = '#c62828';
  ctx.fillRect(-3, -9, 6, 2);

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, frame: number) {
  ctx.save();
  ctx.translate(e.x + e.w / 2, e.y + e.h / 2);
  ctx.scale(e.dir, 1);

  const bob = Math.sin(frame * 0.15) * 2;

  ctx.fillStyle = e.color;
  ctx.beginPath();
  ctx.ellipse(0, bob, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-5, -2 + bob, 4, 0, Math.PI * 2);
  ctx.arc(5, -2 + bob, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(-4, -2 + bob, 2, 0, Math.PI * 2);
  ctx.arc(6, -2 + bob, 2, 0, Math.PI * 2);
  ctx.fill();

  // Feet
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.ellipse(-7, 12 + bob, 5, 4, 0, 0, Math.PI * 2);
  ctx.ellipse(7, 12 + bob, 5, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export default function Platformer({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State | null>(null);
  const keys = useRef(new Set<string>());
  const rafRef = useRef(0);
  const frameRef = useRef(0);
  const faceRight = useRef(true);
  const [ui, setUi] = useState({ score: 0, lives: 3, level: 1, collected: 0, total: 0, alive: true, won: false });

  const initLevel = (lvlN: number, lives: number, score: number) => {
    const lvl = makeLevel(lvlN);
    stateRef.current = {
      level: lvlN,
      px: lvl.startX, py: lvl.startY, vx: 0, vy: 0,
      grounded: false, jumps: 0,
      platforms: lvl.platforms.map(p => ({ ...p })),
      enemies: lvl.enemies.map(e => ({ ...e })),
      stars: lvl.stars.map(s => ({ ...s })),
      particles: [], camX: 0,
      score, lives, collected: 0,
      alive: true, won: false,
      walkFrame: 0,
      goalX: lvl.goalX, goalY: lvl.goalY,
      bg: lvl.bg, invincible: 0,
    };
  };

  useEffect(() => {
    loadDanielSheet();
    initLevel(0, 3, 0);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    function update() {
      const s = stateRef.current!;
      if (!s.alive || s.won) return;
      frameRef.current++;
      const k = keys.current;

      // Moving platforms
      for (const p of s.platforms) {
        if (p.moving) {
          p.x! += p.mspeed! * p.mdir!;
          if (p.x! > p.mx! + 120 || p.x! < p.mx! - 120) p.mdir! *= -1;
        }
      }

      // Player movement
      s.vx = 0;
      if (k.has('ArrowLeft') || k.has('KeyA')) { s.vx = -WALK; faceRight.current = false; if (s.grounded) s.walkFrame++; }
      if (k.has('ArrowRight') || k.has('KeyD')) { s.vx = WALK; faceRight.current = true; if (s.grounded) s.walkFrame++; }

      // Gravity
      s.vy = Math.min(s.vy + GRAVITY, 18);

      // Horizontal
      s.px += s.vx;
      s.px = Math.max(0, s.px);

      // Horizontal collision
      for (const p of s.platforms) {
        if (s.py + PH > p.y && s.py < p.y + p.h) {
          if (s.vx > 0 && s.px + PW > p.x && s.px < p.x) s.px = p.x - PW;
          if (s.vx < 0 && s.px < p.x + p.w && s.px + PW > p.x + p.w) s.px = p.x + p.w;
        }
      }

      // Vertical
      s.py += s.vy;
      s.grounded = false;

      for (const p of s.platforms) {
        if (s.px + PW > p.x && s.px < p.x + p.w) {
          if (s.vy >= 0 && s.py + PH > p.y && s.py + PH < p.y + p.h + 20) {
            s.py = p.y - PH;
            s.vy = 0;
            s.grounded = true;
            s.jumps = 0;
          }
          if (s.vy < 0 && s.py < p.y + p.h && s.py > p.y - 10) {
            s.py = p.y + p.h;
            s.vy = 0;
          }
        }
      }

      // Jump
      if ((k.has('ArrowUp') || k.has('KeyW') || k.has('Space')) && s.jumps < 2) {
        if (s.grounded || s.jumps === 0 || (s.jumps < 2 && !s.grounded)) {
          s.vy = JUMP_V * (s.jumps === 1 ? 0.85 : 1);
          s.jumps++;
          s.grounded = false;
        }
      }

      // Fall off
      if (s.py > CH + 200) {
        s.lives--;
        s.invincible = 90;
        if (s.lives <= 0) { s.alive = false; return; }
        s.px = s.platforms[0].x + 40; s.py = s.platforms[0].y - PH - 10;
        s.vx = 0; s.vy = 0;
      }

      // Camera
      s.camX = Math.max(0, s.px - CW / 3);

      // Enemies
      for (const e of s.enemies) {
        if (!e.alive) continue;
        e.x += e.vx * e.dir;

        // Bounce at platform edges
        let onPlat = false;
        for (const p of s.platforms) {
          if (e.x + e.w > p.x && e.x < p.x + p.w && Math.abs(e.y + e.h - p.y) < 5) { onPlat = true; }
        }
        // Reverse at edges
        let atEdge = true;
        for (const p of s.platforms) {
          if (Math.abs(e.y + e.h - p.y) < 10) {
            if (e.x > p.x - 4 && e.x + e.w < p.x + p.w + 4) { atEdge = false; }
          }
        }
        if (atEdge) e.dir *= -1;

        // Enemy vs player
        if (s.invincible === 0 && e.alive &&
          s.px + PW > e.x + 4 && s.px < e.x + e.w - 4 &&
          s.py + PH > e.y + 4 && s.py < e.y + e.h - 4) {
          if (s.vy > 0 && s.py + PH < e.y + e.h * 0.6) {
            // Stomp
            e.alive = false;
            s.vy = JUMP_V * 0.7;
            s.score += 200;
            for (let i = 0; i < 10; i++) s.particles.push({ x: e.x + e.w / 2, y: e.y, vx: (Math.random() - 0.5) * 6, vy: -Math.random() * 5, life: 1, color: e.color });
          } else {
            s.lives--;
            s.invincible = 120;
            s.vy = JUMP_V * 0.6;
            if (s.lives <= 0) { s.alive = false; return; }
          }
        }
      }

      // Stars
      for (const st of s.stars) {
        if (!st.collected && Math.abs(s.px + PW / 2 - st.x) < 20 && Math.abs(s.py + PH / 2 - st.y) < 20) {
          st.collected = true;
          s.collected++;
          s.score += 100;
          for (let i = 0; i < 12; i++) s.particles.push({ x: st.x, y: st.y, vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 6, life: 0.8, color: '#ffd700' });
        }
      }

      // Goal
      if (Math.abs(s.px + PW / 2 - s.goalX) < 40 && Math.abs(s.py + PH / 2 - s.goalY) < 40) {
        s.score += 1000 + s.collected * 50;
        s.won = true;
      }

      // Particles
      s.particles = s.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.life -= 0.04;
        return p.life > 0;
      });

      if (s.invincible > 0) s.invincible--;
    }

    function draw() {
      const s = stateRef.current!;

      // BG
      const bg = ctx.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, s.bg[0]);
      bg.addColorStop(1, s.bg[1]);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CW, CH);

      // Background parallax elements
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(i * 200 - (s.camX * 0.3) % 200, 50 + i * 30, 60, CH - 80 - i * 30);
      }

      ctx.save();
      ctx.translate(-s.camX, 0);

      // Platforms
      for (const p of s.platforms) {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(p.x, p.y, p.w, p.h, 4);
        ctx.fill();
        // Top highlight
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(p.x + 4, p.y + 2, p.w - 8, 4);
        // Grass top
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(p.x, p.y, p.w, 6);
      }

      // Goal flag
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(s.goalX - 2, s.goalY - 60, 4, 60);
      ctx.fillStyle = '#ff5722';
      ctx.beginPath();
      ctx.moveTo(s.goalX + 2, s.goalY - 60);
      ctx.lineTo(s.goalX + 28, s.goalY - 50);
      ctx.lineTo(s.goalX + 2, s.goalY - 40);
      ctx.closePath();
      ctx.fill();
      // Goal sparkle
      const t = Math.abs(Math.sin(Date.now() / 300));
      ctx.fillStyle = `rgba(255,215,0,${0.4 + t * 0.4})`;
      ctx.beginPath();
      ctx.arc(s.goalX, s.goalY - 30, 20 + t * 5, 0, Math.PI * 2);
      ctx.fill();

      // Stars
      for (const st of s.stars) {
        if (st.collected) continue;
        const spin = Date.now() / 400;
        ctx.save();
        ctx.translate(st.x, st.y);
        ctx.rotate(spin);
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          const a2 = a + Math.PI / 5;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
          ctx.lineTo(Math.cos(a2) * 5, Math.sin(a2) * 5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Enemies
      for (const e of s.enemies) {
        if (e.alive) drawEnemy(ctx, e, frameRef.current);
      }

      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Player
      if (s.invincible === 0 || Math.floor(s.invincible / 8) % 2 === 0) {
        drawDaniel(ctx, s.px, s.py, s.walkFrame, faceRight.current);
      }

      ctx.restore();

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, CW, 40);

      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < s.lives ? '#ef5350' : '#333';
        ctx.font = '20px serif';
        ctx.fillText('❤️', 10 + i * 30, 28);
      }

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`⭐ ${s.score}`, CW / 2 - 60, 26);

      ctx.fillStyle = '#80cbc4';
      ctx.font = '14px monospace';
      ctx.fillText(`Stars: ${s.collected}/${s.stars.length}`, CW - 150, 26);
      ctx.fillText(`Lvl ${s.level + 1}/5`, CW - 260, 26);

      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '11px sans-serif';
      ctx.fillText('← → Move  ↑/Space: Jump (2x jump!)  Stomp enemies!', 10, CH - 8);

      // Overlays
      if (!s.alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#ef5350';
        ctx.font = 'bold 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CW / 2, CH / 2 - 30);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px monospace';
        ctx.fillText(`Score: ${s.score}`, CW / 2, CH / 2 + 20);
        ctx.fillStyle = 'white';
        ctx.font = '22px sans-serif';
        ctx.fillText('Press R to restart', CW / 2, CH / 2 + 65);
        ctx.textAlign = 'left';
      } else if (s.won) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#69f0ae';
        ctx.font = 'bold 46px sans-serif';
        ctx.textAlign = 'center';
        if (s.level >= 4) {
          ctx.fillText('YOU WIN! 🏆', CW / 2, CH / 2 - 30);
          ctx.fillStyle = '#ffd700';
          ctx.font = 'bold 28px monospace';
          ctx.fillText(`Final Score: ${s.score}`, CW / 2, CH / 2 + 20);
          ctx.fillStyle = 'white';
          ctx.font = '20px sans-serif';
          ctx.fillText('Daniel is a CHAMPION! 🎉', CW / 2, CH / 2 + 60);
        } else {
          ctx.fillText('Level Clear! ⭐', CW / 2, CH / 2 - 20);
          ctx.fillStyle = 'white';
          ctx.font = '24px sans-serif';
          ctx.fillText('Press N for Next Level', CW / 2, CH / 2 + 30);
        }
        ctx.textAlign = 'left';
      }
    }

    function loop() {
      update();
      draw();
      const s = stateRef.current!;
      setUi({ score: s.score, lives: s.lives, level: s.level + 1, collected: s.collected, total: s.stars.length, alive: s.alive, won: s.won });
      rafRef.current = requestAnimationFrame(loop);
    }

    const onKey = (e: KeyboardEvent) => {
      const prevHad = keys.current.has(e.code);
      keys.current.add(e.code);
      const s = stateRef.current!;

      if (e.code === 'KeyR' && !s.alive) initLevel(0, 3, 0);
      if (e.code === 'KeyN' && s.won && s.level < 4) initLevel(s.level + 1, s.lives, s.score);

      // Single jump on press (not hold)
      if (!prevHad && (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space')) {
        if (s.alive && !s.won) {
          if (s.jumps < 2) {
            s.vy = JUMP_V * (s.jumps === 1 ? 0.85 : 1);
            s.jumps++;
            s.grounded = false;
          }
        }
      }

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    };
    const offKey = (e: KeyboardEvent) => keys.current.delete(e.code);

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', offKey);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', offKey);
    };
  }, []);

  const scale = useCanvasScale(CW, CH);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0d0221', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: scale < 1 ? 'flex-start' : 'center', paddingTop: scale < 1 ? 8 : 0, boxSizing: 'border-box' as const }}>
      <button onClick={onBack} style={{ position: 'fixed', top: 10, left: 10, zIndex: 200, background: 'rgba(0,0,0,0.82)', color: '#fff', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 12, padding: '10px 18px', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>← Menu</button>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, alignItems: 'center', width: CW * scale, marginBottom: 8 }}>
        <span style={{ color: '#ffcc80', fontWeight: 900, fontSize: 18 }}>⭐ Super Daniel Run</span>
        <span style={{ color: '#ffd700', fontWeight: 700 }}>Score: {ui.score}</span>
      </div>
      <div style={{ width: CW * scale, height: CH * scale, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CW, height: CH }}>
          <canvas ref={canvasRef} width={CW} height={CH} style={{ border: '2px solid #333', display: 'block' }} />
        </div>
      </div>
      {isMobile() && <ControlsLRJump />}
    </div>
  );
}
