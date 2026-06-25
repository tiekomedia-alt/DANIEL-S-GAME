import React, { useEffect, useRef, useState, useCallback } from 'react';

// Cell types
const C = {
  EMPTY: 0, SOIL: 1, WALL: 2, BOULDER: 3, DIAMOND: 4,
  PLAYER: 5, EXIT: 6, EXIT_OPEN: 7, FIREFLY: 8,
} as const;

const CELL = 36;
const COLS = 22;
const ROWS = 16;
const CW = COLS * CELL;
const CH = ROWS * CELL;

// 5 levels
const LEVELS: string[] = [
  // Level 1: Easy intro
  `......................` +
  `.WWWWWWWWWWWWWWWWWWW.` +
  `.W..................W.` +
  `.W.D..D..D..D..D...W.` +
  `.W...BBBBB.........W.` +
  `.W.P.......D.......W.` +
  `.W.........BBBBB...W.` +
  `.W.......D.........W.` +
  `.W...D..........D..W.` +
  `.W.BBB..BBB.....BBB.W.` +
  `.W..................W.` +
  `.W..D.D..D..D..D...W.` +
  `.W..................W.` +
  `.W.........E.......W.` +
  `.WWWWWWWWWWWWWWWWWWW.` +
  `......................`,

  // Level 2
  `WWWWWWWWWWWWWWWWWWWWWW` +
  `W....................W` +
  `W.P....D..D..D.....W` +
  `W...BBBB...........W` +
  `W..........BBBB....W` +
  `W.D..D...D......D..W` +
  `W......BBBB........W` +
  `W.D.D.......D......W` +
  `W.........BBB..D...W` +
  `W...D..D...........W` +
  `W..BBB.........D...W` +
  `W...........BBBB...W` +
  `W..D..D..D.........W` +
  `W..............E...W` +
  `WWWWWWWWWWWWWWWWWWWWWW` +
  `WWWWWWWWWWWWWWWWWWWWWW`,

  // Level 3 with firefly
  `WWWWWWWWWWWWWWWWWWWWWW` +
  `W.P.D.D.D.D.D.D.D..W` +
  `W...................W` +
  `W.BBB.BBB.BBB.BBB..W` +
  `W...................W` +
  `W.D.D.D.D.D.D.D.D..W` +
  `W...................W` +
  `W.BBB.F.....F.BBB..W` +
  `W...................W` +
  `W.D.D.D.D.D.D.D.D..W` +
  `W...................W` +
  `W.BBB.BBB.BBB.BBB..W` +
  `W...................W` +
  `W..D..D..D..D..E...W` +
  `WWWWWWWWWWWWWWWWWWWWWW` +
  `WWWWWWWWWWWWWWWWWWWWWW`,

  // Level 4 harder
  `WWWWWWWWWWWWWWWWWWWWWW` +
  `W.P.B.D.B.D.B.D.B..W` +
  `W...B...B...B...B...W` +
  `W.D.B.D.B.D.B.D.B..W` +
  `W...................W` +
  `W.BBB.F.BBB.F.BBB..W` +
  `W...................W` +
  `W.D.D.D.D.D.D.D.D..W` +
  `W...................W` +
  `W.F.BBB.BBB.BBB.F..W` +
  `W...................W` +
  `W.D.D.D.D.D.D.D.D..W` +
  `W...................W` +
  `W..D..D..D..D..E...W` +
  `WWWWWWWWWWWWWWWWWWWWWW` +
  `WWWWWWWWWWWWWWWWWWWWWW`,

  // Level 5 boss
  `WWWWWWWWWWWWWWWWWWWWWW` +
  `W.P.................W` +
  `W.D.D.D.D.D.D.D.D..W` +
  `W.BBB.BBB.BBB.BBB..W` +
  `W.D.D.D.D.D.D.D.D..W` +
  `W.F...F...F...F....W` +
  `W.D.D.D.D.D.D.D.D..W` +
  `W.BBB.BBB.BBB.BBB..W` +
  `W.D.D.D.D.D.D.D.D..W` +
  `W.F...F...F...F....W` +
  `W.D.D.D.D.D.D.D.D..W` +
  `W.BBB.BBB.BBB.BBB..W` +
  `W.D.D.D.D.D.D.D.D..W` +
  `W..D..D..E.........W` +
  `WWWWWWWWWWWWWWWWWWWWWW` +
  `WWWWWWWWWWWWWWWWWWWWWW`,
];

