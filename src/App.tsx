import { useState, useEffect, useRef, useCallback } from 'react';
import {
  VariationId,
  AnimationParams,
  WeatherData,
  ActivePulse,
  ClockPreset,
} from './types/clock';
import { AcousticCircleCanvas } from './components/AcousticCircleCanvas';
import { SettingsDrawer } from './components/SettingsDrawer';
import { DEFAULT_PRIMARY_RING, CLOCK_PRESETS } from './utils/presets';
import { isColorDark } from './utils/math';
import { Play, Pause, StepForward, Clock, Sliders, Zap } from 'lucide-react';

const DEFAULT_PARAMS: AnimationParams = {
  speed: 2.3,           // Transit Time: 2.3s to reach opposite side (up to 10s)
  decayDuration: 2.8,   // Natural Decay: 2.8s persistence before natural fade (up to 12s)
  peakThickness: 1.5,   // Peak Swell: 1.5× thickness at current second (up to 6x)
  amplitude: 0.2,       // Amplitude: 0.2× radial wave distortion height (up to 5x)
  frequency: 10,        // Frequency: 10 ripples in wave packet (up to 30)
  strokeWidth: 1.5,     // Base Stroke: 1.5px baseline circle line weight (up to 6px)
  decay: 0.7,           // Attenuation along circle loop
  pulseInterval: 1.0,   // Once per second
  continuous: false,    // Synchronized to second tick pulses
  charcoalTone: 'charcoal',
  collisionMode: 'constructive',
  timeSweepSmooth: false,
  direction: 'clockwise', // Default: only push clockwise
  directionBias: 50,    // 50% CW / 50% CCW when pushing both
  secondMotion: 'spring',
  // Dynamic motion smoothing sliders
  tickDuration: 0.28,   // 0.28s step duration (0.00s = snap, 1.00s = continuous flow)
  elasticTension: 0.45, // 0.45 spring tension/bounce
  dampingFactor: 0.8,   // 0.8 damping settle
  // Wave root initial shock smoother (0-amplitude attack ramp)
  attackDuration: 0.18, // 0.18s silky ramp-in from 0 to eliminate initial wave birth jerk
  // Heavy stroke on ripple start & coupled amplitude
  initialStrokeWeight: 2.0, // 2.0x heavier stroke at wave origin
  linkStrokeToAmplitude: true, // Coupling between amplitude and stroke weight
  strokeTaperRate: 1.2, // Tapering rate back to base stroke weight
  // Second Hand Membrane Push / Outline Deformation
  membraneStretch: 0, // 0 = standard circle; slider 0-80px deforms outline by needle
  membraneWidth: 0.36, // Angular tent width (0.15 to 0.8 rad)
  membraneFollowHand: true, // Second hand needle physically touches and stretches apex
  // Color, Glows & Emitters
  glowMode: 'none', // 'none' | 'ember' | 'cyan' | 'violet' | 'chromatic' | 'sage' | 'crimson' | 'aurora'
  glowIntensity: 25, // 0% to 100% (subtle by default)
  // Multi-Ring Layers
  rings: [
    {
      ...DEFAULT_PRIMARY_RING,
      name: 'Solomon Divergence Rim',
      color: '#ffffff',
      strokeWidth: 2.0,
      noiseEnabled: true,
      noiseAmplitude: 14,
      noiseFrequency: 20,
      noiseSpeed: 1.2,
      noiseType: 'fractal',
      noiseDensity: 4,
      noiseBleed: 14,
      divergenceSpikes: true,
      divergenceIntensity: 85,
      divergenceAngle: -0.65,
    },
  ],
  // Splittable Time Colors
  timeColors: {
    splitBySection: false,
    primary: '#ffffff',
    hours: '#ffffff',
    minutes: '#ffffff',
    seconds: '#ffffff',
    separator: '#71717a',
  },
  // Digital time options
  showDigitalSeconds: true, // Toggle show/hide :SS on digital view
  digitTransition: 'morph', // Default 'morph' for true vector coordinate shape morphing
  digitMorphStyle: 'stroke', // 'stroke' | 'fill'
  handsMode: 'digital',   // 'digital' | 'analog' | 'hybrid'
  fontFamily: 'space',    // 'jetbrains' | 'jakarta' | 'space' | 'syne' | 'cinzel'
  numberScale: 1.0,     // 1.0x (50% to 180%)
  timeLayer: 'over',    // 'over' (in front of ring) | 'under' (under ring / ripples over numbers)

  // Master Speed Multiplier & Time Flow Controls
  speedMultiplier: 1.0, // 0.0x to 10.0x
  isPaused: false, // Freeze canvas / pause render
  timeSource: 'system', // 'system' | 'custom'
  customHours: 4,
  customMinutes: 17,
  customSeconds: 39,
  customTimeRunning: true,

  // Canvas & App Background Color
  backgroundColor: '#000000',

  // Westworld Solomon Telemetry
  showSolomonTelemetry: true,
  showSolomonInteriorMesh: true,
  solomonStatusText: 'SYSTEM INITIATED',
  solomonLocationText: 'UNDISCLOSED LOCATION',
  solomonBuildText: "'SOLOMON' BUILD 0.06",
  solomonAnomalyAngle: -0.65,
};

