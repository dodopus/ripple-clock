export type VariationId =
  | 'soliton'
  | 'rehoboam'
  | 'solomon'
  | 'fluid-ribbon'
  | 'tendrils'
  | 'echo-shells'
  | 'chirp'
  | 'tectonic'
  | 'particle-swarm'
  | 'ribbed-spine'
  | 'membrane-stretch';

export interface VariationInfo {
  id: VariationId;
  index: number;
  name: string;
  subtitle: string;
  description: string;
  physicsTag: string;
}

export interface ActivePulse {
  id: number;
  originAngle: number;    // angle in radians where this pulse was spawned
  birthTime: number;      // performance.now() timestamp
  initialAmplitude: number;
}

export type SecondMotionMode = 'smooth' | 'spring' | 'step';
export type DigitTransitionMode = 'morph' | 'roll' | 'fade' | 'instant';
export type DigitMorphStyle = 'stroke' | 'fill';
export type ClockHandsMode = 'digital' | 'analog' | 'hybrid';
export type ClockFontFamily = 'jetbrains' | 'jakarta' | 'space' | 'syne' | 'cinzel';
export type TimeLayerMode = 'over' | 'under';
export type GlowMode = 'none' | 'ember' | 'cyan' | 'violet' | 'chromatic' | 'sage' | 'crimson' | 'aurora';
export type RingGradientType = 'solid' | 'angular' | 'radial-amplitude';
export type RingNoiseType = 'fractal' | 'seismic' | 'particulate' | 'interference' | 'smooth';

export interface RingLayer {
  id: string;
  name: string;
  visible: boolean;
  color: string; // Hex or CSS color
  gradientType: RingGradientType;
  secondaryColor?: string; // For angular or radial amplitude gradients
  timeOffset: number; // -5.0s to +5.0s (phase / wave delay)
  radiusOffset: number; // -60px to +60px
  offsetX: number; // -40px to +40px
  offsetY: number; // -40px to +40px
  strokeWidth: number; // 0.5px to 8px
  blur: number; // 0px to 25px
  opacity: number; // 0.1 to 1.0
  blendMode: 'source-over' | 'screen' | 'lighter' | 'multiply';
  variationOverride?: VariationId;
  // Circumferential Noise & Interference Options
  noiseEnabled?: boolean;
  noiseAmplitude?: number; // 0px to 60px radial disturbance
  noiseFrequency?: number; // 1 to 50 roughness / octaves
  noiseSpeed?: number;     // 0x to 5x time shimmer rate
  noiseType?: RingNoiseType;
  noiseDensity?: number;   // 1 to 8 strands / stipple density
  noiseBleed?: number;     // 0px to 30px smoky ink bleed width
  divergenceSpikes?: boolean; // Spontaneous Westworld anomaly eruption
  divergenceIntensity?: number; // 0 to 100
  divergenceAngle?: number; // radians or degrees offset
}

export interface TimeColors {
  splitBySection: boolean;
  primary: string; // uniform or fallback color (e.g. '#18181b')
  hours: string;   // color for HH
  minutes: string; // color for MM
  seconds: string; // color for SS
  separator: string; // color for ':'
}

