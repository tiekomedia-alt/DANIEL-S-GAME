import React, { useEffect, useRef, useState } from 'react';
import { loadDanielSheet, drawDanielFaceCircle, isSheetLoaded } from '../../daniel-sprite';
import { useCanvasScale, isMobile, ControlsLROnly } from '../../components/MobileControls';

const CW = 480;
const CH = 640;
const ROAD_LEFT = 80;
const ROAD_RIGHT = 400;
const ROAD_W = ROAD_RIGHT - ROAD_LEFT;
const LANE_W = ROAD_W / 3;

interface Car { x: number; y: number; lane: number; color: string; speed: number; type: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; }
interface Coin { x: number; y: number; lane: number; }

interface State {
  px: number; py: number;
  playerLane: number;
  cars: Car[];
  coins: Coin[];
  particles: Particle[];
  score: number;
  distance: number;
  speed: number;
  alive: boolean;
  hp: number;
  roadOffset: number;
  dashOffset: number;
  frameCount: number;
  invincible: number;
  targetX: number;
  shiftCooldown: number;
}

const CAR_COLORS = ['#ef5350', '#42a5f5', '#66bb6a', '#ffa726', '#ab47bc', '#26c6da', '#fff'];
const LANE_XS = [
  ROAD_LEFT + LANE_W * 0.5,
  ROAD_LEFT + LANE_W * 1.5,
  ROAD_LEFT + LANE_W * 2.5,
];

