import React, { useEffect, useRef, useState, useCallback } from 'react';
import { loadDanielSheet, drawGameDaniel, isSheetLoaded } from '../../daniel-sprite';
import { useCanvasScale, isMobile, ControlsDpad } from '../../components/MobileControls';

// Cell types
const C = {
  EMPTY: 0, SOIL: 1, WALL: 2, BOULDER: 3,
  DIAMOND: 4, EXIT: 5, EXIT_OPEN: 6, FIREFLY: 7,
} as const;

const CELL = 44;
const COLS = 20;
const ROWS = 13;
const CW = COLS * CELL;       // 880
const CH = ROWS * CELL + 56;  // 572 + 56 = 628

// Diamonds needed per level
const DIAMONDS_NEEDED = [4, 6, 8, 10, 12];

// World themes: [wallTop, wallBot, soilTop, soilBot, bgTop, bgBot, accent]
const THEMES = [
  { name: 'Jungle',       wall: ['#2e7d32','#1b5e20'], soil: ['#6d4c41','#4e342e'], bg: ['#1a2e1a','#0d1a0d'], accent: '#69f0ae', gem: ['#ce93d8','#9c27b0'], gemGlow: '#e040fb' },
  { name: 'Crystal Cave', wall: ['#1565c0','#0d47a1'], soil: ['#546e7a','#37474f'], bg: ['#0a1628','#05080f'], accent: '#40c4ff', gem: ['#80deea','#00bcd4'], gemGlow: '#00e5ff' },
  { name: 'Ruins',        wall: ['#8d6e63','#6d4c41'], soil: ['#a1887f','#795548'], bg: ['#2c1810','#1a0d08'], accent: '#ffcc02', gem: ['#ffe082','#ffc107'], gemGlow: '#ffd740' },
  { name: 'Deep Cave',    wall: ['#37474f','#263238'], soil: ['#4e342e','#3e2723'], bg: ['#050a0f','#020508'], accent: '#ff6d00', gem: ['#f48fb1','#e91e63'], gemGlow: '#ff4081' },
  { name: 'Fire Realm',   wall: ['#b71c1c','#7f0000'], soil: ['#4e342e','#3e2723'], bg: ['#1a0505','#0d0000'], accent: '#ff6d00', gem: ['#ffe57a','#ffd600'], gemGlow: '#fff176' },
];

// 5 levels (each row MUST be exactly COLS=20 chars)
const RAW_LEVELS = [
  // Level 1: Jungle
  [
    '####################',
    '#P.......D.........#',
    '#..O..D............#',
    '#.....D....O.......#',
    '#...D..............#',
    '#.......O...D......#',
    '#..D...............#',
    '#........F.....O...#',
    '#...O..D...........#',
    '#..........D...O...#',
    '#...D..............#',
    '#.........D....E...#',
    '####################',
  ],
  // Level 2: Crystal Cave
  [
    '####################',
    '#P......D..........#',
    '#.O.....D...O......#',
    '#.....D....D.......#',
    '#.O.........O......#',
    '#....D..D..........#',
    '#.....O....O.......#',
    '#...D..F.....F.....#',
    '#.O.....D..........#',
    '#.....O....D.......#',
    '#....D.....O...D...#',
    '#..D.......D...E...#',
    '####################',
  ],
  // Level 3: Ruins
  [
    '####################',
    '#P.D...............#',
    '#..O....D..O.......#',
    '#.....D....D.......#',
    '#.O.....O..........#',
    '#...D...D......D...#',
    '#......O....O......#',
    '#.D....F....F...D..#',
    '#...O......O.......#',
    '#.....D..D.........#',
    '#..O......O....D...#',
    '#..D...D...D...E...#',
    '####################',
  ],
  // Level 4: Deep Cave
  [
    '####################',
    '#P......D..........#',
    '#.O..D.....O.......#',
    '#....O....D........#',
    '#..D.....O.....D...#',
    '#......D....O......#',
    '#.O.D...F..D...O...#',
    '#.....D.....F......#',
    '#....O....O........#',
    '#..D.....D.........#',
    '#......O.......D...#',
    '#.D..D.....D...E...#',
    '####################',
  ],
  // Level 5: Fire Realm
  [
    '####################',
    '#P...D...D.........#',
    '#.O.......O....D...#',
    '#....D.D...........#',
    '#.O.....O......O...#',
    '#...D......D.......#',
    '#.....O..F...F.D...#',
    '#..D......O........#',
    '#......D.....O.....#',
    '#.O..D.....D.......#',
    '#.......O......O...#',
    '#..D..D..D.D...E...#',
    '####################',
  ],
];

