import React from 'react';
import { VariationId, AnimationParams, WeatherData, ActivePulse } from '../types/clock';
import { VARIATIONS } from '../utils/variations';
import { AcousticCircleCanvas } from './AcousticCircleCanvas';

interface Props {
  selectedId: VariationId;
  onSelectVariation: (id: VariationId) => void;
  onFocusVariation: (id: VariationId) => void;
  hours: number;
  minutes: number;
  seconds: number;
  fraction: number;
  rawTimestamp: number;
  params: AnimationParams;
  activePulses: ActivePulse[];
  weatherData: WeatherData;
}

export const VariationsGrid: React.FC<Props> = ({
  selectedId,
  onSelectVariation,
  onFocusVariation,
  hours,
  minutes,
  seconds,
  fraction,
  rawTimestamp,
  params,
  activePulses,
  weatherData,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      
      {/* Intro Header */}
      <div className="mb-10 text-center max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-zinc-900 font-sans">
          {VARIATIONS.length} Acoustic Circumference Studies
        </h1>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed font-sans">
          Exploring Westworld supercomputer AI circumference ripple dynamics. The wave originates at the active second needle (the thickest mass), radiating clockwise and counter-clockwise simultaneously around the perimeter to meet at the opposite side.
        </p>
      </div>

      {/* 3x3 Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {VARIATIONS.map((v) => {
          const isSelected = v.id === selectedId;

          return (
            <div
              key={v.id}
              onClick={() => onSelectVariation(v.id)}
              className={`group relative flex flex-col items-center bg-white border rounded-xl p-6 transition-all cursor-pointer ${
                isSelected
                  ? 'border-zinc-900 shadow-md ring-1 ring-zinc-900'
                  : 'border-zinc-200 hover:border-zinc-400 hover:shadow-xs'
              }`}
            >
              {/* Card Header info */}
              <div className="w-full flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-zinc-400">
                      0{v.index}
                    </span>
                    <span className="text-zinc-300">·</span>
                    <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">
                      {v.name}
                    </h3>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                    {v.subtitle}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFocusVariation(v.id);
                  }}
                  className="px-2 py-1 text-[10px] font-mono rounded border border-zinc-200 text-zinc-600 hover:bg-zinc-900 hover:text-white hover:border-zinc-900 transition-colors shrink-0"
                >
                  Focus
                </button>
              </div>

              {/* Canvas Centerpiece */}
              <div className="my-2 p-2 flex items-center justify-center">
                <AcousticCircleCanvas
                  variation={v.id}
                  size={260}
                  hours={hours}
                  minutes={minutes}
                  seconds={seconds}
                  fraction={fraction}
                  rawTimestamp={rawTimestamp}
                  params={params}
                  activePulses={activePulses}
                  weatherData={weatherData}
                  showCenterText={true}
                />
              </div>

              {/* Physics explanation & tag */}
              <div className="w-full mt-4 pt-4 border-t border-zinc-100 flex flex-col justify-between gap-2">
                <p className="text-[12px] text-zinc-600 leading-normal line-clamp-2">
                  {v.description}
                </p>
                <div className="text-[10px] font-mono text-zinc-400 tracking-wide">
                  {v.physicsTag}
                </div>
              </div>

              {/* Indicator of active selection */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-zinc-900" />
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
