import { useState, useEffect, useRef } from 'react';
import { VariationId, AnimationParams, WeatherData, ClockPreset } from './types/clock';
import { AcousticCircleCanvas } from './components/AcousticCircleCanvas';
import { SettingsDrawer } from './components/SettingsDrawer';
import { DEFAULT_PRIMARY_RING, CLOCK_PRESETS } from './utils/presets';
import { isColorDark } from './utils/math';
import { Play, Pause, StepForward, Sliders, Zap } from 'lucide-react';
import { DEFAULT_CLOCK_CONFIG } from './clock.config';
import { useClockTime } from './hooks/useClockTime';

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
  const [selectedVariation, setSelectedVariation] = useState<VariationId>(DEFAULT_CLOCK_CONFIG.variation);
  const [params, setParams] = useState<AnimationParams>(DEFAULT_CLOCK_CONFIG.params);
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

  const { time: timeState, activePulses, stepFrame: handleStepFrame, triggerPulse: triggerManualPulse } =
    useClockTime(params, { isLiveTime, scrubSecond });

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

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onToggleOpen={() => setIsSettingsOpen(!isSettingsOpen)}
        onClose={() => setIsSettingsOpen(false)}
        selectedVariation={selectedVariation}
        onSelectVariation={setSelectedVariation}
        params={params}
        onChangeParams={(updated) => setParams((prev) => ({ ...prev, ...updated }))}
        onResetParams={() => setParams(DEFAULT_CLOCK_CONFIG.params)}
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