const DEFAULT_WEATHER: WeatherData = {
  temp: 72,
  condition: 'Partly Cloudy',
  high: 76,
  low: 58,
  humidity: 42,
  windSpeed: 8,
  location: 'San Francisco, CA',
  pressure: '1014 hPa',
};

export default function App() {
  const [selectedVariation, setSelectedVariation] = useState<VariationId>('solomon');
  const [params, setParams] = useState<AnimationParams>(DEFAULT_PARAMS);
  const [isLiveTime, setIsLiveTime] = useState<boolean>(true);
  const [scrubSecond, setScrubSecond] = useState<number>(18);
  const [morphProgress, setMorphProgress] = useState<number>(0); // 0 = Clock, 1 = Weather
  const [isAutoMorphing, setIsAutoMorphing] = useState<boolean>(false);
  const [weatherData] = useState<WeatherData>(DEFAULT_WEATHER);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Responsive center clock dimension that shrinks smoothly when settings opens
  const [clockSize, setClockSize] = useState<number>(560);

  useEffect(() => {
    const updateSize = () => {
      const availableW = window.innerWidth - (isSettingsOpen ? 380 : 0);
      const vh = window.innerHeight;
      const size = Math.min(availableW * 0.88, vh * 0.82, 640);
      setClockSize(Math.max(260, Math.round(size)));
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isSettingsOpen]);

  // Active in-flight pulses that persist across ticks and naturally decay
  const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);
  const pulseIdCounter = useRef<number>(0);
  const lastSecondRef = useRef<number>(-1);

  // Time state updated at 60fps
  const [timeState, setTimeState] = useState({
    hours: 10,
    minutes: 42,
    seconds: 18,
    fraction: 0,
    rawTimestamp: performance.now(),
  });

  // Simulated continuous second accumulator for slow-motion and custom scrub
  const simulatedSecRef = useRef<number>(10 * 3600 + 42 * 60 + 18);
  const lastTickTimeRef = useRef<number>(performance.now());

  // Initialize simulated time when switching to custom time
  useEffect(() => {
    if (params.timeSource === 'custom') {
      simulatedSecRef.current = params.customHours * 3600 + params.customMinutes * 60 + params.customSeconds;
    }
  }, [params.timeSource, params.customHours, params.customMinutes, params.customSeconds]);

  // Step Frame forward when paused
  const handleStepFrame = useCallback((deltaSec = 1 / 60) => {
    simulatedSecRef.current += deltaSec;
    const total = Math.max(0, simulatedSecRef.current);
    const hours = Math.floor(total / 3600) % 24;
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = Math.floor(total % 60);
    const fraction = total % 1;
    const now = performance.now();

    setTimeState({
      hours,
      minutes,
      seconds,
      fraction,
      rawTimestamp: now,
    });
  }, []);

  // Time loop with Master Speed Multiplier & Canvas Freeze Support
  useEffect(() => {
    let animId: number;

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - lastTickTimeRef.current) / 1000));
      lastTickTimeRef.current = now;

      // 1. If Canvas is Frozen / Paused or Speed is 0: DO NOT advance time or emit new pulses
      if (params.isPaused || params.speedMultiplier === 0) {
        animId = requestAnimationFrame(tick);
        return;
      }

      let currentSec = 0;
      let hours = 10;
      let minutes = 42;
      let fraction = 0;

      const speedMult = Math.max(0, params.speedMultiplier ?? 1.0);

      if (params.timeSource === 'custom') {
        if (params.customTimeRunning) {
          simulatedSecRef.current += dt * speedMult;
        }
        const total = Math.max(0, simulatedSecRef.current);
        hours = Math.floor(total / 3600) % 24;
        minutes = Math.floor((total % 3600) / 60);
        currentSec = Math.floor(total % 60);
        fraction = total % 1;
      } else {
        // System time with speed multiplier
        if (speedMult === 1.0 && isLiveTime) {
          const nowObj = new Date();
          const ms = nowObj.getMilliseconds();
          hours = nowObj.getHours();
          minutes = nowObj.getMinutes();
          currentSec = nowObj.getSeconds();
          fraction = ms / 1000;
          simulatedSecRef.current = hours * 3600 + minutes * 60 + currentSec + fraction;
        } else if (!isLiveTime) {
          currentSec = scrubSecond;
          fraction = ((now / 1000) / params.speed) % 1;
        } else {
          // Slow-motion or fast-forward system time simulation
          simulatedSecRef.current += dt * speedMult;
          const total = Math.max(0, simulatedSecRef.current);
          hours = Math.floor(total / 3600) % 24;
          minutes = Math.floor((total % 3600) / 60);
          currentSec = Math.floor(total % 60);
          fraction = total % 1;
        }
      }

      setTimeState({
        hours,
        minutes,
        seconds: currentSec,
        fraction,
        rawTimestamp: now,
      });

      // Detect new second tick: spawn pulse
      if (currentSec !== lastSecondRef.current) {
        lastSecondRef.current = currentSec;
        const originAngle = (currentSec / 60) * (Math.PI * 2) - Math.PI / 2;

        setActivePulses((prev) => {
          const unexpired = prev.filter(
            (p) => (now - p.birthTime) / 1000 < params.decayDuration
          );
          return [
            ...unexpired,
            {
              id: ++pulseIdCounter.current,
              originAngle,
              birthTime: now,
              initialAmplitude: 1.0,
            },
          ];
        });
      } else {
        // Periodic cleanup of decayed pulses
        if (Math.random() < 0.05) {
          setActivePulses((prev) => {
            const unexpired = prev.filter(
              (p) => (now - p.birthTime) / 1000 < params.decayDuration
            );
            return unexpired.length === prev.length ? prev : unexpired;
          });
        }
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [
    isLiveTime,
    scrubSecond,
    params.speed,
    params.decayDuration,
    params.isPaused,
    params.speedMultiplier,
    params.timeSource,
    params.customTimeRunning,
  ]);

  // Keyboard shortcut: Space to freeze/pause, period to step frame
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setParams((prev) => ({ ...prev, isPaused: !prev.isPaused }));
      } else if (e.key === '.' || e.key === 'ArrowRight') {
        if (params.isPaused) {
          e.preventDefault();
          handleStepFrame(e.shiftKey ? 1.0 : 1 / 60);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [params.isPaused, handleStepFrame]);

  // Auto morph cycle animation
  const morphAnimRef = useRef<number | null>(null);
  const morphDirRef = useRef<number>(1);

  useEffect(() => {
    if (!isAutoMorphing || params.isPaused) {
      if (morphAnimRef.current) cancelAnimationFrame(morphAnimRef.current);
      return;
    }

    let lastT = performance.now();
    const morphLoop = (now: number) => {
      const dt = (now - lastT) / 1000;
      lastT = now;

      setMorphProgress((prev) => {
        let next = prev + morphDirRef.current * dt * 0.45;
        if (next >= 1) {
          next = 1;
          morphDirRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          morphDirRef.current = 1;
        }
        return next;
      });

      morphAnimRef.current = requestAnimationFrame(morphLoop);
    };

    morphAnimRef.current = requestAnimationFrame(morphLoop);
    return () => {
      if (morphAnimRef.current) cancelAnimationFrame(morphAnimRef.current);
    };
  }, [isAutoMorphing, params.isPaused]);

  const triggerManualPulse = useCallback(() => {
    const now = performance.now();
    const currentSec = timeState.seconds;
    const originAngle = (currentSec / 60) * (Math.PI * 2) - Math.PI / 2;

    setActivePulses((prev) => [
      ...prev.filter((p) => (now - p.birthTime) / 1000 < params.decayDuration),
      {
        id: ++pulseIdCounter.current,
        originAngle,
        birthTime: now,
        initialAmplitude: 1.3,
      },
    ]);
  }, [timeState.seconds, params.decayDuration]);

  // Apply a preset directly
  const handleApplyPreset = (preset: ClockPreset) => {
    setSelectedVariation(preset.variation);
    setParams((prev) => ({
      ...prev,
      ...preset.params,
      backgroundColor: preset.backgroundColor || preset.params?.backgroundColor || prev.backgroundColor || '#000000',
      rings: preset.rings || prev.rings || [DEFAULT_PRIMARY_RING],
    }));
    triggerManualPulse();
  };

  const isDarkBg = isColorDark(params.backgroundColor);

  return (
    <div
      className={`relative w-screen h-screen min-h-screen flex overflow-hidden select-none font-sans transition-colors duration-300 ${
        isDarkBg ? 'text-zinc-100' : 'text-zinc-900'
      }`}
      style={{ backgroundColor: params.backgroundColor || (isDarkBg ? '#000000' : '#ffffff') }}
    >
      
      {/* 
        ============================================================
        CENTERPIECE CLOCK (Pure Standalone View)
        Shrinks to the left when settings opens, NO blur, NO dark scrim!
        ============================================================ 
      */}
      <main
        className={`flex-1 h-full flex items-center justify-center relative transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isSettingsOpen ? 'mr-[380px] max-sm:mr-0' : 'mr-0'
        }`}
      >
        <AcousticCircleCanvas
          variation={selectedVariation}
          size={clockSize}
          hours={timeState.hours}
          minutes={timeState.minutes}
          seconds={timeState.seconds}
          fraction={timeState.fraction}
          rawTimestamp={timeState.rawTimestamp}
          params={params}
          activePulses={activePulses}
          morphProgress={morphProgress}
          weatherData={weatherData}
          showCenterText={true}
        />

        {/* 
          ============================================================
          FLOATING QUICK HUD (Bottom Floating Pill for Freeze & Speed)
          Enables quick troubleshooting of visual tears without opening drawer!
          ============================================================ 
        */}
        <div
          className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 backdrop-blur-md border shadow-lg px-3 py-1.5 rounded-full text-xs transition-all duration-200 ${
            isDarkBg
              ? 'bg-zinc-900/90 border-zinc-800 text-zinc-300 shadow-black/50 hover:border-zinc-700'
              : 'bg-white/90 border-zinc-200/80 text-zinc-700 shadow-zinc-900/5 hover:border-zinc-300'
          }`}
        >
          {/* Pause / Resume Button */}
          <button
            onClick={() => setParams((p) => ({ ...p, isPaused: !p.isPaused }))}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium transition-all ${
              params.isPaused
                ? 'bg-amber-500 text-white shadow-sm'
                : isDarkBg
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-800'
            }`}
            title="Freeze/Resume Canvas (Hotkey: Space)"
          >
            {params.isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Frozen</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Live</span>
              </>
            )}
          </button>

          {/* Step Frame (Visible when paused) */}
          {params.isPaused && (
            <button
              onClick={() => handleStepFrame(1 / 60)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full font-mono text-[11px] ${
                isDarkBg
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
              title="Step +1 Frame (Hotkey: . or Right Arrow)"
            >
              <StepForward className="w-3 h-3" />
              <span>Step</span>
            </button>
          )}

          <div className={`h-4 w-px ${isDarkBg ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

          {/* Master Speed Quick Chips */}
          <div className="flex items-center gap-1">
            {[0.1, 0.25, 0.5, 1.0, 2.0].map((spd) => (
              <button
                key={spd}
                onClick={() => setParams((p) => ({ ...p, speedMultiplier: spd, isPaused: false }))}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-all ${
                  params.speedMultiplier === spd && !params.isPaused
                    ? isDarkBg
                      ? 'bg-white text-zinc-950 font-bold'
                      : 'bg-zinc-900 text-white font-semibold'
                    : isDarkBg
                      ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                      : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className={`h-4 w-px ${isDarkBg ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

          {/* Quick Theme Background Toggle (Moon / Sun) */}
          <button
            onClick={() => {
              const nextBg = isDarkBg ? '#ffffff' : '#000000';
              const nextInk = isDarkBg ? '#18181b' : '#ffffff';
              setParams((prev) => ({
                ...prev,
                backgroundColor: nextBg,
                timeColors: {
                  ...prev.timeColors,
                  primary: nextInk,
                  hours: nextInk,
                  minutes: nextInk,
                  seconds: nextInk,
                },
                rings: prev.rings.map((r, i) => (i === 0 ? { ...r, color: nextInk } : r)),
              }));
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono transition-all ${
              isDarkBg
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
            }`}
            title="Toggle Void Black / Paper White"
          >
            <span>{isDarkBg ? '☀️ Paper' : '🌙 Void'}</span>
          </button>

          <div className={`h-4 w-px ${isDarkBg ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

          {/* Mode Badge & Solomon Quick Button */}
          {selectedVariation === 'solomon' ? (
            <span
              className={`flex items-center gap-1 text-[11px] font-mono font-medium px-1 ${
                isDarkBg ? 'text-white' : 'text-zinc-900'
              }`}
            >
              <Zap className={`w-3 h-3 ${isDarkBg ? 'text-amber-400' : 'text-zinc-700'}`} />
              Solomon 0.06
            </span>
          ) : (
            <button
              onClick={() => {
                const solomonPreset = CLOCK_PRESETS.find((p) => p.variation === 'solomon');
                if (solomonPreset) handleApplyPreset(solomonPreset);
              }}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-[11px] ${
                isDarkBg
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                  : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700'
              }`}
              title="Switch to Westworld Solomon Study"
            >
              <Zap className="w-3 h-3" />
              <span>Solomon</span>
            </button>
          )}

          <div className={`h-4 w-px ${isDarkBg ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

          {/* Open Settings Drawer Button */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-1.5 rounded-full transition-all ${
              isSettingsOpen
                ? isDarkBg
                  ? 'bg-white text-zinc-950'
                  : 'bg-zinc-900 text-white'
                : isDarkBg
                  ? 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
            }`}
            title="Toggle Settings & Controls Drawer"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>

      {/* 
        ============================================================
        CODEPEN EXPORT INSTRUCTIONS:
        To run as a pure, distraction-free clock, simply delete
        or comment out the <SettingsDrawer /> block below!
        ============================================================ 
      */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onToggleOpen={() => setIsSettingsOpen(!isSettingsOpen)}
        onClose={() => setIsSettingsOpen(false)}
        selectedVariation={selectedVariation}
        onSelectVariation={setSelectedVariation}
        params={params}
        onChangeParams={(updated) => setParams((prev) => ({ ...prev, ...updated }))}
        onResetParams={() => setParams(DEFAULT_PARAMS)}
        onApplyPreset={handleApplyPreset}
        morphProgress={morphProgress}
        onChangeMorph={setMorphProgress}
        isAutoMorphing={isAutoMorphing}
        onToggleAutoMorph={() => setIsAutoMorphing(!isAutoMorphing)}
        isLiveTime={isLiveTime}
        onToggleLiveTime={() => setIsLiveTime(!isLiveTime)}
        scrubSecond={scrubSecond}
        onChangeScrubSecond={setScrubSecond}
        onTriggerPulse={triggerManualPulse}
        onStepFrame={handleStepFrame}
        activeWavesCount={activePulses.length || 1}
        weatherData={weatherData}
      />

    </div>
  );
}
