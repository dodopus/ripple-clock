import React, { useState, useEffect, useRef } from 'react';
import { VariationId, AnimationParams, WeatherData, ActivePulse } from '../types/clock';
import { VARIATIONS } from '../utils/variations';
import { AcousticCircleCanvas } from './AcousticCircleCanvas';

interface Props {
  selectedId: VariationId;
  onSelectVariation: (id: VariationId) => void;
  hours: number;
  minutes: number;
  seconds: number;
  fraction: number;
  rawTimestamp: number;
  params: AnimationParams;
  activePulses: ActivePulse[];
  weatherData: WeatherData;
  onUpdateWeather: (data: WeatherData) => void;
}

export const FluidMorphLab: React.FC<Props> = ({
  selectedId,
  onSelectVariation,
  hours,
  minutes,
  seconds,
  fraction,
  rawTimestamp,
  params,
  activePulses,
  weatherData,
  onUpdateWeather,
}) => {
  const [morphValue, setMorphValue] = useState<number>(0); // 0 = Clock, 1 = Weather
  const [isAutoMorphing, setIsAutoMorphing] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);
  const directionRef = useRef<number>(1);

  // Auto morph cycle animation
  useEffect(() => {
    if (!isAutoMorphing) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setMorphValue((prev) => {
        let next = prev + directionRef.current * dt * 0.45; // ~2.2s per morph transition
        if (next >= 1) {
          next = 1;
          directionRef.current = -1;
        } else if (next <= 0) {
          next = 0;
          directionRef.current = 1;
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoMorphing]);

  const weatherPresets: { name: string; data: WeatherData }[] = [
    {
      name: 'Partly Cloudy',
      data: {
        temp: 72,
        condition: 'Partly Cloudy',
        high: 76,
        low: 58,
        humidity: 42,
        windSpeed: 8,
        location: 'San Francisco, CA',
        pressure: '1014 hPa',
      },
    },
    {
      name: 'Rain & Mist',
      data: {
        temp: 54,
        condition: 'Light Rain',
        high: 58,
        low: 49,
        humidity: 88,
        windSpeed: 14,
        location: 'Seattle, WA',
        pressure: '1008 hPa',
      },
    },
    {
      name: 'Clear Horizon',
      data: {
        temp: 84,
        condition: 'Clear Sky',
        high: 89,
        low: 67,
        humidity: 28,
        windSpeed: 6,
        location: 'Austin, TX',
        pressure: '1018 hPa',
      },
    },
    {
      name: 'Barometric Storm',
      data: {
        temp: 61,
        condition: 'Gusty Storm',
        high: 64,
        low: 52,
        humidity: 92,
        windSpeed: 24,
        location: 'Chicago, IL',
        pressure: '998 hPa',
      },
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col items-center">
      
      {/* Title & Morph Controls */}
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-zinc-100">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 font-sans">
            Fluid Morph Architecture Lab
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Seamless continuous deformation: Clock (0%) ⟷ Weather Gauge (100%)
          </p>
        </div>

        {/* Morph Transition State Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setIsAutoMorphing(false);
              setMorphValue(0);
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
              morphValue === 0 && !isAutoMorphing
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Clock (0%)
          </button>

          <button
            onClick={() => {
              setIsAutoMorphing(false);
              setMorphValue(1);
            }}
            className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors ${
              morphValue === 1 && !isAutoMorphing
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
            }`}
          >
            Weather (100%)
          </button>

          <button
            onClick={() => setIsAutoMorphing(!isAutoMorphing)}
            className={`px-4 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              isAutoMorphing
                ? 'bg-zinc-900 text-white'
                : 'bg-zinc-100 text-zinc-800 hover:bg-zinc-200'
            }`}
          >
            {isAutoMorphing ? 'Pause Auto Morph' : 'Play Fluid Morph Loop'}
          </button>
        </div>
      </div>

      {/* Interactive Morph Slider Bar */}
      <div className="w-full max-w-xl my-6 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs font-mono text-zinc-600">
          <span className={morphValue === 0 ? 'font-bold text-zinc-900' : ''}>Clock Mode</span>
          <span className="font-semibold text-zinc-900 font-mono bg-zinc-100 px-2 py-0.5 rounded">
            Morph: {(morphValue * 100).toFixed(0)}%
          </span>
          <span className={morphValue === 1 ? 'font-bold text-zinc-900' : ''}>Weather Mode</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={morphValue}
          onChange={(e) => {
            setIsAutoMorphing(false);
            setMorphValue(parseFloat(e.target.value));
          }}
          className="accent-zinc-900 cursor-pointer h-2 bg-zinc-200 rounded-lg appearance-none w-full"
        />
        <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
          <span>Westworld Second Pulse</span>
          <span>Fluid Interpolation</span>
          <span>Atmospheric Temperature Gauge</span>
        </div>
      </div>

      {/* Main Canvas with Live Morphing */}
      <div className="my-6 relative flex items-center justify-center">
        <AcousticCircleCanvas
          variation={selectedId}
          size={560}
          hours={hours}
          minutes={minutes}
          seconds={seconds}
          fraction={fraction}
          rawTimestamp={rawTimestamp}
          params={params}
          activePulses={activePulses}
          morphProgress={morphValue}
          weatherData={weatherData}
          showCenterText={true}
          className="max-w-[85vw] max-h-[70vh]"
        />
      </div>

      {/* Active Variation Selector */}
      <div className="w-full max-w-2xl mt-4 p-4 rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider font-mono">
            Test Morph With Variation:
          </span>
          <span className="text-xs font-mono text-zinc-500">
            Selected: {VARIATIONS.find((v) => v.id === selectedId)?.name}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-9 gap-1">
          {VARIATIONS.map((v) => (
            <button
              key={v.id}
              onClick={() => onSelectVariation(v.id)}
              className={`py-1.5 px-2 text-xs font-mono rounded text-center transition-colors truncate ${
                v.id === selectedId
                  ? 'bg-zinc-900 text-white font-semibold'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
              title={v.name}
            >
              0{v.index}
            </button>
          ))}
        </div>
      </div>

      {/* Weather Preset Selector */}
      <div className="w-full max-w-2xl mt-4 p-4 rounded-xl border border-zinc-200 bg-zinc-50/50">
        <span className="text-xs font-semibold text-zinc-800 uppercase tracking-wider font-mono block mb-2">
          Weather Conditions to Morph Into:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {weatherPresets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => onUpdateWeather(preset.data)}
              className={`p-2.5 rounded-lg border text-left transition-all ${
                weatherData.condition === preset.data.condition
                  ? 'border-zinc-900 bg-white shadow-xs'
                  : 'border-zinc-200 bg-white/70 hover:bg-white text-zinc-600'
              }`}
            >
              <div className="font-semibold text-zinc-900 text-xs font-sans">{preset.name}</div>
              <div className="font-mono text-xs text-zinc-500 mt-0.5">{preset.data.temp}°F · {preset.data.high}° / {preset.data.low}°</div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};