function drawDanielCar(ctx: CanvasRenderingContext2D, x: number, y: number, wobble: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(wobble * 0.05);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.ellipse(0, 28, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = '#f44336';
  ctx.beginPath();
  ctx.roundRect(-16, -28, 32, 56, 5);
  ctx.fill();

  // Roof
  ctx.fillStyle = '#c62828';
  ctx.beginPath();
  ctx.roundRect(-12, -20, 24, 26, 4);
  ctx.fill();

  // Windshield
  ctx.fillStyle = '#80deea';
  ctx.beginPath();
  ctx.roundRect(-10, -18, 20, 12, 3);
  ctx.fill();

  // Rear window
  ctx.fillStyle = '#80deea';
  ctx.beginPath();
  ctx.roundRect(-10, 8, 20, 10, 3);
  ctx.fill();

  // Wheels
  ctx.fillStyle = '#212121';
  const wPos = [[-18, -20], [14, -20], [-18, 14], [14, 14]];
  for (const [wx, wy] of wPos) {
    ctx.beginPath();
    ctx.roundRect(wx, wy, 8, 14, 2);
    ctx.fill();
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath();
    ctx.arc(wx + 4, wy + 7, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#212121';
  }

  // Headlights
  ctx.fillStyle = '#fff9c4';
  ctx.fillRect(-14, -30, 8, 4);
  ctx.fillRect(6, -30, 8, 4);

  // Taillights
  ctx.fillStyle = '#ef5350';
  ctx.fillRect(-14, 26, 8, 4);
  ctx.fillRect(6, 26, 8, 4);

  // Daniel face in window
  if (isSheetLoaded()) {
    drawDanielFaceCircle(ctx, 0, -12, 7);
  } else {
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(0, -12, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-4, -18, 8, 3);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-3, -14, 2, 2);
    ctx.fillRect(1, -14, 2, 2);
    ctx.fillStyle = '#c62828';
    ctx.fillRect(-2, -9, 4, 1.5);
  }

  ctx.restore();
}

function drawEnemyCar(ctx: CanvasRenderingContext2D, car: Car) {
  ctx.save();
  ctx.translate(car.x, car.y);

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 26, 18, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = car.color;
  ctx.beginPath();
  ctx.roundRect(-15, -26, 30, 52, 5);
  ctx.fill();

  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.roundRect(-11, -18, 22, 24, 3);
  ctx.fill();

  ctx.fillStyle = '#90a4ae';
  ctx.beginPath();
  ctx.roundRect(-9, -16, 18, 11, 2);
  ctx.fill();

  ctx.fillStyle = '#212121';
  const w2 = [[-17, -18], [13, -18], [-17, 13], [13, 13]];
  for (const [wx, wy] of w2) {
    ctx.beginPath();
    ctx.roundRect(wx, wy, 7, 12, 2);
    ctx.fill();
  }

  ctx.fillStyle = '#fff59d';
  ctx.fillRect(-13, 24, 7, 3);
  ctx.fillRect(6, 24, 7, 3);

  ctx.restore();
}

export default function RacingGame({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State | null>(null);
  const keys = useRef(new Set<string>());
  const rafRef = useRef(0);
  const [ui, setUi] = useState({ score: 0, hp: 3, speed: 60, alive: true });

  useEffect(() => {
    loadDanielSheet();
    stateRef.current = {
      px: LANE_XS[1], py: CH - 120,
      playerLane: 1,
      cars: [], coins: [], particles: [],
      score: 0, distance: 0, speed: 3,
      alive: true, hp: 3,
      roadOffset: 0, dashOffset: 0,
      frameCount: 0, invincible: 0,
      targetX: LANE_XS[1],
      shiftCooldown: 0,
    };

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    function spawnCar(s: State) {
      const lane = Math.floor(Math.random() * 3);
      s.cars.push({
        x: LANE_XS[lane], y: -60,
        lane, speed: s.speed * (0.3 + Math.random() * 0.4),
        color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
        type: Math.floor(Math.random() * 3),
      });
    }

    function spawnCoin(s: State) {
      const lane = Math.floor(Math.random() * 3);
      s.coins.push({ x: LANE_XS[lane], y: -30, lane });
    }

    function update() {
      const s = stateRef.current!;
      if (!s.alive) return;
      s.frameCount++;
      const k = keys.current;

      // Speed up over time
      s.speed = Math.min(3 + s.distance * 0.0003, 12);
      s.distance += s.speed;
      s.score = Math.floor(s.distance * 0.1);

      // Road scroll
      s.roadOffset = (s.roadOffset + s.speed * 3) % 80;
      s.dashOffset = (s.dashOffset + s.speed * 2) % 120;

      // Player lane change
      if (s.shiftCooldown > 0) s.shiftCooldown--;
      if (s.shiftCooldown === 0) {
        if ((k.has('ArrowLeft') || k.has('KeyA')) && s.playerLane > 0) {
          s.playerLane--;
          s.targetX = LANE_XS[s.playerLane];
          s.shiftCooldown = 15;
        }
        if ((k.has('ArrowRight') || k.has('KeyD')) && s.playerLane < 2) {
          s.playerLane++;
          s.targetX = LANE_XS[s.playerLane];
          s.shiftCooldown = 15;
        }
      }
      // Smooth move
      s.px += (s.targetX - s.px) * 0.2;

      // Spawn cars
      if (s.frameCount % Math.max(60, 120 - s.distance * 0.1 | 0) === 0) spawnCar(s);
      if (s.frameCount % 180 === 0) spawnCoin(s);

      // Update traffic cars
      s.cars = s.cars.filter(c => {
        c.y += s.speed - c.speed + s.speed;
        if (c.y > CH + 80) return false;
        // Collision
        if (s.invincible === 0 && Math.abs(c.x - s.px) < 28 && Math.abs(c.y - s.py) < 50) {
          s.hp--;
          s.invincible = 120;
          for (let p = 0; p < 20; p++) {
            s.particles.push({ x: s.px, y: s.py, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 1, color: '#ff5722' });
          }
          if (s.hp <= 0) { s.alive = false; }
          return false;
        }
        return true;
      });

      // Coins
      s.coins = s.coins.filter(c => {
        c.y += s.speed * 2;
        if (c.y > CH + 30) return false;
        if (Math.abs(c.x - s.px) < 20 && Math.abs(c.y - s.py) < 20) {
          s.score += 50;
          for (let p = 0; p < 8; p++) {
            s.particles.push({ x: c.x, y: c.y, vx: (Math.random() - 0.5) * 5, vy: -Math.random() * 5, life: 0.8, color: '#ffd700' });
          }
          return false;
        }
        return true;
      });

      // Particles
      s.particles = s.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.2; p.life -= 0.04;
        return p.life > 0;
      });

      if (s.invincible > 0) s.invincible--;
    }

    function draw() {
      const s = stateRef.current!;

      // Sky / BG
      const bg = ctx.createLinearGradient(0, 0, 0, CH);
      bg.addColorStop(0, '#263238');
      bg.addColorStop(1, '#37474f');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CW, CH);

      // Grass sides
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(0, 0, ROAD_LEFT, CH);
      ctx.fillRect(ROAD_RIGHT, 0, CW - ROAD_RIGHT, CH);

      // Grass detail (stripes)
      ctx.fillStyle = '#1b5e20';
      for (let y = (-s.roadOffset) % 60 - 60; y < CH; y += 60) {
        ctx.fillRect(0, y, ROAD_LEFT, 30);
        ctx.fillRect(ROAD_RIGHT, y, CW - ROAD_RIGHT, 30);
      }

      // Road
      ctx.fillStyle = '#455a64';
      ctx.fillRect(ROAD_LEFT, 0, ROAD_W, CH);

      // Road edge lines
      ctx.fillStyle = '#fff';
      ctx.fillRect(ROAD_LEFT, 0, 4, CH);
      ctx.fillRect(ROAD_RIGHT - 4, 0, 4, CH);

      // Lane dashes
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 3;
      ctx.setLineDash([40, 40]);
      ctx.lineDashOffset = -s.dashOffset;
      for (let ln = 1; ln < 3; ln++) {
        const lx = ROAD_LEFT + LANE_W * ln;
        ctx.beginPath();
        ctx.moveTo(lx, 0);
        ctx.lineTo(lx, CH);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Coins
      for (const c of s.coins) {
        const t = Math.sin(Date.now() / 150 + c.x);
        ctx.fillStyle = '#ffd700';
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(c.x, c.y, 12 + t * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ff8f00';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('$', c.x, c.y + 4);
        ctx.textAlign = 'left';
      }

      // Enemy cars
      for (const c of s.cars) drawEnemyCar(ctx, c);

      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Player car (blink when invincible)
      if (s.invincible === 0 || Math.floor(s.invincible / 8) % 2 === 0) {
        const wobble = LANE_XS[s.playerLane] - s.px;
        drawDanielCar(ctx, s.px, s.py, wobble);
      }

      // Skid marks when turning
      if (Math.abs(s.targetX - s.px) > 3) {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(s.px - 8, s.py + 20);
        ctx.lineTo(s.px - 8, s.py + 40);
        ctx.moveTo(s.px + 8, s.py + 20);
        ctx.lineTo(s.px + 8, s.py + 40);
        ctx.stroke();
      }

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CW, 44);

      // HP
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < s.hp ? '#ef5350' : '#333';
        ctx.font = '22px serif';
        ctx.fillText('❤️', 10 + i * 32, 30);
      }

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(`⭐ ${s.score}`, CW / 2 - 50, 30);

      const kmh = Math.floor(s.speed * 20);
      ctx.fillStyle = '#80cbc4';
      ctx.fillText(`${kmh} km/h`, CW - 110, 30);

      // Speed bar at bottom
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, CH - 30, CW, 30);
      ctx.fillStyle = '#26c6da';
      ctx.fillRect(0, CH - 30, CW * (s.speed / 12), 30);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`SPEED: ${kmh} km/h`, CW / 2 - 55, CH - 10);

      // Controls hint
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '11px sans-serif';
      ctx.fillText('← → to change lanes', 8, CH - 35);

      if (!s.alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#ef5350';
        ctx.font = 'bold 50px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('CRASH!', CW / 2, CH / 2 - 40);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 28px monospace';
        ctx.fillText(`Score: ${s.score}`, CW / 2, CH / 2 + 15);
        ctx.fillStyle = 'white';
        ctx.font = '22px sans-serif';
        ctx.fillText('Press R to race again', CW / 2, CH / 2 + 60);
        ctx.textAlign = 'left';
      }
    }

    function loop() {
      update();
      draw();
      const s = stateRef.current!;
      setUi({ score: s.score, hp: s.hp, speed: Math.floor(s.speed * 20), alive: s.alive });
      rafRef.current = requestAnimationFrame(loop);
    }

    const onKey = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (e.code === 'KeyR' && !stateRef.current!.alive) {
        stateRef.current = { px: LANE_XS[1], py: CH - 120, playerLane: 1, cars: [], coins: [], particles: [], score: 0, distance: 0, speed: 3, alive: true, hp: 3, roadOffset: 0, dashOffset: 0, frameCount: 0, invincible: 0, targetX: LANE_XS[1], shiftCooldown: 0 };
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) e.preventDefault();
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
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: scale < 1 ? 'flex-start' : 'center', paddingTop: scale < 1 ? 8 : 0, boxSizing: 'border-box' as const }}>
      <button onClick={onBack} style={{ position: 'fixed', top: 10, left: 10, zIndex: 200, background: 'rgba(0,0,0,0.82)', color: '#fff', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 12, padding: '10px 18px', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>← Menu</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: CW * scale, marginBottom: 8, paddingLeft: 8 }}>
        <span style={{ color: '#ef9a9a', fontWeight: 900, fontSize: 18 }}>🏎️ Road Racer</span>
        <span style={{ color: '#ffd700', fontWeight: 700 }}>Score: {ui.score}</span>
      </div>
      <div style={{ width: CW * scale, height: CH * scale, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CW, height: CH }}>
          <canvas ref={canvasRef} width={CW} height={CH} style={{ border: '2px solid #333', display: 'block' }} />
        </div>
      </div>
      {isMobile() && <ControlsLROnly />}
    </div>
  );
}