function parseLevel(lvl: string): { grid: number[][], playerX: number, playerY: number, exitX: number, exitY: number, diamonds: number, flies: Array<{ x: number, y: number, dir: number }> } {
  const grid: number[][] = [];
  let playerX = 1, playerY = 1, exitX = 1, exitY = 1;
  let diamonds = 0;
  const flies: Array<{ x: number, y: number, dir: number }> = [];

  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    for (let c = 0; c < COLS; c++) {
      const ch = lvl[r * COLS + c] ?? ' ';
      if (ch === 'W') { grid[r][c] = C.WALL; }
      else if (ch === 'B') { grid[r][c] = C.BOULDER; }
      else if (ch === 'D') { grid[r][c] = C.DIAMOND; diamonds++; }
      else if (ch === 'P') { grid[r][c] = C.EMPTY; playerX = c; playerY = r; }
      else if (ch === 'E') { grid[r][c] = C.EXIT; exitX = c; exitY = r; }
      else if (ch === 'F') {
        grid[r][c] = C.FIREFLY;
        flies.push({ x: c, y: r, dir: 0 });
      }
      else { grid[r][c] = C.SOIL; }
    }
  }
  return { grid, playerX, playerY, exitX, exitY, diamonds, flies };
}

interface FlyState { x: number; y: number; dir: number; }

interface State {
  grid: number[][];
  px: number; py: number;
  exX: number; exY: number;
  totalDiamonds: number;
  collected: number;
  flies: FlyState[];
  alive: boolean;
  won: boolean;
  lives: number;
  score: number;
  level: number;
  moveDelay: number;
  flyTimer: number;
}

// Directions: 0=right, 1=down, 2=left, 3=up
const DX = [1, 0, -1, 0];
const DY = [0, 1, 0, -1];

function drawDanielFace(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const s = size / CELL;
  const cx = x + size / 2;
  const cy = y + size / 2;

  // body
  ctx.fillStyle = '#e53935';
  ctx.fillRect(x + 4 * s, y + 14 * s, 12 * s, 10 * s);
  // head
  ctx.fillStyle = '#ffcc80';
  ctx.fillRect(x + 6 * s, y + 4 * s, 12 * s, 11 * s);
  // hair
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(x + 6 * s, y + 4 * s, 12 * s, 3 * s);
  // eyes
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x + 9 * s, y + 9 * s, 2 * s, 2 * s);
  ctx.fillRect(x + 13 * s, y + 9 * s, 2 * s, 2 * s);
  // pants
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(x + 4 * s, y + 22 * s, 5 * s, 8 * s);
  ctx.fillRect(x + 11 * s, y + 22 * s, 5 * s, 8 * s);
}

