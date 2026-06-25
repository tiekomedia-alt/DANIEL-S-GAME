/**
 * Canonical tile ID enum for Diamond Rush.
 * Superset of the original C constants — backwards compatible with existing grid data.
 * New tile types (RED_DIAMOND, PURPLE_DIAMOND, CHECKPOINT, hazards, items) are
 * ready for Level 2 integration without touching existing draw/physics code.
 */
export const T = {
  // ── Existing (must stay at original values for backward compat) ──
  EMPTY:          0,
  SOIL:           1,
  WALL:           2,
  BOULDER:        3,
  DIAMOND:        4,   // generic collectible diamond
  EXIT:           5,
  EXIT_OPEN:      6,
  FIREFLY:        7,
  // ── New: Primary objectives ──
  RED_DIAMOND:    8,   // required to unlock EXIT (chat: 'R')
  PURPLE_DIAMOND: 9,   // currency for health upgrades (char: 'G')
  // ── New: Checkpoint ──
  CHECKPOINT:     10,  // restores player here on death (char: 'K')
  // ── New: Hazards ──
  FIRE_TRAP:      11,  // static hazard — kills on contact (char: 'X')
  SPEAR_TRAP:     12,  // directional hazard — activates on trigger (char: '^')
  // ── New: Enemies ──
  SNAKE:          13,  // enemy AI — moves on predictable horizontal path (char: 'S')
  SPIDER:         14,  // enemy AI — patrols platforms vertically (char: 'A')
  // ── New: Items ──
  HAMMER:         15,  // breaks boulders in one hit (char: 'H')
  COMPASS:        16,  // reveals hidden gems on minimap (char: 'C')
  GRAPPLE:        17,  // lets player swing across gaps (char: 'L')
} as const;

export type TileId = typeof T[keyof typeof T];

/** Map from level-string character → TileId */
export const CHAR_TO_TILE: Readonly<Record<string, TileId>> = {
  '#': T.WALL,
  '.': T.SOIL,
  ' ': T.EMPTY,
  'O': T.BOULDER,
  'D': T.DIAMOND,
  'R': T.RED_DIAMOND,
  'G': T.PURPLE_DIAMOND,
  'E': T.EXIT,
  'F': T.FIREFLY,
  'K': T.CHECKPOINT,
  'X': T.FIRE_TRAP,
  '^': T.SPEAR_TRAP,
  'S': T.SNAKE,
  'A': T.SPIDER,
  'H': T.HAMMER,
  'C': T.COMPASS,
  'L': T.GRAPPLE,
} as const;

/**
 * Declarative level definition — the authoritative source of truth for a level.
 * map rows must each be exactly `cols` characters wide.
 */
export interface LevelDef {
  name:           string;
  theme:          number;     // index into THEMES array
  map:            string[];   // row strings; 'P' = player start, 'E' = exit
  /** Number of RED_DIAMONDs that must be collected to open the EXIT */
  redGoal:        number;
  /** Seconds before the level times out (0 = no limit) */
  timeLimit:      number;
}

export interface Checkpoint {
  col: number;
  row: number;
}

/** Runtime state derived from a LevelDef after parsing */
export interface LevelState {
  grid:              TileId[][];
  playerCol:         number;
  playerRow:         number;
  exitCol:           number;
  exitRow:           number;
  redTotal:          number;
  redCollected:      number;
  purpleTotal:       number;
  purpleCollected:   number;
  checkpoints:       Checkpoint[];
  lastCheckpoint:    Checkpoint | null;
}

type FlyState = { x: number; y: number; dir: number; animFrame: number };

/** Parse a LevelDef string map into a runtime LevelState + firefly list. */
export function parseLevelDef(
  def: LevelDef,
  cols: number,
  rows: number,
): LevelState & { flies: FlyState[]; totalDiamonds: number } {
  const grid: TileId[][] = [];
  let playerCol = 1, playerRow = 1, exitCol = cols - 2, exitRow = rows - 2;
  let redTotal = 0, purpleTotal = 0, totalDiamonds = 0;
  const checkpoints: Checkpoint[] = [];
  const flies: FlyState[] = [];

  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    const row = def.map[r] ?? '';
    for (let c = 0; c < cols; c++) {
      const ch = row[c] ?? '#';
      let tile: TileId = (CHAR_TO_TILE[ch] as TileId | undefined) ?? T.WALL;

      if (ch === 'P') { tile = T.EMPTY; playerCol = c; playerRow = r; }
      if (ch === 'E') { exitCol = c; exitRow = r; }
      if (ch === 'F') { flies.push({ x: c, y: r, dir: 0, animFrame: 0 }); }

      if (tile === T.RED_DIAMOND)    { redTotal++;    totalDiamonds++; }
      if (tile === T.PURPLE_DIAMOND) { purpleTotal++; }
      if (tile === T.DIAMOND)        { totalDiamonds++; }
      if (tile === T.CHECKPOINT)     { checkpoints.push({ col: c, row: r }); }

      grid[r][c] = tile;
    }
  }

  return {
    grid, playerCol, playerRow, exitCol, exitRow,
    redTotal, redCollected: 0, purpleTotal, purpleCollected: 0,
    checkpoints, lastCheckpoint: null, flies, totalDiamonds,
  };
}