interface FlyState { x: number; y: number; dir: number; animFrame: number; }

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
  combo: number;
  comboTimer: number;
  level: number;
  timeLeft: number;
  timerInterval: number;
  particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string; }>;
  moveDelay: number;
  animFrame: number;
  walkDir: number;
  lastMoved: number;
}

function parseLevel(rows: string[]): { grid: number[][]; px: number; py: number; exX: number; exY: number; totalDiamonds: number; flies: FlyState[] } {
  const grid: number[][] = [];
  let px = 1, py = 1, exX = 18, exY = 11;
  let totalDiamonds = 0;
  const flies: FlyState[] = [];

  for (let r = 0; r < ROWS; r++) {
    grid[r] = [];
    const row = rows[r] || '';
    for (let c = 0; c < COLS; c++) {
      const ch = row[c] ?? '#';
      if (ch === '#') grid[r][c] = C.WALL;
      else if (ch === 'O') grid[r][c] = C.BOULDER;
      else if (ch === 'D') { grid[r][c] = C.DIAMOND; totalDiamonds++; }
      else if (ch === 'P') { grid[r][c] = C.EMPTY; px = c; py = r; }
      else if (ch === 'E') { grid[r][c] = C.EXIT; exX = c; exY = r; }
      else if (ch === 'F') {
        grid[r][c] = C.FIREFLY;
        flies.push({ x: c, y: r, dir: 0, animFrame: 0 });
      }
      else if (ch === '.') grid[r][c] = C.SOIL;
      else grid[r][c] = C.EMPTY;
    }
  }
  return { grid, px, py, exX, exY, totalDiamonds, flies };
}

// ──────────────────────────────────────────────
// Drawing helpers
// ──────────────────────────────────────────────

function drawWall(ctx: CanvasRenderingContext2D, sx: number, sy: number, theme: typeof THEMES[0]) {
  const g = ctx.createLinearGradient(sx, sy, sx, sy + CELL);
  g.addColorStop(0, theme.wall[0]);
  g.addColorStop(1, theme.wall[1]);
  ctx.fillStyle = g;
  ctx.fillRect(sx, sy, CELL, CELL);
  // Brick lines
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  const brickH = CELL / 2;
  for (let row = 0; row < 2; row++) {
    const offset = row % 2 === 0 ? 0 : CELL * 0.3;
    const by = sy + row * brickH;
    ctx.strokeRect(sx + offset, by, CELL * 0.6, brickH);
    ctx.strokeRect(sx + offset + CELL * 0.6, by, CELL * 0.4, brickH);
  }
  // Highlight top edge
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(sx, sy, CELL, 3);
}

