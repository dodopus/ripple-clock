/**
 * Mathematical utilities for circumferential wave propagation and acoustic circle distortion
 */

export const TWO_PI = Math.PI * 2;
export const HALF_PI = Math.PI / 2;

/**
 * Normalizes any angle into [0, 2*PI)
 */
export function normalizeAngle(angle: number): number {
  return ((angle % TWO_PI) + TWO_PI) % TWO_PI;
}

/**
 * Computes shortest angular distance along circumference to theta0 in [0, PI].
 * Symmetrically measures distance whether going clockwise or counter-clockwise.
 * 0 = at origin (current second)
 * PI = at antipode (opposite side of circle)
 */
export function angularDistance(theta: number, theta0: number): number {
  const diff = Math.abs(theta - theta0) % TWO_PI;
  return diff > Math.PI ? TWO_PI - diff : diff;
}

/**
 * Clockwise angular distance from theta0 to theta in [0, 2*PI).
 */
export function clockwiseDistance(theta: number, theta0: number): number {
  return ((theta - theta0) % TWO_PI + TWO_PI) % TWO_PI;
}

/**
 * Counter-clockwise angular distance from theta0 to theta in [0, 2*PI).
 */
export function counterClockwiseDistance(theta: number, theta0: number): number {
  return ((theta0 - theta) % TWO_PI + TWO_PI) % TWO_PI;
}

/**
 * Signed angular difference in [-PI, PI].
 * Positive = clockwise from theta0, Negative = counter-clockwise from theta0
 */
export function signedAngularDiff(theta: number, theta0: number): number {
  let diff = (theta - theta0) % TWO_PI;
  if (diff > Math.PI) diff -= TWO_PI;
  if (diff < -Math.PI) diff += TWO_PI;
  return diff;
}

/**
 * 1D pseudo-random Perlin-like smooth fractal noise
 */
export function pseudoNoise(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f); // Hermite smoothstep
  
  const h0 = hash(i);
  const h1 = hash(i + 1);
  return h0 + (h1 - h0) * s;
}

export function fractalNoise(x: number, octaves = 3, lacunarity = 2.0, gain = 0.5): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxAmp = 0;
  for (let o = 0; o < octaves; o++) {
    total += pseudoNoise(x * frequency) * amplitude;
    maxAmp += amplitude;
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return total / maxAmp;
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return (s - Math.floor(s)) * 2 - 1; // Range [-1, 1]
}

export function hash2D(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return (s - Math.floor(s)) * 2 - 1;
}

export function pseudoNoise2D(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const n00 = hash2D(ix, iy);
  const n10 = hash2D(ix + 1, iy);
  const n01 = hash2D(ix, iy + 1);
  const n11 = hash2D(ix + 1, iy + 1);

  const nx0 = n00 + (n10 - n00) * sx;
  const nx1 = n01 + (n11 - n01) * sx;
  return nx0 + (nx1 - nx0) * sy;
}

/**
 * High-quality circumferential 2D fractal Brownian motion (fBm)
 * Seamlessly continuous around circle [0, 2*PI] with time evolution
 */
export function circumferentialFbm(
  theta: number,
  timeSec: number,
  frequency = 12,
  speed = 1.0,
  octaves = 4
): number {
  // Map angle to unit circle in 2D space so it loops seamlessly with zero seams!
  const radius = frequency * 0.15;
  const cx = Math.cos(theta) * radius;
  const cy = Math.sin(theta) * radius;
  const cz = timeSec * speed * 0.4;

  let total = 0;
  let freq = 1;
  let amp = 1;
  let maxAmp = 0;

  for (let o = 0; o < octaves; o++) {
    total += pseudoNoise2D(cx * freq + cz, cy * freq + cz * 0.7) * amp;
    maxAmp += amp;
    freq *= 2.1;
    amp *= 0.5;
  }
  return total / maxAmp;
}

/**
 * High-frequency electrostatic interference jitter (flickering acoustic static)
 */
export function circumferentialInterference(
  theta: number,
  timeSec: number,
  freq = 24
): number {
  const f1 = Math.sin(theta * freq + timeSec * 14);
  const f2 = Math.cos(theta * (freq * 2.1) - timeSec * 22) * 0.6;
  const f3 = Math.sin(theta * (freq * 4.7) + timeSec * 35) * 0.35;
  const hashJitter = (Math.sin(theta * 99 + timeSec * 50) % 1) * 0.25;
  return (f1 + f2 + f3 + hashJitter) / 2.2;
}