export interface AnimationParams {
  speed: number;           // Transit Time (seconds, up to 10s)
  decayDuration: number;   // Natural Decay persistence (seconds, up to 12s)
  amplitude: number;       // Radial wave distortion height (multiplier, up to 5x)
  frequency: number;       // Ripples count in wave packet (up to 30)
  strokeWidth: number;     // Base Stroke weight in px (up to 6px)
  peakThickness: number;   // Peak Swell thickness at current second (up to 6x)
  decay: number;           // Attenuation rate as wave travels around circle
  pulseInterval: number;   // Seconds between pulses
  continuous: boolean;     // Continuous flowing waves vs discrete second tick pulses
  charcoalTone: 'charcoal' | 'obsidian' | 'slate' | 'graphite';
  collisionMode: 'constructive' | 'dissipate' | 'reflect';
  timeSweepSmooth: boolean; // Continuous fractional second sweep
  direction: 'clockwise' | 'counter' | 'both'; // Default: clockwise
  directionBias: number;   // % Forward vs Backward when pushing both (0% = CCW, 50% = 50/50, 100% = CW)
  secondMotion: SecondMotionMode;
  // Motion smoothing dynamic sliders
  tickDuration: number;    // Transition duration of second step (0.00s = snap to 1.00s = continuous flow)
  elasticTension: number;  // Spring overshoot / bounce tension (0.0 = no bounce, 1.0 = spring recoil)
  dampingFactor: number;   // Damping rate for spring settle (0.2 to 2.0)
  // Wave root attack / shock absorption
  attackDuration: number;  // Smooth ramp-in from 0 amplitude to eliminate initial wave birth jerk (0.0s to 0.8s)
  // Stroke dynamics
  initialStrokeWeight: number; // Starting stroke weight multiplier for heavy crests (1.0x to 8.0x)
  linkStrokeToAmplitude: boolean; // Direct coupling between wave amplitude and stroke weight
  strokeTaperRate: number; // Rate at which heavy stroke thins back to baseline (0.0 to 3.0)
  // Second Hand Membrane Push / Outline Deformation
  membraneStretch: number; // Pixels to stretch/deform outer ring outward by the second hand (0 to 80px)
  membraneWidth: number;   // Angular width / tent radius of membrane protrusion (0.15 to 0.8 rad)
  membraneFollowHand: boolean; // Stretch analog second hand needle to touch apex of deformed ring
  // Color, Glows & Emitters
  glowMode: GlowMode;      // Subtle acoustic glow aura / emitter mode
  glowIntensity: number;   // Glow intensity (0% to 100%)
  // Multi-Ring Layers
  rings: RingLayer[];
  // Splittable Time Colors
  timeColors: TimeColors;
  // Digital time options
  showDigitalSeconds: boolean;
  digitTransition: DigitTransitionMode;
  digitMorphStyle: DigitMorphStyle; // 'stroke' | 'fill'
  handsMode: ClockHandsMode;
  fontFamily: ClockFontFamily;
  numberScale: number;     // Scale of digits (0.5x to 1.8x)
  timeLayer: TimeLayerMode; // 'over' (digits in front of ring) | 'under' (digits under ring/ripples)

  // Master Speed Multiplier & Time Flow Controls
  speedMultiplier: number; // 0.0x (frozen) to 10.0x
  isPaused: boolean;       // Freeze render / pause canvas for troubleshooting visual tears
  timeSource: 'system' | 'custom';
  customHours: number;     // 0-23
  customMinutes: number;   // 0-59
  customSeconds: number;   // 0-59
  customTimeRunning: boolean; // whether custom time advances at speedMultiplier

  // Canvas & App Background Color
  backgroundColor?: string; // '#000000' (Black Void) | '#ffffff' (White) | custom hex

  // Westworld Solomon Telemetry HUD
  showSolomonTelemetry?: boolean;
  solomonStatusText?: string;
  solomonLocationText?: string;
  solomonBuildText?: string;
  solomonAnomalyAngle?: number; // radians where the reticle and needle point
  showSolomonInteriorMesh?: boolean; // Solomon quantum strategy interconnected triangles
}

export interface ClockPreset {
  id: string;
  name: string;
  category: 'Minimal' | 'Neon & Glow' | 'Elastic & Organic' | 'Mechanical' | 'Complex Waves';
  description: string;
  variation: VariationId;
  tagColor: string;
  backgroundColor?: string;
  params: Partial<AnimationParams>;
  rings?: RingLayer[];
}

export interface WeatherData {
  temp: number;
  condition: string;
  high: number;
  low: number;
  humidity: number;
  windSpeed: number;
  location: string;
  pressure: string;
}