function drawSoil(ctx: CanvasRenderingContext2D, sx: number, sy: number, theme: typeof THEMES[0]) {
  const g = ctx.createLinearGradient(sx, sy, sx, sy + CELL);
  g.addColorStop(0, theme.soil[0]);
  g.addColorStop(1, theme.soil[1]);
  ctx.fillStyle = g;
  ctx.fillRect(sx, sy, CELL, CELL);
  // Texture dots
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  const dotPositions = [[8,8],[20,18],[32,10],[14,30],[28,28],[6,22],[38,20],[10,38]];
  for (const [dx, dy] of dotPositions) {
    ctx.beginPath();
    ctx.arc(sx + dx, sy + dy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Small rock
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(sx + 30, sy + 32, 5, 3, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBoulder(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
  const cx = sx + CELL / 2;
  const cy = sy + CELL / 2;
  const r = CELL / 2 - 4;
  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx + 3, cy + 3, r, r * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();
  // Main rock
  const rg = ctx.createRadialGradient(cx - 6, cy - 6, 2, cx, cy, r);
  rg.addColorStop(0, '#cfd8dc');
  rg.addColorStop(0.5, '#90a4ae');
  rg.addColorStop(1, '#546e7a');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Crack lines
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 5, cy - 8); ctx.lineTo(cx + 2, cy + 4);
  ctx.moveTo(cx + 6, cy - 6); ctx.lineTo(cx - 2, cy + 7);
  ctx.stroke();
  // Highlight
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.ellipse(cx - 6, cy - 6, 6, 4, -0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawDiamond(ctx: CanvasRenderingContext2D, sx: number, sy: number, theme: typeof THEMES[0], t: number) {
  const cx = sx + CELL / 2;
  const cy = sy + CELL / 2;
  const bob = Math.sin(t * 3) * 2;
  const spin = Math.abs(Math.sin(t * 2));

  // Glow
  const glow = ctx.createRadialGradient(cx, cy + bob, 2, cx, cy + bob, 18);
  glow.addColorStop(0, theme.gemGlow + 'aa');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 4, sy - 4, CELL + 8, CELL + 8);

  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.scale(1 + spin * 0.08, 1);

  // Gem body
  const g = ctx.createLinearGradient(-12, -14, 12, 14);
  g.addColorStop(0, theme.gem[0]);
  g.addColorStop(0.5, theme.gemGlow);
  g.addColorStop(1, theme.gem[1]);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -14);   // top
  ctx.lineTo(12, -3);   // upper right
  ctx.lineTo(12, 4);    // lower right
  ctx.lineTo(0, 14);    // bottom
  ctx.lineTo(-12, 4);   // lower left
  ctx.lineTo(-12, -3);  // upper left
  ctx.closePath();
  ctx.fill();
  // Facet lines
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -14); ctx.lineTo(0, 14);
  ctx.moveTo(-12, 0); ctx.lineTo(12, 0);
  ctx.stroke();
  // Shine
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath();
  ctx.moveTo(-4, -12); ctx.lineTo(4, -8); ctx.lineTo(0, -4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawExit(ctx: CanvasRenderingContext2D, sx: number, sy: number, open: boolean, t: number) {
  // Door frame
  ctx.fillStyle = open ? '#1b5e20' : '#4e342e';
  ctx.fillRect(sx + 4, sy + 4, CELL - 8, CELL - 4);
  // Door arch
  ctx.fillStyle = open ? '#2e7d32' : '#6d4c41';
  ctx.beginPath();
  ctx.arc(sx + CELL / 2, sy + 14, 14, Math.PI, 0);
  ctx.lineTo(sx + CELL - 10, sy + CELL - 4);
  ctx.lineTo(sx + 10, sy + CELL - 4);
  ctx.closePath();
  ctx.fill();

  if (open) {
    // Glow when open
    const pulse = 0.5 + Math.abs(Math.sin(t * 4)) * 0.5;
    ctx.fillStyle = `rgba(105,240,174,${pulse * 0.6})`;
    ctx.beginPath();
    ctx.arc(sx + CELL / 2, sy + 14, 14, Math.PI, 0);
    ctx.lineTo(sx + CELL - 10, sy + CELL - 4);
    ctx.lineTo(sx + 10, sy + CELL - 4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GO!', sx + CELL / 2, sy + CELL - 10);
    ctx.textAlign = 'left';
  } else {
    // Lock icon
    ctx.fillStyle = '#ffcc02';
    ctx.fillRect(sx + CELL / 2 - 5, sy + CELL / 2 - 2, 10, 9);
    ctx.strokeStyle = '#ffcc02';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(sx + CELL / 2, sy + CELL / 2 - 2, 5, Math.PI, 0);
    ctx.stroke();
  }
}

function drawFirefly(ctx: CanvasRenderingContext2D, sx: number, sy: number, t: number, animFrame: number) {
  const cx = sx + CELL / 2;
  const cy = sy + CELL / 2;
  const glow = 0.4 + Math.abs(Math.sin(t * 5)) * 0.6;
  const wingFlap = Math.sin(animFrame * 0.4) * 5;

  // Glow aura
  const glowG = ctx.createRadialGradient(cx, cy, 2, cx, cy, 20);
  glowG.addColorStop(0, `rgba(255,140,0,${glow})`);
  glowG.addColorStop(1, 'transparent');
  ctx.fillStyle = glowG;
  ctx.beginPath();
  ctx.arc(cx, cy, 20, 0, Math.PI * 2);
  ctx.fill();

  // Wings
  ctx.fillStyle = `rgba(255,200,100,${0.5 + glow * 0.3})`;
  ctx.beginPath();
  ctx.ellipse(cx - 10, cy - 4 + wingFlap, 10, 5, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 10, cy - 4 - wingFlap, 10, 5, 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Body
  const bodyG = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 9);
  bodyG.addColorStop(0, '#ffee58');
  bodyG.addColorStop(0.6, '#ff6f00');
  bodyG.addColorStop(1, '#bf360c');
  ctx.fillStyle = bodyG;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 9, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Eyes
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(cx + 5, cy - 2, 2, 0, Math.PI * 2);
  ctx.arc(cx - 5, cy - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.arc(cx + 6, cy - 3, 1, 0, Math.PI * 2);
  ctx.fill();
}

function drawDanielExplorer(ctx: CanvasRenderingContext2D, sx: number, sy: number, facingRight: boolean, walkFrame: number) {
  ctx.save();
  ctx.translate(sx + CELL / 2, sy + CELL / 2);
  if (!facingRight) ctx.scale(-1, 1);

  const leg = Math.sin(walkFrame * 0.4) * 5;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 12, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs / boots
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(-8, 5, 6, 12 + leg | 0);
  ctx.fillRect(2, 5, 6, 12 - leg | 0);
  // Boot shine
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(-8, 14, 6, 3);
  ctx.fillRect(2, 14, 6, 3);

  // Body — adventure jacket
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(-9, -8, 18, 14);
  // Jacket lapels
  ctx.fillStyle = '#6d4c41';
  ctx.beginPath();
  ctx.moveTo(-3, -8); ctx.lineTo(0, -2); ctx.lineTo(-9, -8);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(3, -8); ctx.lineTo(0, -2); ctx.lineTo(9, -8);
  ctx.fill();
  // Belt
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(-9, 3, 18, 3);
  ctx.fillStyle = '#ffcc02';
  ctx.fillRect(-2, 2, 4, 5);

  // Arms
  const armSwing = Math.sin(walkFrame * 0.4) * 5;
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(-13, -7 + armSwing | 0, 4, 13);
  ctx.fillRect(9, -7 - armSwing | 0, 4, 13);
  // Gloves
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(-13, 4 + armSwing | 0, 4, 4);
  ctx.fillRect(9, 4 - armSwing | 0, 4, 4);

  // Head
  ctx.fillStyle = '#ffcc80';
  ctx.fillRect(-8, -22, 16, 14);
  // Hair
  ctx.fillStyle = '#5d4037';
  ctx.fillRect(-8, -22, 16, 4);
  ctx.fillRect(-8, -22, 3, 9);

  // Explorer hat!
  ctx.fillStyle = '#6d4c41';
  ctx.fillRect(-11, -26, 22, 5); // brim
  ctx.fillStyle = '#8d6e63';
  ctx.fillRect(-7, -32, 14, 8); // crown
  ctx.fillStyle = '#4e342e';
  ctx.fillRect(-7, -26, 14, 2); // hat band
  ctx.fillStyle = '#ffcc02';
  ctx.fillRect(0, -26, 4, 2); // hat pin

  // Eyes
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-5, -17, 3, 3);
  ctx.fillRect(2, -17, 3, 3);
  // Eye whites
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(-4, -17, 1, 1);
  ctx.fillRect(3, -17, 1, 1);
  // Smile
  ctx.fillStyle = '#c62828';
  ctx.fillRect(-3, -12, 6, 2);

  ctx.restore();
}

export default function DiamondRush({ onBack }: { onBack: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<State | null>(null);
  const keysRef = useRef(new Set<string>());
  const rafRef = useRef(0);
  const lastPhysicsRef = useRef(0);
  const lastFlyRef = useRef(0);
  const lastMoveRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const faceRight = useRef(true);
  const walkFrame = useRef(0);
  const [ui, setUi] = useState({ lives: 3, score: 0, level: 1, collected: 0, need: 4, timeLeft: 120, alive: true, won: false, total: 0 });

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const initLevel = useCallback((lvlIdx: number, lives: number, score: number) => {
    stopTimer();
    const rows = RAW_LEVELS[Math.min(lvlIdx, RAW_LEVELS.length - 1)];
    const { grid, px, py, exX, exY, totalDiamonds, flies } = parseLevel(rows);
    const timeLeft = 90 + (4 - Math.min(lvlIdx, 4)) * 30; // 90-210s

    stateRef.current = {
      grid, px, py, exX, exY, totalDiamonds,
      collected: 0, flies, alive: true, won: false,
      lives, score, combo: 0, comboTimer: 0,
      level: lvlIdx, timeLeft, timerInterval: 0,
      particles: [], moveDelay: 130,
      animFrame: 0, walkDir: 1, lastMoved: 0,
    };

    timerRef.current = setInterval(() => {
      if (!stateRef.current || !stateRef.current.alive || stateRef.current.won) return;
      stateRef.current.timeLeft--;
      if (stateRef.current.timeLeft <= 0) {
        stateRef.current.alive = false;
        stateRef.current.lives--;
      }
    }, 1000);
  }, [stopTimer]);

  useEffect(() => {
    loadDanielSheet();
    initLevel(0, 3, 0);
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;

    const getCell = (g: number[][], r: number, c: number): number => {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return C.WALL;
      return g[r][c];
    };
    const setCell = (g: number[][], r: number, c: number, v: number) => {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
      g[r][c] = v;
    };

    function spawnParticles(s: State, x: number, y: number, color: string, count = 8) {
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        s.particles.push({
          x: x * CELL + CELL / 2, y: y * CELL + CELL / 2,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          life: 0.8 + Math.random() * 0.4, color,
        });
      }
    }

    function tryMove(dx: number, dy: number) {
      const s = stateRef.current!;
      if (!s.alive || s.won) return;
      const nx = s.px + dx;
      const ny = s.py + dy;
      const cell = getCell(s.grid, ny, nx);
      const need = DIAMONDS_NEEDED[s.level] || 4;

      if (cell === C.WALL) return;
      if (cell === C.FIREFLY) { s.alive = false; s.lives--; return; }
      if (cell === C.EXIT && s.collected < need) return;
      if (cell === C.BOULDER && dy === 0) {
        const bx2 = nx + dx;
        if (getCell(s.grid, ny, bx2) === C.EMPTY) {
          setCell(s.grid, ny, bx2, C.BOULDER);
          setCell(s.grid, ny, nx, C.EMPTY);
        } else return;
      }
      if ((cell === C.EXIT_OPEN) || (cell === C.EXIT && s.collected >= need)) {
        s.score += s.collected * 150 + s.timeLeft * 10 + 500;
        s.won = true;
        stopTimer();
        return;
      }

      if (cell === C.DIAMOND) {
        s.collected++;
        s.combo++;
        s.comboTimer = 120;
        const bonusScore = s.combo > 1 ? s.combo * 100 : 50;
        s.score += bonusScore;
        const theme = THEMES[Math.min(s.level, THEMES.length - 1)];
        spawnParticles(s, nx, ny, theme.gemGlow, 12);
        if (s.collected >= need) {
          setCell(s.grid, s.exY, s.exX, C.EXIT_OPEN);
          spawnParticles(s, s.exX, s.exY, '#69f0ae', 16);
        }
      }

      setCell(s.grid, s.py, s.px, C.EMPTY);
      s.px = nx; s.py = ny;
      setCell(s.grid, ny, nx, C.EMPTY);

      if (dx > 0) faceRight.current = true;
      if (dx < 0) faceRight.current = false;
      walkFrame.current++;
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
            if (s.px === c && s.py === r + 1) { s.alive = false; s.lives--; }
          } else if (below === C.BOULDER || below === C.DIAMOND) {
            if (cell === C.BOULDER) {
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
    }

    function moveFly(f: FlyState) {
      const s = stateRef.current!;
      f.animFrame++;
      const left = (f.dir + 3) % 4;
      const dx = [1, 0, -1, 0];
      const dy = [0, 1, 0, -1];
      const lx = f.x + dx[left];
      const ly = f.y + dy[left];
      const fx = f.x + dx[f.dir];
      const fy = f.y + dy[f.dir];

      const canMove = (x: number, y: number) => {
        const c = getCell(s.grid, y, x);
        return c === C.EMPTY || c === C.SOIL;
      };

      if (canMove(lx, ly)) { f.dir = left; f.x = lx; f.y = ly; }
      else if (canMove(fx, fy)) { f.x = fx; f.y = fy; }
      else { f.dir = (f.dir + 1) % 4; }

      if (f.x === s.px && f.y === s.py) { s.alive = false; s.lives--; }
    }

    function draw(t: number) {
      const s = stateRef.current!;
      const theme = THEMES[Math.min(s.level, THEMES.length - 1)];
      const need = DIAMONDS_NEEDED[s.level] || 4;
      const ts = t / 1000;

      // BG gradient
      const bg = ctx.createLinearGradient(0, 0, 0, ROWS * CELL);
      bg.addColorStop(0, theme.bg[0]);
      bg.addColorStop(1, theme.bg[1]);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, CW, CH);

      // Draw grid
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = s.grid[r][c];
          const sx = c * CELL;
          const sy = r * CELL;

          if (cell === C.WALL) { drawWall(ctx, sx, sy, theme); }
          else if (cell === C.SOIL) { drawSoil(ctx, sx, sy, theme); }
          else if (cell === C.BOULDER) { drawBoulder(ctx, sx, sy); }
          else if (cell === C.DIAMOND) { drawDiamond(ctx, sx, sy, theme, ts + c * 0.3 + r * 0.2); }
          else if (cell === C.EXIT) { drawExit(ctx, sx, sy, false, ts); }
          else if (cell === C.EXIT_OPEN) { drawExit(ctx, sx, sy, true, ts); }
          else if (cell === C.FIREFLY) {
            const fly = s.flies.find(f => f.x === c && f.y === r);
            drawFirefly(ctx, sx, sy, ts, fly?.animFrame ?? 0);
          }
        }
      }

      // Fireflies (tracked positions may differ from grid)
      for (const f of s.flies) {
        if (s.grid[f.y]?.[f.x] !== C.FIREFLY) {
          drawFirefly(ctx, f.x * CELL, f.y * CELL, ts, f.animFrame);
        }
      }

      // Particles
      for (const p of s.particles) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.globalAlpha = 1;

      // Player
      if (isSheetLoaded()) {
        // Diamond Rush Daniel (index 1) — explorer hat + lantern
        drawGameDaniel(ctx, 1, s.px * CELL - 4, s.py * CELL - 6, CELL + 8, CELL + 10, !faceRight.current);
      } else {
        drawDanielExplorer(ctx, s.px * CELL, s.py * CELL, faceRight.current, walkFrame.current);
      }

      // ── HUD ──
      const hudY = ROWS * CELL;
      // HUD background
      const hudG = ctx.createLinearGradient(0, hudY, 0, CH);
      hudG.addColorStop(0, '#111');
      hudG.addColorStop(1, '#1a1a1a');
      ctx.fillStyle = hudG;
      ctx.fillRect(0, hudY, CW, 56);
      ctx.fillStyle = theme.accent + '55';
      ctx.fillRect(0, hudY, CW, 2);

      // Lives
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < s.lives ? '#ef5350' : '#333';
        ctx.font = '20px serif';
        ctx.fillText('❤️', 8 + i * 28, hudY + 26);
      }

      // Diamonds collected
      ctx.font = 'bold 15px monospace';
      ctx.fillStyle = theme.gemGlow;
      ctx.fillText(`💎 ${s.collected}/${need}`, 100, hudY + 26);

      // Score
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`⭐ ${s.score}`, 220, hudY + 26);

      // Combo
      if (s.comboTimer > 0 && s.combo > 1) {
        ctx.fillStyle = `rgba(255,100,0,${s.comboTimer / 120})`;
        ctx.font = `bold ${14 + Math.min(s.combo, 5)}px monospace`;
        ctx.fillText(`x${s.combo} COMBO!`, 350, hudY + 26);
      }

      // Timer
      const timeColor = s.timeLeft > 30 ? '#80cbc4' : '#ef5350';
      ctx.fillStyle = timeColor;
      ctx.font = 'bold 15px monospace';
      const mins = Math.floor(s.timeLeft / 60);
      const secs = s.timeLeft % 60;
      ctx.fillText(`⏱ ${mins}:${secs.toString().padStart(2, '0')}`, CW - 160, hudY + 26);

      // Level / World
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '13px monospace';
      ctx.fillText(`${theme.name} — Level ${s.level + 1}/5`, CW - 160, hudY + 48);

      // Controls hint
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.font = '11px sans-serif';
      ctx.fillText('Arrow keys to move · Dig soil · Collect 💎 · Reach the door!', 8, hudY + 50);

      // ── Overlays ──
      if (!s.alive && s.lives <= 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#ef5350';
        ctx.font = 'bold 54px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CW / 2, CH / 2 - 30);
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 26px monospace';
        ctx.fillText(`Final Score: ${s.score}`, CW / 2, CH / 2 + 20);
        ctx.fillStyle = 'white';
        ctx.font = '20px sans-serif';
        ctx.fillText('Press R to play again', CW / 2, CH / 2 + 62);
        ctx.textAlign = 'left';
      } else if (!s.alive) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#ff9800';
        ctx.font = 'bold 44px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(s.timeLeft <= 0 ? '⏱ TIME UP!' : 'CRUSHED! 💀', CW / 2, CH / 2 - 20);
        ctx.fillStyle = 'white';
        ctx.font = '22px sans-serif';
        ctx.fillText('Press R to retry level', CW / 2, CH / 2 + 30);
        ctx.textAlign = 'left';
      } else if (s.won) {
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(0, 0, CW, CH);
        ctx.fillStyle = '#69f0ae';
        ctx.font = 'bold 48px sans-serif';
        ctx.textAlign = 'center';
        if (s.level >= RAW_LEVELS.length - 1) {
          ctx.fillText('🏆 YOU WIN! 🏆', CW / 2, CH / 2 - 40);
          ctx.fillStyle = '#ffd700';
          ctx.font = 'bold 28px monospace';
          ctx.fillText(`CHAMPION SCORE: ${s.score}`, CW / 2, CH / 2 + 10);
          ctx.fillStyle = '#fff';
          ctx.font = '22px sans-serif';
          ctx.fillText('Daniel conquered all 5 worlds! 🎉', CW / 2, CH / 2 + 55);
        } else {
          ctx.fillText(`🌟 ${theme.name} Clear!`, CW / 2, CH / 2 - 30);
          ctx.fillStyle = '#ffd700';
          ctx.font = 'bold 22px monospace';
          ctx.fillText(`Score: ${s.score}  Time Bonus: +${s.timeLeft * 10}`, CW / 2, CH / 2 + 20);
          ctx.fillStyle = 'white';
          ctx.font = '22px sans-serif';
          ctx.fillText('Press N for Next World!', CW / 2, CH / 2 + 60);
        }
        ctx.textAlign = 'left';
      }
    }

    function loop(t: number) {
      const s = stateRef.current!;
      if (!s) { rafRef.current = requestAnimationFrame(loop); return; }

      s.animFrame++;
      if (s.comboTimer > 0) s.comboTimer--;

      // Physics (gravity for boulders/diamonds)
      if (t - lastPhysicsRef.current > 160) {
        physics();
        lastPhysicsRef.current = t;
      }

      // Firefly movement
      if (t - lastFlyRef.current > 320) {
        for (const f of s.flies) moveFly(f);
        lastFlyRef.current = t;
      }

      // Player input
      const k = keysRef.current;
      if (t - lastMoveRef.current > s.moveDelay && s.alive && !s.won) {
        if (k.has('ArrowLeft')) { tryMove(-1, 0); lastMoveRef.current = t; }
        else if (k.has('ArrowRight')) { tryMove(1, 0); lastMoveRef.current = t; }
        else if (k.has('ArrowUp')) { tryMove(0, -1); lastMoveRef.current = t; }
        else if (k.has('ArrowDown')) { tryMove(0, 1); lastMoveRef.current = t; }
      }

      // Particles
      s.particles = s.particles.filter(p => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.1; p.life -= 0.035;
        p.vx *= 0.96; return p.life > 0;
      });

      draw(t);

      setUi({
        lives: s.lives, score: s.score, level: s.level + 1,
        collected: s.collected, need: DIAMONDS_NEEDED[s.level] || 4,
        timeLeft: s.timeLeft, alive: s.alive, won: s.won,
        total: s.totalDiamonds,
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
      if (e.code === 'KeyN' && s.won && s.level < RAW_LEVELS.length - 1) {
        initLevel(s.level + 1, s.lives, s.score);
      }
      if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space'].includes(e.code)) e.preventDefault();
    };
    const offKey = (e: KeyboardEvent) => keysRef.current.delete(e.code);

    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', offKey);
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      stopTimer();
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', offKey);
    };
  }, [initLevel, stopTimer]);

  const scale = useCanvasScale(CW, CH);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#050505', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: scale < 1 ? 'flex-start' : 'center', paddingTop: scale < 1 ? 8 : 0, boxSizing: 'border-box' as const }}>
      <button onClick={onBack} style={{ position: 'fixed', top: 10, left: 10, zIndex: 200, background: 'rgba(0,0,0,0.82)', color: '#fff', border: '2px solid rgba(255,255,255,0.4)', borderRadius: 12, padding: '10px 18px', cursor: 'pointer', fontSize: 16, fontWeight: 700 }}>← Menu</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: CW * scale, marginBottom: 8, paddingLeft: 8 }}>
        <span style={{ color: '#00e5ff', fontWeight: 900, fontSize: 18 }}>💎 Diamond Rush</span>
        <span style={{ color: '#ffd700', fontWeight: 700 }}>Score: {ui.score}</span>
      </div>
      <div style={{ width: CW * scale, height: CH * scale, overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: CW, height: CH }}>
          <canvas ref={canvasRef} width={CW} height={CH} style={{ border: '2px solid #1a1a3e', display: 'block' }} />
        </div>
      </div>
      {isMobile() && <ControlsDpad />}
    </div>
  );
}
