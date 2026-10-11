import React from 'react';

export type ViewMode = 'grid' | 'focus' | 'morph';

interface Props {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onTriggerPulse: () => void;
  isLiveTime: boolean;
  onToggleLiveTime: () => void;
}

export const HeaderNav: React.FC<Props> = ({
  currentView,
  onSelectView,
  onTriggerPulse,
  isLiveTime,
  onToggleLiveTime,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-zinc-200 bg-white sticky top-0 z-40">
      {/* Zone 1: Single text wordmark */}
      <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectView('grid');
          }}
          className="text-base font-semibold tracking-tight text-zinc-900 uppercase font-mono"
        >
          Acoustic Horizon
        </a>
        <span className="text-zinc-300 text-xs select-none">/</span>
        <span className="text-xs text-zinc-500 font-mono tracking-wider">Westworld Rehoboam Studies</span>
      </div>

      {/* Zone 2: Single-line view mode switches */}
      <nav className="flex items-center gap-1 bg-zinc-100 p-1 rounded-md text-xs font-medium text-zinc-600">
        <button
          onClick={() => onSelectView('grid')}
          className={`px-3 py-1.5 rounded transition-all whitespace-nowrap shrink-0 ${
            currentView === 'grid'
              ? 'bg-white text-zinc-900 shadow-xs font-semibold'
              : 'hover:text-zinc-900 text-zinc-600'
          }`}
        >
          9 Variations Grid
        </button>
        <button
          onClick={() => onSelectView('focus')}
          className={`px-3 py-1.5 rounded transition-all whitespace-nowrap shrink-0 ${
            currentView === 'focus'
              ? 'bg-white text-zinc-900 shadow-xs font-semibold'
              : 'hover:text-zinc-900 text-zinc-600'
          }`}
        >
          Solo Focus Circle
        </button>
        <button
          onClick={() => onSelectView('morph')}
          className={`px-3 py-1.5 rounded transition-all whitespace-nowrap shrink-0 ${
            currentView === 'morph'
              ? 'bg-white text-zinc-900 shadow-xs font-semibold'
              : 'hover:text-zinc-900 text-zinc-600'
          }`}
        >
          Fluid Weather Morph
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleLiveTime}
          className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors whitespace-nowrap shrink-0 ${
            isLiveTime
              ? 'border-zinc-300 text-zinc-700 bg-white hover:bg-zinc-50'
              : 'border-zinc-900 bg-zinc-900 text-white'
          }`}
        >
          {isLiveTime ? 'Sync: Live Time' : 'Time Scrub Mode'}
        </button>
        <button
          onClick={onTriggerPulse}
          className="px-4 py-1.5 text-xs font-medium text-white bg-zinc-900 rounded hover:bg-zinc-800 transition-colors whitespace-nowrap shrink-0 font-mono"
        >
          Manual Pulse
        </button>
      </div>
    </header>
  );
};
