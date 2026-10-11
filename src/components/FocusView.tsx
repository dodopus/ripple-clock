import React from 'react';
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
  onOpenMorph: () => void;
}

export const FocusView: React.FC<Props> = ({
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
  onOpenMorph,
}) => {
  const currentIndex = VARIATIONS.findIndex((v) => v.id === selectedId);
  const activeVar = VARIATIONS[currentIndex] || VARIATIONS[0];

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + VARIATIONS.length) % VARIATIONS.length;
    onSelectVariation(VARIATIONS[prevIdx].id);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % VARIATIONS.length;
    onSelectVariation(VARIATIONS[nextIdx].id);
  };

  // Compute angles for readout
  const secAngleDeg = Math.round((seconds / 60) * 360);
  const antipodeDeg = (secAngleDeg + 180) % 360;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col items-center">
      
      {/* Top Selector Bar & Navigation */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 pb-6 border-b border-zinc-100">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            className="p-2 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors"
            title="Previous variation"
          >
            ←
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-zinc-400">
                0{activeVar.index} / 09
              </span>
              <span className="text-zinc-300">·</span>
              <h2 className="text-lg font-semibold text-zinc-900 tracking-tight font-sans">
                {activeVar.name}
              </h2>
            </div>
            <p className="text-xs text-zinc-500 font-mono">
              {activeVar.subtitle} · {activeVar.physicsTag}
            </p>
          </div>
          <button
            onClick={handleNext}
            className="p-2 rounded border border-zinc-200 hover:bg-zinc-50 text-zinc-600 transition-colors"
            title="Next variation"
          >
            →
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick select numbered pill-less tabs */}
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-md text-xs font-mono">
            {VARIATIONS.map((v) => (
              <button
                key={v.id}
                onClick={() => onSelectVariation(v.id)}
                className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
                  v.id === selectedId
                    ? 'bg-white font-bold text-zinc-900 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                0{v.index}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenMorph}
            className="px-3 py-1.5 text-xs font-medium bg-zinc-900 text-white rounded hover:bg-zinc-800 transition-colors whitespace-nowrap ml-2"
          >
            Test Weather Morph →
          </button>
        </div>
      </div>

      {/* Massive Focal Canvas */}
      <div className="my-8 relative flex items-center justify-center">
        {/* Big circle display */}
        <AcousticCircleCanvas
          variation={activeVar.id}
          size={580}
          hours={hours}
          minutes={minutes}
          seconds={seconds}
          fraction={fraction}
          rawTimestamp={rawTimestamp}
          params={params}
          activePulses={activePulses}
          weatherData={weatherData}
          showCenterText={true}
          className="max-w-[88vw] max-h-[75vh]"
        />
      </div>

      {/* Acoustic Circumferential Wave Propagation Telemetry */}
      <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-5 gap-4 p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 text-xs">
        <div>
          <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-400 block">
            Origin Second
          </span>
          <span className="font-mono font-medium text-zinc-900 text-sm mt-0.5 block">
            {seconds}s ({secAngleDeg}°)
          </span>
          <span className="text-[10px] text-zinc-500">Thickest wave crest</span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-400 block">
            Active Waves
          </span>
          <span className="font-mono font-medium text-zinc-900 text-sm mt-0.5 block">
            {activePulses.length || 1} in medium
          </span>
          <span className="text-[10px] text-zinc-500">Continuous superposition</span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-400 block">
            Natural Decay
          </span>
          <span className="font-mono font-medium text-zinc-900 text-sm mt-0.5 block">
            {params.decayDuration.toFixed(1)}s lifetime
          </span>
          <span className="text-[10px] text-zinc-500">Gradual wave fade</span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-400 block">
            Wave Vector
          </span>
          <span className="font-mono font-medium text-zinc-900 text-sm mt-0.5 block capitalize">
            {params.direction === 'clockwise' ? 'Clockwise ↷' : params.direction === 'counter' ? 'Counter ↶' : 'Both (Symmetric)'}
          </span>
          <span className="text-[10px] text-zinc-500">
            {params.direction === 'both' ? `Collides at ${(seconds + 30) % 60}s (${antipodeDeg}°)` : 'Directional perimeter sweep'}
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider font-mono text-zinc-400 block">
            Transit Speed
          </span>
          <span className="font-mono font-medium text-zinc-900 text-sm mt-0.5 block">
            {params.speed.toFixed(1)}s transit
          </span>
          <span className="text-[10px] text-zinc-500">{params.amplitude}× amplitude</span>
        </div>
      </div>

      {/* Full Physics Description */}
      <div className="mt-6 max-w-2xl text-center text-xs text-zinc-500 leading-relaxed">
        <p>{activeVar.description}</p>
      </div>

    </div>
  );
};
