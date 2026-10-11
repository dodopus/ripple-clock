import React from 'react';
import { AnimationParams } from '../types/clock';

interface Props {
  params: AnimationParams;
  onChange: (updated: Partial<AnimationParams>) => void;
  onReset: () => void;
}

export const ParametersDrawer: React.FC<Props> = ({ params, onChange, onReset }) => {
  return (
    <div className="bg-white border-b border-zinc-200 px-6 py-4 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Sliders Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 flex-1 text-xs">
          
          {/* Natural Decay Lifetime (Default: 2.8s) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline text-zinc-600 font-mono gap-1">
              <span className="font-medium text-zinc-800 whitespace-nowrap">Natural Decay</span>
              <span className="font-bold text-zinc-900 shrink-0">{params.decayDuration.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="6.0"
              step="0.1"
              value={params.decayDuration}
              onChange={(e) => onChange({ decayDuration: parseFloat(e.target.value) })}
              className="accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none w-full"
            />
            <span className="text-[10px] text-zinc-400">Persistence before fade</span>
          </div>

          {/* Wave Transit Duration / Speed (Default: 2.3s) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline text-zinc-600 font-mono gap-1">
              <span className="font-medium text-zinc-800 whitespace-nowrap">Transit Time</span>
              <span className="font-bold text-zinc-900 shrink-0">{params.speed.toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="0.3"
              max="3.5"
              step="0.1"
              value={params.speed}
              onChange={(e) => onChange({ speed: parseFloat(e.target.value) })}
              className="accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none w-full"
            />
            <span className="text-[10px] text-zinc-400">Circumference travel speed</span>
          </div>

          {/* Peak Origin Thickness (Default: 1.5x) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline text-zinc-600 font-mono gap-1">
              <span className="font-medium text-zinc-800 whitespace-nowrap">Peak Swell</span>
              <span className="font-bold text-zinc-900 shrink-0">{params.peakThickness.toFixed(1)}×</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="4.0"
              step="0.1"
              value={params.peakThickness}
              onChange={(e) => onChange({ peakThickness: parseFloat(e.target.value) })}
              className="accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none w-full"
            />
            <span className="text-[10px] text-zinc-400">Thickness at active second</span>
          </div>

          {/* Wave Amplitude (Default: 0.2x) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline text-zinc-600 font-mono gap-1">
              <span className="font-medium text-zinc-800 whitespace-nowrap">Amplitude</span>
              <span className="font-bold text-zinc-900 shrink-0">{params.amplitude.toFixed(1)}×</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.05"
              value={params.amplitude}
              onChange={(e) => onChange({ amplitude: parseFloat(e.target.value) })}
              className="accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none w-full"
            />
            <span className="text-[10px] text-zinc-400">Radial wave distortion</span>
          </div>

          {/* Wave Ripple Frequency (Default: 10) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline text-zinc-600 font-mono gap-1">
              <span className="font-medium text-zinc-800 whitespace-nowrap">Frequency</span>
              <span className="font-bold text-zinc-900 shrink-0">{params.frequency}</span>
            </div>
            <input
              type="range"
              min="3"
              max="20"
              step="1"
              value={params.frequency}
              onChange={(e) => onChange({ frequency: parseInt(e.target.value, 10) })}
              className="accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none w-full"
            />
            <span className="text-[10px] text-zinc-400">Ripples in wave packet</span>
          </div>

          {/* Base Stroke Width (Default: 1.5px) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline text-zinc-600 font-mono gap-1">
              <span className="font-medium text-zinc-800 whitespace-nowrap">Base Stroke</span>
              <span className="font-bold text-zinc-900 shrink-0">{params.strokeWidth.toFixed(1)}px</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="5.0"
              step="0.5"
              value={params.strokeWidth}
              onChange={(e) => onChange({ strokeWidth: parseFloat(e.target.value) })}
              className="accent-zinc-900 cursor-pointer h-1.5 bg-zinc-200 rounded-lg appearance-none w-full"
            />
            <span className="text-[10px] text-zinc-400">Circle line weight</span>
          </div>

        </div>

        {/* Controls Row: Direction, Motion Smoothing, Hands & Digits */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-zinc-100 text-xs">
          
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            
            {/* Direction Segmented Control: Clockwise (Default) | Counter | Both */}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-zinc-500 whitespace-nowrap">Direction:</span>
              <div className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded border border-zinc-200">
                <button
                  onClick={() => onChange({ direction: 'clockwise' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.direction === 'clockwise'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Ripples push only clockwise along circumference (Default)"
                >
                  Clockwise ↷
                </button>
                <button
                  onClick={() => onChange({ direction: 'counter' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.direction === 'counter'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Ripples push only counter-clockwise along circumference"
                >
                  Counter ↶
                </button>
                <button
                  onClick={() => onChange({ direction: 'both' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.direction === 'both'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Ripples split into clockwise & counter-clockwise branches simultaneously"
                >
                  Both ⟷
                </button>
              </div>
            </div>

            {/* Continuous vs 1-Sec Tick Mode */}
            <button
              onClick={() => onChange({ continuous: !params.continuous })}
              className={`px-2.5 py-1 rounded font-mono border text-[11px] transition-colors whitespace-nowrap ${
                params.continuous
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              {params.continuous ? 'Continuous Flow' : '1-Sec Tick Pulse'}
            </button>

            {/* Motion Smoothing Adjuster (Eliminates harsh tick jolt) */}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-zinc-500 whitespace-nowrap">Second Motion:</span>
              <div className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded border border-zinc-200">
                <button
                  onClick={() => onChange({ secondMotion: 'smooth' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.secondMotion === 'smooth'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Fluid continuous liquid glide (zero tick jolt)"
                >
                  Smooth Sweep 〰
                </button>
                <button
                  onClick={() => onChange({ secondMotion: 'spring' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.secondMotion === 'spring'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Soft damped mechanical spring click (removes harsh jolt while preserving cadence)"
                >
                  Damped Spring ⤹
                </button>
                <button
                  onClick={() => onChange({ secondMotion: 'step' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.secondMotion === 'step'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Discrete quartz step"
                >
                  Quartz Step ⇥
                </button>
              </div>
            </div>

            {/* Hands Mode: Digital vs Analog vs Hybrid */}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-zinc-500 whitespace-nowrap">Display Hands:</span>
              <div className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded border border-zinc-200">
                <button
                  onClick={() => onChange({ handsMode: 'digital' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.handsMode === 'digital'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Digital
                </button>
                <button
                  onClick={() => onChange({ handsMode: 'analog' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.handsMode === 'analog'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Analog Hands
                </button>
                <button
                  onClick={() => onChange({ handsMode: 'hybrid' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.handsMode === 'hybrid'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  Hybrid
                </button>
              </div>
            </div>

            {/* Show / Hide Seconds Toggle */}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-zinc-500 whitespace-nowrap">Seconds:</span>
              <button
                onClick={() => onChange({ showDigitalSeconds: !params.showDigitalSeconds })}
                className={`px-2 py-1 rounded border text-[11px] font-mono transition-colors whitespace-nowrap ${
                  params.showDigitalSeconds
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {params.showDigitalSeconds ? 'Show :SS' : 'Hide :SS'}
              </button>
            </div>

            {/* Digit Transition Mode: Roll / Fade / Instant */}
            <div className="flex items-center gap-1.5 font-mono text-[11px]">
              <span className="text-zinc-500 whitespace-nowrap">Digits:</span>
              <div className="flex items-center gap-0.5 bg-zinc-100 p-0.5 rounded border border-zinc-200">
                <button
                  onClick={() => onChange({ digitTransition: 'roll' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.digitTransition === 'roll'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Odometer vertical rolling reel animation"
                >
                  Roll ⮁
                </button>
                <button
                  onClick={() => onChange({ digitTransition: 'fade' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.digitTransition === 'fade'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Cross-fade transition"
                >
                  Fade ◌
                </button>
                <button
                  onClick={() => onChange({ digitTransition: 'instant' })}
                  className={`px-2 py-1 rounded text-[11px] transition-colors whitespace-nowrap ${
                    params.digitTransition === 'instant'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  title="Direct instant update"
                >
                  Instant ⚡
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {/* Charcoal Tone Selector */}
            <select
              value={params.charcoalTone}
              onChange={(e) => onChange({ charcoalTone: e.target.value as any })}
              aria-label="Charcoal Tone"
              className="px-2 py-1 rounded font-mono border border-zinc-200 bg-white text-zinc-800 text-[11px] cursor-pointer"
            >
              <option value="charcoal">Charcoal (#18181b)</option>
              <option value="obsidian">Obsidian (#09090b)</option>
              <option value="slate">Slate (#334155)</option>
              <option value="graphite">Graphite (#292524)</option>
            </select>

            {/* Reset Defaults */}
            <button
              onClick={onReset}
              className="text-[11px] text-zinc-400 hover:text-zinc-800 underline underline-offset-4 font-mono whitespace-nowrap"
              title="Reset to your exact preferred settings"
            >
              Reset Defaults
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