/**
 * Westworld Solomon/Rehoboam Seismic Divergence Anomaly Profile
 * Generates an intense cluster of jagged, multi-crested peaks at anomalyAngle
 */
export function seismicDivergenceProfile(
  theta: number,
  anomalyAngle: number,
  intensity = 1.0
): number {
  const d = angularDistance(theta, anomalyAngle);
  // Anomaly cluster width (~0.85 radians)
  const env = Math.exp(-0.5 * (d / 0.35) * (d / 0.35));
  if (env < 0.005) return 0;

  // Asymmetric multi-frequency jagged seismic peaks
  const signedD = signedAngularDiff(theta, anomalyAngle);
  const p1 = Math.sin(signedD * 28) * 0.6;
  const p2 = Math.sin(signedD * 64) * 0.45;
  const p3 = Math.abs(Math.sin(signedD * 110)) * 0.4;
  const sharpSpike = Math.pow(Math.max(0, 1 - d / 0.22), 2.2) * 1.5;

  return (p1 + p2 + p3 + sharpSpike) * env * intensity;
}

/**
 * Smooth Gaussian envelope
 */
export function gaussian(x: number, mean: number, sigma: number): number {
  const d = (x - mean) / sigma;
  return Math.exp(-0.5 * d * d);
}

/**
 * Palette hex values for the minimal charcoal schemes
 */
export const CHARCOAL_COLORS: Record<string, { stroke: string; rgb: [number, number, number] }> = {
  charcoal: { stroke: '#18181b', rgb: [24, 24, 27] },   // Zinc 900
  obsidian: { stroke: '#09090b', rgb: [9, 9, 11] },     // Zinc 950
  slate: { stroke: '#334155', rgb: [51, 65, 85] },      // Slate 700
  graphite: { stroke: '#292524', rgb: [41, 37, 36] },   // Stone 800
};

export interface GlowConfig {
  name: string;
  color: string;
  rgba: string;
  emitterRgba: string;
  chromatic?: boolean;
}

export const GLOW_PRESETS: Record<string, GlowConfig> = {
  none: {
    name: 'Pure Monochrome',
    color: 'transparent',
    rgba: 'rgba(0,0,0,0)',
    emitterRgba: 'rgba(0,0,0,0)',
  },
  ember: {
    name: 'Ember Acoustic',
    color: '#f59e0b',
    rgba: 'rgba(245, 158, 11, 0.45)',
    emitterRgba: 'rgba(245, 158, 11, 0.75)',
  },
  cyan: {
    name: 'Bioluminescent Abyss',
    color: '#06b6d4',
    rgba: 'rgba(6, 182, 212, 0.45)',
    emitterRgba: 'rgba(6, 182, 212, 0.8)',
  },
  violet: {
    name: 'Deep Ultraviolet',
    color: '#8b5cf6',
    rgba: 'rgba(139, 92, 246, 0.45)',
    emitterRgba: 'rgba(139, 92, 246, 0.75)',
  },
  chromatic: {
    name: 'Chromatic Prism',
    color: '#ec4899',
    rgba: 'rgba(236, 72, 153, 0.4)',
    emitterRgba: 'rgba(6, 182, 212, 0.6)',
    chromatic: true,
  },
  sage: {
    name: 'Radar Phosphor Sage',
    color: '#10b981',
    rgba: 'rgba(16, 185, 129, 0.45)',
    emitterRgba: 'rgba(16, 185, 129, 0.75)',
  },
  crimson: {
    name: 'Delos Anomaly Crimson',
    color: '#ef4444',
    rgba: 'rgba(239, 68, 68, 0.45)',
    emitterRgba: 'rgba(239, 68, 68, 0.8)',
  },
  aurora: {
    name: 'Dual-Tone Aurora',
    color: '#06b6d4',
    rgba: 'rgba(6, 182, 212, 0.4)',
    emitterRgba: 'rgba(168, 85, 247, 0.75)',
  },
};

export function isColorDark(hexOrRgb?: string): boolean {
  if (!hexOrRgb) return false;
  if (hexOrRgb === '#000' || hexOrRgb === '#000000') return true;
  const hex = hexOrRgb.replace('#', '');
  if (hex.length === 3) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 130;
  }
  if (hex.length === 6) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 130;
  }
  return false;
}