export default function DiamondRush({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State | null>(null);
  const keysRef = useRef(new Set<string>());
  const rafRef = useRef(0);
  const lastMoveRef = useRef(0);
  const lastPhysicsRef = useRef(0);
  const lastFlyRef = useRef(0);
  const [ui, setUi] = useState({ lives: 3, score: 0, level: 1, collected: 0, total: 0, alive: true, won: false });

  const initLevel = useCallback((lvlIdx: number, lives: number, score: number) => {
    const lvlStr = LEVELS[Math.min(lvlIdx, LEVELS.length - 1)];
    const { grid, playerX, playerY, exitX, exitY, diamonds, flies } = parseLevel(lvlStr);
    stateRef.current = {
      grid, px: playerX, py: playerY, exX: exitX, exY: exitY,
      totalDiamonds: diamonds, collected: 0,
      flies, alive: true, won: false, lives, score, level: lvlIdx,
      moveDelay: 150, flyTimer: 0,
    };
  }, []);

  useEffect(() => {
    initLevel(0, 3, 0);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const DIAMONDS_NEEDED = [3, 5, 8, 10, 15];

    function getCell(g: number[][], r: number, c: number): number {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return C.WALL;
      return g[r][c];
    }
    function setCell(g: number[][], r: number, c: number, v: number) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      g[r][c] = v;
    }

    function tryMove(dx: number, dy: number) {
      const s = stateRef.current!;
      if (!s.alive || s.won) return;
      const nx = s.px + dx;
      const ny = s.py + dy;
      const cell = getCell(s.grid, ny, nx);

      if (cell === C.WALL) return;
      if (cell === C.BOULDER) {
        // Push boulder
        if (dy === 0) {
          const bx2 = nx + dx;
          if (getCell(s.grid, ny, bx2) === C.EMPTY) {
            setCell(s.grid, ny, bx2, C.BOULDER);
            setCell(s.grid, ny, nx, C.EMPTY);
          } else return;
        } else return;
      }
      if (cell === C.EXIT && s.collected < DIAMONDS_NEEDED[s.level]) return;
      if (cell === C.FIREFLY) { s.alive = false; s.lives--; return; }

      if (cell === C.DIAMOND) s.collected++;
      if (cell === C.EXIT_OPEN || (cell === C.EXIT && s.collected >= DIAMONDS_NEEDED[s.level])) {
        s.score += s.collected * 100 + 500;
        s.won = true;
        return;
      }

      setCell(s.grid, s.py, s.px, C.EMPTY);
      s.px = nx; s.py = ny;
      setCell(s.grid, ny, nx, C.EMPTY);

      // Check if exit should open
      if (s.collected >= DIAMONDS_NEEDED[s.level]) {
        setCell(s.grid, s.exY, s.exX, C.EXIT_OPEN);
      }
    }

    function physics() {
      const s = stateRef.current!;
      if (!s.alive || s.won) return;

      for (let r = ROWS - 2; r >= 0; r--) {
        for (let c = 0; c < COLS; c++) {
          const cell = getCell(s.grid, r, c);
          if (cell !== C.BOULDER && cell !== C.DIAMOND) continue;

          const below = getCell(s.grid, r + 1, c);
          if (below === C.EMPTY) {
            setCell(s.grid, r + 1, c, cell);
            setCell(s.grid, r, c, C.EMPTY);
            // Falling on player kills
            if (s.px === c && s.py === r + 1) { s.alive = false; s.lives--; }
          } else if ((below === C.BOULDER || below === C.DIAMOND) && cell === C.BOULDER) {
            // Roll
            if (getCell(s.grid, r, c + 1) === C.EMPTY && getCell(s.grid, r + 1, c + 1) === C.EMPTY) {
              setCell(s.grid, r, c + 1, C.BOULDER);
              setCell(s.grid, r, c, C.EMPTY);
            } else if (getCell(s.grid, r, c - 1) === C.EMPTY && getCell(s.grid, r + 1, c - 1) === C.EMPTY) {
              setCell(s.grid, r, c - 1, C.BOULDER);
              setCell(s.grid, r, c, C.EMPTY);
            }
          }
        }
      }
    }

    function moveFly(f: FlyState) {
      const s = stateRef.current!;
      // Firefly follows left-hand-wall rule
      const leftDir = (f.dir + 3) % 4;
      const leftX = f.x + DX[leftDir];
      const leftY = f.y + DY[leftDir];
      const frontX = f.x + DX[f.dir];
      const frontY = f.y + DY[f.dir];

      if (getCell(s.grid, leftY, leftX) === C.EMPTY || getCell(s.grid, leftY, leftX) === C.SOIL) {
        f.dir = leftDir;
        f.x = leftX; f.y = leftY;
      } else if (getCell(s.grid, frontY, frontX) === C.EMPTY || getCell(s.grid, frontY, frontX) === C.SOIL) {
        f.x = frontX; f.y = frontY;
      } else {
        f.dir = (f.dir + 1) % 4;
      }

      if (f.x === s.px && f.y === s.py) { s.alive = false; s.lives--; }
    }

    function draw() {
      const s = stateRef.current!;
      const DNEED = DIAMONDS_NEEDED[s.level] || 5;

      ctx.fillStyle = '#111';
      ctx.fillRect(0, 0, CW, CH + 50);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = s.grid[r][c];
          const sx = c * CELL;
          const sy = r * CELL;

          if (cell === C.WALL) {
            ctx.fillStyle = '#455a64';
            ctx.fillRect(sx, sy, CELL, CELL);
            ctx.strokeStyle = 'rgba(255,255,255,0.08)';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx, sy, CELL, CELL);
            ctx.fillStyle = '#546e7a';
            ctx.fillRect(sx + 2, sy + 2, CELL - 4, 4);
          } else if (cell === C.SOIL) {
            ctx.fillStyle = '#795548';
            ctx.fillRect(sx, sy, CELL, CELL);
            ctx.fillStyle = '#6d4c41';
            ctx.fillRect(sx + 2, sy + 2, CELL - 4, 2);
          } else if (cell === C.EMPTY) {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(sx, sy, CELL, CELL);
          } else if (cell === C.BOULDER) {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(sx, sy, CELL, CELL);
            ctx.beginPath();
            ctx.arc(sx + CELL / 2, sy + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2);
            ctx.fillStyle = '#90a4ae';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(sx + CELL / 2 - 4, sy + CELL / 2 - 4, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#cfd8dc';
            ctx.fill();
          } else if (cell === C.DIAMOND) {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(sx, sy, CELL, CELL);
            const t = Date.now() / 400;
            const shimmer = Math.abs(Math.sin(t + c + r));
            ctx.fillStyle = `hsl(${180 + shimmer * 60}, 100%, ${50 + shimmer * 20}%)`;
            ctx.beginPath();
            ctx.moveTo(sx + CELL / 2, sy + 4);
            ctx.lineTo(sx + CELL - 4, sy + CELL / 2);
            ctx.lineTo(sx + CELL / 2, sy + CELL - 4);
            ctx.lineTo(sx + 4, sy + CELL / 2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.stroke();
          } else if (cell === C.EXIT) {
            ctx.fillStyle = '#37474f';
            ctx.fillRect(sx, sy, CELL, CELL);
            ctx.fillStyle = '#ff5722';
            ctx.font = `${CELL - 8}px serif`;
            ctx.fillText('🚪', sx + 2, sy + CELL - 4);
            ctx.fillStyle = '#f4511e';
            ctx.font = 'bold 9px monospace';
            ctx.fillText(`${DNEED - s.collected}💎`, sx, sy + 10);
          } else if (cell === C.EXIT_OPEN) {
            ctx.fillStyle = '#1b5e20';
            ctx.fillRect(sx, sy, CELL, CELL);
            ctx.fillStyle = '#00e676';
            const t2 = Math.abs(Math.sin(Date.now() / 200));
            ctx.globalAlpha = 0.5 + t2 * 0.5;
            ctx.fillRect(sx + 4, sy + 4, CELL - 8, CELL - 8);
            ctx.globalAlpha = 1;
            ctx.fillStyle = 'white';
            ctx.font = `${CELL - 8}px serif`;
            ctx.fillText('🚪', sx + 2, sy + CELL - 4);
          } else if (cell === C.FIREFLY) {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(sx, sy, CELL, CELL);
            const t3 = Math.abs(Math.sin(Date.now() / 150));
            ctx.fillStyle = `rgba(255,${100 + t3 * 50 | 0},0,${0.7 + t3 * 0.3})`;
            ctx.beginPath();
            ctx.ellipse(sx + CELL / 2, sy + CELL / 2, CELL / 2 - 4, CELL / 3 - 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffeb3b';
            ctx.beginPath();
            ctx.arc(sx + CELL / 2, sy + CELL / 2, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Player (Daniel)
      drawDanielFace(ctx, s.px * CELL, s.py * CELL, CELL);

      // Fireflies
      for (const f of s.flies) {
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(f.x * CELL, f.y * CELL, CELL, CELL);
        const t = Math.abs(Math.sin(Date.now() / 150));
        ctx.fillStyle = `rgba(255,${80 + t * 60 | 0},0,0.85)`;
        ctx.beginPath();
        ctx.ellipse(f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, CELL / 2 - 4, CELL / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff176';
        ctx.beginPath();
        ctx.arc(f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // HUD
      ctx.fillStyle = '#111';
      ctx.fillRect(0, CH, CW, 50);
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(`💎 ${s.collected}/${DNEED}`, 10, CH + 30);
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`⭐ ${s.score}`, 170, CH + 30);
      ctx.fillStyle = '#ef5350';
      ctx.fillText(`❤️ ${s.lives}`, 340, CH + 30);
      ctx.fillStyle = '#b39ddb';
      ctx.fillText(`Level ${s.level + 1}/5`, 460, CH + 30);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '12px sans-serif';
      ctx.fillText('Arrow keys to move  Collect 💎  Reach 🚪', CW - 300, CH + 30);

      // Overlays
      if (!s.alive && s.lives <= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, CW, CH + 50);
        ctx.fillStyle = '#ef5350';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER!', CW / 2, CH / 2 - 20);
        ctx.fillStyle = 'white';
        ctx.font = '24px sans-serif';
        ctx.fillText(`Score: ${s.score}`, CW / 2, CH / 2 + 25);
        ctx.fillText('Press R to restart', CW / 2, CH / 2 + 60);
        ctx.textAlign = 'left';
      } else if (!s.alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, CW, CH + 50);
        ctx.fillStyle = '#ff9800';
        ctx.font = 'bold 40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Oops! Try Again!', CW / 2, CH / 2);
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.fillText('Press R to retry level', CW / 2, CH / 2 + 45);
        ctx.textAlign = 'left';
      } else if (s.won) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, CW, CH + 50);
        ctx.fillStyle = '#69f0ae';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        if (s.level >= LEVELS.length - 1) {
          ctx.fillText('YOU WIN! 🏆', CW / 2, CH / 2 - 20);
          ctx.fillStyle = 'gold';
          ctx.font = '26px sans-serif';
          ctx.fillText(`Amazing! Final Score: ${s.score}`, CW / 2, CH / 2 + 25);
        } else {
          ctx.fillText('Level Clear! ⭐', CW / 2, CH / 2 - 20);
          ctx.fillStyle = 'white';
          ctx.font = '22px sans-serif';
          ctx.fillText('Press N for Next Level', CW / 2, CH / 2 + 30);
        }
        ctx.textAlign = 'left';
      }
    }

    function loop(t: number) {
      const s = stateRef.current!;
      if (!s) { rafRef.current = requestAnimationFrame(loop); return; }

      // Physics
      if (t - lastPhysicsRef.current > 180) {
        physics();
        lastPhysicsRef.current = t;
      }

      // Fly movement
      if (t - lastFlyRef.current > 300) {
        for (const f of s.flies) moveFly(f);
        lastFlyRef.current = t;
      }

      // Player movement
      const k = keysRef.current;
      if (t - lastMoveRef.current > s.moveDelay && s.alive && !s.won) {
        if (k.has('ArrowLeft')) { tryMove(-1, 0); lastMoveRef.current = t; }
        else if (k.has('ArrowRight')) { tryMove(1, 0); lastMoveRef.current = t; }
        else if (k.has('ArrowUp')) { tryMove(0, -1); lastMoveRef.current = t; }
        else if (k.has('ArrowDown')) { tryMove(0, 1); lastMoveRef.current = t; }
      }

      draw();

      setUi({
        lives: s.lives, score: s.score, level: s.level + 1,
        collected: s.collected, total: s.totalDiamonds,
        alive: s.alive, won: s.won,
      });

      rafRef.current = requestAnimationFrame(loop);
    }

    const onKey = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      const s = stateRef.current!;

      if (e.code === 'KeyR') {
        if (!s.alive) {
          if (s.lives <= 0) initLevel(0, 3, 0);
          else initLevel(s.level, s.lives, s.score);
        }
      }
      if (e.code === 'KeyN' && s.won && s.level < LEVELS.length - 1) {
        initLevel(s.level + 1, s.lives, s.score);
      }
      e.preventDefault();
    };
    const offKey = (e: KeyboardEvent) => keysRef.current.delete(e.code);

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', offKey);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', offKey);
    };
  }, [initLevel]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: CW, marginBottom: 8, alignItems: 'center' }}>
        <button onClick={onBack} style={{ background: '#333', color: 'white', border: 'none', padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>← Menu</button>
        <span style={{ color: '#00e5ff', fontWeight: 900, fontSize: 20 }}>💎 Diamond Rush</span>
        <span style={{ color: '#ffd700', fontWeight: 700 }}>Score: {ui.score}</span>
      </div>
      <canvas ref={canvasRef} width={CW} height={CH + 50} style={{ border: '2px solid #333', display: 'block' }} />
    </div>
  );
}
