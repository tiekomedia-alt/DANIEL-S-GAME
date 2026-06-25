import React, { useEffect, useRef, useState } from 'react';
import { loadDanielSheet, drawDanielFaceCircle, isSheetLoaded } from '../../daniel-sprite';
import { useCanvasScale, isMobile, ControlsDpadShoot } from '../../components/MobileControls';

const CW = 600;
const CH = 650;

interface Bullet { x: number; y: number; speed: number; power: number; }
interface Enemy { x: number; y: number; hp: number; maxHp: number; speed: number; type: number; angle: number; }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; }
interface Star { x: number; y: number; speed: number; size: number; }
interface PowerUp { x: number; y: number; type: number; }

interface State {
  px: number; py: number;
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  stars: Star[];
  powerUps: PowerUp[];
  hp: number; maxHp: number;
  score: number;
  wave: number;
  alive: boolean;
  shootCooldown: number;
  tripleShot: number;
  shield: number;
  waveTimer: number;
  waveSpawned: boolean;
  frameCount: number;
}

function spawnWave(state: State) {
  const w = state.wave;
  const count = 5 + w * 2;
  for (let i = 0; i < count; i++) {
    const type = Math.min(Math.floor(Math.random() * (1 + w * 0.5)), 3);
    state.enemies.push({
      x: 40 + Math.random() * (CW - 80),
      y: -40 - i * 50,
      hp: 1 + type,
      maxHp: 1 + type,
      speed: 0.8 + Math.random() * 0.6 + w * 0.1,
      type,
      angle: 0,
    });
  }
}

function drawDanielShip(ctx: CanvasRenderingContext2D, x: number, y: number, shieldActive: boolean) {
  ctx.save();
  ctx.translate(x, y);

  // Engine glow
  ctx.fillStyle = '#ff6f00';
  ctx.beginPath();
  ctx.ellipse(0, 22, 8, 14 + Math.random() * 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ship body
  ctx.fillStyle = '#1565c0';
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(18, 20);
  ctx.lineTo(0, 12);
  ctx.lineTo(-18, 20);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = '#29b6f6';
  ctx.beginPath();
  ctx.ellipse(0, -4, 8, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  ctx.fillStyle = '#0d47a1';
  ctx.fillRect(-28, 5, 12, 8);
  ctx.fillRect(16, 5, 12, 8);

  // Daniel face in cockpit
  if (isSheetLoaded()) {
    drawDanielFaceCircle(ctx, 0, -4, 7);
  } else {
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.ellipse(0, -4, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-4, -10, 8, 3);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-3, -7, 2, 2);
    ctx.fillRect(1, -7, 2, 2);
    ctx.fillStyle = '#c62828';
    ctx.fillRect(-2, -2, 4, 1);
  }

  // Shield
  if (shieldActive) {
    ctx.strokeStyle = `rgba(100,200,255,${0.5 + Math.sin(Date.now() / 100) * 0.3})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 0, 30, 34, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy) {
  ctx.save();
  ctx.translate(e.x, e.y);
  e.angle += 0.02;
  ctx.rotate(e.angle);

  const colors = ['#ef5350', '#ff7043', '#ab47bc', '#ffa726'];
  const col = colors[Math.min(e.type, colors.length - 1)];

  if (e.type === 0) {
    // Basic saucer
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.ellipse(0, -3, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 1) {
    // Angular fighter
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(16, 14);
    ctx.lineTo(-16, 14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff176';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.type === 2) {
    // Tank
    ctx.fillStyle = col;
    ctx.fillRect(-18, -18, 36, 36);
    ctx.fillStyle = '#ffcc02';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Boss
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff3d00';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(Math.cos(i * Math.PI / 3) * 14, Math.sin(i * Math.PI / 3) * 14, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${e.hp}`, 0, 4);
    ctx.textAlign = 'left';
  }

  // HP bar for enemies with >1 hp
  if (e.maxHp > 1) {
    ctx.fillStyle = '#c62828';
    ctx.fillRect(-18, -28, 36, 5);
    ctx.fillStyle = '#66bb6a';
    ctx.fillRect(-18, -28, 36 * (e.hp / e.maxHp), 5);
  }

  ctx.restore();
}

