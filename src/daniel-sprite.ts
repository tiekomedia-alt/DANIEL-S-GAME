/**
 * Daniel character sheet sprite utility.
 * Image must be placed at: public/daniel-sheet.jpg
 *
 * Sheet layout (approximate proportions):
 *  ┌─────────────────────────────────────────────────────┐
 *  │  Portrait │  Full body views  │  Pixel sprite sheet  │  ← 0-45%
 *  ├─────────────────────────────────────────────────────┤
 *  │  "DANIEL IN 5 GAMES" banner                         │  ← 45-48%
 *  │  [Minecraft] [Diamond] [Space] [Racing] [Platform]  │  ← 48-75%
 *  ├─────────────────────────────────────────────────────┤
 *  │  8-dir sprites │ Icons │ Banner │ Loading screen     │  ← 75-100%
 *  └─────────────────────────────────────────────────────┘
 */

let sheet: HTMLImageElement | null = null;
let loaded = false;

export function loadDanielSheet(): void {
  if (loaded) return;
  const img = new Image();
  img.onload = () => { sheet = img; loaded = true; };
  img.onerror = () => console.warn('daniel-sheet.jpg.png not found in /public — using drawn character');
  img.src = '/daniel-sheet.jpg.png';
}

export function isSheetLoaded(): boolean { return loaded; }

// ── Game-specific full-body art ──────────────────────────────────────────────
// The "DANIEL IN 5 GAMES" row: 5 equal columns, rows y≈48%→74%
// 0=Minecraft, 1=Diamond Rush, 2=Space Defender, 3=Road Racer, 4=Platformer

export function drawGameDaniel(
  ctx: CanvasRenderingContext2D,
  gameIndex: 0 | 1 | 2 | 3 | 4,
  dx: number, dy: number,
  dw: number, dh: number,
  flip = false
): void {
  if (!sheet) return;
  const sw = sheet.width;
  const sh = sheet.height;

  const panelY    = sh * 0.475;
  const panelH    = sh * 0.265;
  const colW      = sw / 5;
  const sx        = gameIndex * colW;

  ctx.save();
  if (flip) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, sx, panelY, colW, panelH, 0, 0, dw, dh);
  } else {
    ctx.drawImage(sheet, sx, panelY, colW, panelH, dx, dy, dw, dh);
  }
  ctx.restore();
}

// ── Face / portrait crop ─────────────────────────────────────────────────────
// Top-left portrait area, clipped to a circle (for cockpit windows etc.)

export function drawDanielFaceCircle(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number
): void {
  if (!sheet) return;
  const sw = sheet.width;
  const sh = sheet.height;
  // Portrait occupies roughly left 26%, top 44%
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(
    sheet,
    sw * 0.02, sh * 0.04, sw * 0.24, sh * 0.44,
    cx - radius, cy - radius, radius * 2, radius * 2
  );
  ctx.restore();
}

// ── Pixel sprite sheet frames ────────────────────────────────────────────────
// Top-right pixel art block: x≈65%→100%, y≈2%→44%
// 4 rows: IDLE(0), RUN(1), JUMP(2), VICTORY(3) — each ~4 frames

const SPRITE_ROWS = ['idle', 'run', 'jump', 'victory'] as const;
export type SpriteRow = typeof SPRITE_ROWS[number];

export function drawPixelSprite(
  ctx: CanvasRenderingContext2D,
  row: SpriteRow,
  frame: number,        // 0-3
  dx: number, dy: number,
  dw: number, dh: number,
  flip = false
): void {
  if (!sheet) return;
  const sw = sheet.width;
  const sh = sheet.height;

  const sheetX = sw * 0.655;
  const sheetW = sw * 0.345;
  const sheetY = sh * 0.025;
  const sheetH = sh * 0.415;

  const rowIndex  = SPRITE_ROWS.indexOf(row);
  const frameW    = sheetW / 4;
  const frameH    = sheetH / 4;

  const sx = sheetX + (frame % 4) * frameW;
  const sy = sheetY + rowIndex * frameH;

  ctx.save();
  if (flip) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, sx, sy, frameW, frameH, 0, 0, dw, dh);
  } else {
    ctx.drawImage(sheet, sx, sy, frameW, frameH, dx, dy, dw, dh);
  }
  ctx.restore();
}
