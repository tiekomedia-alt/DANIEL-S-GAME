/**
 * Value Noise — cheaper than Perlin on mobile because there is no gradient
 * math: we only interpolate scalar random values at integer lattice points.
 * Uses cosine interpolation for C1-continuous curves (no visible seams).
 */

/** Wang hash — fast, low-collision integer → [0, 1) mapping. */
function lattice(ix: number, seed: number): number {
  let h = ((ix ^ seed) >>> 0);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = h ^ (h >>> 16);
  return (h >>> 0) / 0x100000000;
}

/** Cosine interpolation — smoother than linear, cheaper than cubic. */
function coserp(a: number, b: number, t: number): number {
  const f = (1 - Math.cos(t * Math.PI)) * 0.5;
  return a + (b - a) * f;
}

/** Single-octave value noise. Returns [0, 1). */
export function valueNoise(x: number, seed: number): number {
  const ix = Math.floor(x);
  return coserp(lattice(ix, seed), lattice(ix + 1, seed), x - ix);
}

/**
 * Fractional Brownian Motion — sum of value noise octaves with halving
 * amplitude and doubling frequency. Returns a normalized [0, 1) value.
 *
 * Default 4 octaves: coarse shape from octave 0, detail from octaves 1-3.
 * Applying a normal-distribution-like bias via the cosine step in coserp
 * naturally clusters results near 0.5, producing rolling hills.
 */
export function fbm(x: number, seed: number, octaves = 4): number {
  let value = 0;
  let amp   = 0.5;
  let freq  = 1;
  let norm  = 0;

  for (let o = 0; o < octaves; o++) {
    value += valueNoise(x * freq, seed + o * 1327) * amp;
    norm  += amp;
    amp   *= 0.5;
    freq  *= 2.1; // slightly irrational ratio avoids repeating patterns
  }

  return value / norm;
}

/**
 * Generate a height array for `ww` columns using fBm.
 * Returns integer heights in [minH, minH + range).
 */
export function generateHeights(
  ww: number,
  seed: number,
  scale = 0.02,
  minH  = 28,
  range = 18,
): number[] {
  const out: number[] = new Array(ww);
  for (let x = 0; x < ww; x++) {
    out[x] = Math.floor(fbm(x * scale, seed) * range + minH);
  }
  return out;
}