export default function SpaceDefender({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State | null>(null);
  const keys = useRef(new Set<string>());
  const rafRef = useRef(0);
  const [ui, setUi] = useState({ score: 0, hp: 10, wave: 1, alive: true, shield: 0, triple: 0 });

  useEffect(() => {
    loadDanielSheet();
    const stars: Star[] = Array.from({ length: 80 }, () => ({
      x: Math.random() * CW, y: Math.random() * CH,
      speed: Math.random() * 2 + 0.5, size: Math.random() * 2 + 0.5,
    }));

    stateRef.current = {
      px: CW / 2, py: CH - 80,
      bullets: [], enemies: [], particles: [], stars, powerUps: [],
      hp: 10, maxHp: 10, score: 0, wave: 1, alive: true,
      shootCooldown: 0, tripleShot: 0, shield: 0,
      waveTimer: 0, waveSpawned: false, frameCount: 0,
    };
    spawnWave(stateRef.current!);

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    function update() {
      const s = stateRef.current!;
      if (!s.alive) return;
      s.frameCount++;
      const k = keys.current;

      // Player movement
      const speed = 5;
      if (k.has('ArrowLeft') || k.has('KeyA')) s.px = Math.max(20, s.px - speed);
      if (k.has('ArrowRight') || k.has('KeyD')) s.px = Math.min(CW - 20, s.px + speed);
      if (k.has('ArrowUp') || k.has('KeyW')) s.py = Math.max(60, s.py - speed);
      if (k.has('ArrowDown') || k.has('KeyS')) s.py = Math.min(CH - 40, s.py + speed);

      // Shoot
      s.shootCooldown = Math.max(0, s.shootCooldown - 1);
      if ((k.has('Space') || k.has('KeyZ')) && s.shootCooldown === 0) {
        s.shootCooldown = 10;
        s.bullets.push({ x: s.px, y: s.py - 20, speed: 10, power: 1 });
        if (s.tripleShot > 0) {
          s.bullets.push({ x: s.px - 15, y: s.py - 10, speed: 10, power: 1 });
          s.bullets.push({ x: s.px + 15, y: s.py - 10, speed: 10, power: 1 });
        }
      }

      // Update bullets
      s.bullets = s.bullets.filter(b => {
        b.y -= b.speed;
        if (b.y < -10) return false;
        // Hit enemies
        for (let i = s.enemies.length - 1; i >= 0; i--) {
          const e = s.enemies[i];
          if (Math.abs(b.x - e.x) < 22 && Math.abs(b.y - e.y) < 22) {
            e.hp -= b.power;
            for (let p = 0; p < 8; p++) {
              s.particles.push({
                x: e.x, y: e.y,
                vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                life: 0.8 + Math.random() * 0.4,
                color: `hsl(${Math.random() * 60 + 10},100%,60%)`,
              });
            }
            if (e.hp <= 0) {
              s.score += (e.type + 1) * 100;
              s.enemies.splice(i, 1);
              // Chance for power-up
              if (Math.random() < 0.2) {
                s.powerUps.push({ x: e.x, y: e.y, type: Math.floor(Math.random() * 2) });
              }
            }
            return false;
          }
        }
        return true;
      });

      // Update enemies
      for (const e of s.enemies) {
        e.y += e.speed;
        e.x += Math.sin(e.y * 0.03 + e.angle) * 1.5;
        if (e.y > CH + 30) e.y = -40;
        // Hit player
        if (Math.abs(e.x - s.px) < 20 && Math.abs(e.y - s.py) < 24) {
          if (s.shield > 0) {
            s.enemies.splice(s.enemies.indexOf(e), 1);
            s.score += 150;
          } else {
            s.hp -= 1;
            s.enemies.splice(s.enemies.indexOf(e), 1);
            for (let p = 0; p < 15; p++) {
              s.particles.push({
                x: s.px, y: s.py,
                vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                life: 1 + Math.random(), color: '#ef5350',
              });
            }
            if (s.hp <= 0) { s.alive = false; return; }
          }
        }
      }

      // Power-ups
      s.powerUps = s.powerUps.filter(p => {
        p.y += 1.5;
        if (p.y > CH + 20) return false;
        if (Math.abs(p.x - s.px) < 20 && Math.abs(p.y - s.py) < 20) {
          if (p.type === 0) s.tripleShot = 300;
          else { s.hp = Math.min(s.hp + 3, s.maxHp); s.shield = 180; }
          s.score += 50;
          return false;
        }
        return true;
      });

      // Timers
      if (s.tripleShot > 0) s.tripleShot--;
      if (s.shield > 0) s.shield--;

      // Particles
      s.particles = s.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.04;
        p.vx *= 0.95; p.vy *= 0.95;
        return p.life > 0;
      });

      // Stars
      for (const st of s.stars) {
        st.y += st.speed;
        if (st.y > CH) { st.y = 0; st.x = Math.random() * CW; }
      }

      // Next wave
      if (s.enemies.length === 0) {
        s.waveTimer++;
        if (s.waveTimer > 120) {
          s.wave++;
          spawnWave(s);
          s.waveTimer = 0;
          if (s.wave % 3 === 0) s.hp = Math.min(s.hp + 2, s.maxHp);
        }
      }
    }

    function draw() {
      const s = stateRef.current!;

      // BG
      ctx.fillStyle = '#05050f';
      ctx.fillRect(0, 0, CW, CH);

      // Stars
      for (const st of s.stars) {
        ctx.fillStyle = `rgba(255,255,255,${0.4 + st.size * 0.3})`;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!s.alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#ef5350';
        ctx.font = 'bold 52px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CW / 2, CH / 2 - 30);
        ctx.fillStyle = 'white';
        ctx.font = '28px sans-serif';
        ctx.fillText(`Score: ${s.score}`, CW / 2, CH / 2 + 20);
        ctx.fillText(`Wave: ${s.wave}`, CW / 2, CH / 2 + 60);
        ctx.font = '20px sans-serif';
        ctx.fillText('Tap PLAY AGAIN below ↓', CW / 2, CH / 2 + 105);
        ctx.textAlign = 'left';
        return;
      }

      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Power-ups
      for (const p of s.powerUps) {
        const t = Math.sin(Date.now() / 200);
        ctx.strokeStyle = p.type === 0 ? '#00e676' : '#29b6f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 12 + t * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = p.type === 0 ? '#76ff03' : '#40c4ff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.type === 0 ? '3x' : '❤️', p.x, p.y + 5);
        ctx.textAlign = 'left';
      }

      // Bullets
      for (const b of s.bullets) {
        ctx.fillStyle = '#ffff00';
        ctx.shadowColor = '#ffff00';
        ctx.shadowBlur = 6;
        ctx.fillRect(b.x - 2, b.y - 8, 4, 12);
        ctx.shadowBlur = 0;
      }

      // Enemies
      for (const e of s.enemies) {
        drawEnemy(ctx, e);
      }

      // Player
      drawDanielShip(ctx, s.px, s.py, s.shield > 0);

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, CW, 42);
      // HP
      ctx.fillStyle = '#c62828';
      ctx.fillRect(10, 10, 150, 16);
      ctx.fillStyle = s.hp > 3 ? '#66bb6a' : '#ef5350';
      ctx.fillRect(10, 10, 150 * (s.hp / s.maxHp), 16);
      ctx.fillStyle = 'white';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`❤️ ${s.hp}/${s.maxHp}`, 14, 24);

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 15px monospace';
      ctx.fillText(`⭐ ${s.score}`, CW / 2 - 60, 28);

      ctx.fillStyle = '#b39ddb';
      ctx.fillText(`Wave ${s.wave}`, CW - 100, 28);

      // Power-up indicators
      if (s.tripleShot > 0) {
        ctx.fillStyle = '#76ff03';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`3x SHOT: ${Math.ceil(s.tripleShot / 60)}s`, 10, CH - 30);
      }
      if (s.shield > 0) {
        ctx.fillStyle = '#29b6f6';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`SHIELD: ${Math.ceil(s.shield / 60)}s`, 10, CH - 12);
      }

      // Controls
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Arrows/WASD: Move  Space/Z: Shoot', CW - 8, CH - 8);
      ctx.textAlign = 'left';

      // Wave clear
      if (s.enemies.length === 0 && s.waveTimer > 0 && s.waveTimer < 120) {
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(CW / 2 - 120, CH / 2 - 30, 240, 60);
        ctx.fillStyle = '#69f0ae';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Wave ${s.wave - 1} Clear!`, CW / 2, CH / 2 + 10);
        ctx.textAlign = 'left';
      }
    }

    function loop() {
      update();
      draw();
      setUi({ score: stateRef.current!.score, hp: stateRef.current!.hp, wave: stateRef.current!.wave, alive: stateRef.current!.alive, shield: stateRef.current!.shield, triple: stateRef.current!.tripleShot });
      rafRef.current = requestAnimationFrame(loop);
    }

    const onKey = (e: KeyboardEvent) => {
      keys.current.add(e.code);
      if (e.code === 'KeyR' && !stateRef.current!.alive) {
        const stars2: Star[] = Array.from({ length: 80 }, () => ({ x: Math.random() * CW, y: Math.random() * CH, speed: Math.random() * 2 + 0.5, size: Math.random() * 2 + 0.5 }));
        stateRef.current = { px: CW / 2, py: CH - 80, bullets: [], enemies: [], particles: [], stars: stars2, powerUps: [], hp: 10, maxHp: 10, score: 0, wave: 1, alive: true, shootCooldown: 0, tripleShot: 0, shield: 0, waveTimer: 0, waveSpawned: false, frameCount: 0 };
        spawnWave(stateRef.current!);
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
    <div style={{ width: '100vw', height: '100vh', background: '#05050f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: isMobile() ? 160 : 0, boxSizing: 'border-box' as const }}>
      <button onClick={onBack} style={{ position: 'fixed', top: 10, left: 10, zIndex: 200, background: 'rgba(0,0,0,0.82)', color: '#fff', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 12, padding: '10px 18px', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>← Menu</button>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, alignItems: 'center', width: CW * scale, marginBottom: 8 }}>
        <span style={{ color: '#b39ddb', fontWeight: 900, fontSize: 18 }}>🚀 Space Defender</span>
        <span style={{ color: '#ffd700', fontWeight: 700 }}>Wave {ui.wave}</span>
      </div>
      <div style={{ position: 'relative', width: CW * scale, height: CH * scale, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CW, height: CH }}>
          <canvas ref={canvasRef} width={CW} height={CH} style={{ border: '2px solid #1a1a3e', display: 'block' }} />
        </div>
        {!ui.alive && (
          <div style={{ position: 'absolute', bottom: '10%', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
            <button onClick={() => { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true })); }} style={{ padding: '14px 36px', fontSize: 20, fontWeight: 900, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 14, cursor: 'pointer', boxShadow: '0 4px 24px rgba(124,58,237,0.7)', WebkitTapHighlightColor: 'transparent' }}>🔄 PLAY AGAIN</button>
          </div>
        )}
      </div>
      {isMobile() && ui.alive && <ControlsDpadShoot />}
    </div>
  );
}
