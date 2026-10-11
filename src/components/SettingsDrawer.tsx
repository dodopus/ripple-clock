import React, { useState, useEffect } from 'react';
import {
  VariationId,
  AnimationParams,
  WeatherData,
  ClockFontFamily,
  GlowMode,
  RingLayer,
  ClockPreset,
  RingGradientType,
} from '../types/clock';
import { VARIATIONS } from '../utils/variations';
import { GLOW_PRESETS, isColorDark } from '../utils/math';
import {
  CLOCK_PRESETS,
  CUTE_NEON_PALETTE,
  DEFAULT_PRIMARY_RING,
} from '../utils/presets';
import { ExportBar } from '../pen/ExportBar';

interface Props {
  isOpen?: boolean;
  onToggleOpen?: () => void;
  onClose?: () => void;
  selectedVariation: VariationId;
  onSelectVariation: (id: VariationId) => void;
  params: AnimationParams;
  onChangeParams: (updated: Partial<AnimationParams>) => void;
  onResetParams: () => void;
  onApplyPreset: (preset: ClockPreset) => void;
  morphProgress: number;
  onChangeMorph: (val: number) => void;
  isAutoMorphing: boolean;
  onToggleAutoMorph: () => void;
  isLiveTime: boolean;
  onToggleLiveTime: () => void;
  scrubSecond: number;
  onChangeScrubSecond: (sec: number) => void;
  onTriggerPulse: () => void;
  onStepFrame?: (delta?: number) => void;
  activeWavesCount: number;
  weatherData: WeatherData;
}

type LayoutStyle = 'sidebar' | 'topbar';

const FONT_OPTIONS: { id: ClockFontFamily; name: string }[] = [
  { id: 'jetbrains', name: 'JetBrains Mono' },
  { id: 'jakarta', name: 'Plus Jakarta' },
  { id: 'space', name: 'Space Grotesk' },
  { id: 'syne', name: 'Syne Avant' },
  { id: 'cinzel', name: 'Cinzel Classic' },
];

const GLOW_OPTIONS: { id: GlowMode; label: string; hint: string }[] = [
  { id: 'none', label: 'None', hint: 'Pure monochrome ink' },
  { id: 'ember', label: 'Ember', hint: 'Warm amber acoustic aura' },
  { id: 'cyan', label: 'Cyan Abyss', hint: 'Bioluminescent phosphor' },
  { id: 'violet', label: 'Ultraviolet', hint: 'Deep indigo aura' },
  { id: 'chromatic', label: 'Prism', hint: 'Cyan/magenta dispersion' },
  { id: 'sage', label: 'Sage', hint: 'Radar phosphor green' },
  { id: 'crimson', label: 'Crimson', hint: 'Delos anomaly core' },
  { id: 'aurora', label: 'Aurora', hint: 'Dual-tone teal/lavender' },
];

export const SettingsDrawer: React.FC<Props> = ({
  isOpen: propIsOpen,
  onToggleOpen,
  onClose,
  selectedVariation,
  onSelectVariation,
  params,
  onChangeParams,
  onResetParams,
  onApplyPreset,
  morphProgress,
  onChangeMorph,
  isAutoMorphing,
  onToggleAutoMorph,
  isLiveTime,
  onToggleLiveTime,
  scrubSecond,
  onChangeScrubSecond,
  onTriggerPulse,
  onStepFrame,
  activeWavesCount,
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const isOpen = propIsOpen !== undefined ? propIsOpen : internalOpen;
  const setIsOpen = (val: boolean) => {
    if (val) {
      if (onToggleOpen && !isOpen) onToggleOpen();
      else setInternalOpen(true);
    } else {
      if (onClose) onClose();
      else setInternalOpen(false);
    }
  };

  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>('sidebar');
  const [selectedPresetCategory, setSelectedPresetCategory] = useState<string>('All');

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    presets: true,
    theme: true,
    time: true,
    rings: true,
    solomon: false,
    membrane: false,
    motion: false,
    physics: false,
    bias: false,
    colors: false,
    typography: false,
    studies: false,
    weather: false,
  });

  const toggleSection = (sec: string) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentVar = VARIATIONS.find((v) => v.id === selectedVariation) || VARIATIONS[0];

  // Ring layers management
  const rings = params.rings && params.rings.length > 0 ? params.rings : [DEFAULT_PRIMARY_RING];

  const handleAddRing = () => {
    const randomPalette = CUTE_NEON_PALETTE[Math.floor(Math.random() * (CUTE_NEON_PALETTE.length - 3))];
    const newRing: RingLayer = {
      id: `ring-${Date.now()}`,
      name: `Neon Halo ${rings.length}`,
      visible: true,
      color: randomPalette.hex,
      gradientType: 'solid',
      secondaryColor: '#c084fc',
      timeOffset: -0.35,
      radiusOffset: 12 + (rings.length - 1) * 8,
      offsetX: 0,
      offsetY: 0,
      strokeWidth: 1.5,
      blur: 2.0,
      opacity: 0.85,
      blendMode: 'source-over',
    };
    // Spawn "on top"
    onChangeParams({ rings: [newRing, ...rings] });
  };

  const handleUpdateRing = (index: number, updated: Partial<RingLayer>) => {
    const newRings = [...rings];
    newRings[index] = { ...newRings[index], ...updated };
    onChangeParams({ rings: newRings });
  };

  const handleDeleteRing = (index: number) => {
    if (rings.length <= 1) return; // Keep at least one ring
    const newRings = rings.filter((_, i) => i !== index);
    onChangeParams({ rings: newRings });
  };

  const handleMoveRing = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= rings.length) return;
    const newRings = [...rings];
    const temp = newRings[index];
    newRings[index] = newRings[newIndex];
    newRings[newIndex] = temp;
    onChangeParams({ rings: newRings });
  };

  // Section Resets
  const resetSection = (sec: string) => {
    switch (sec) {
      case 'presets':
        onResetParams();
        break;
      case 'time':
        onChangeParams({
          speedMultiplier: 1.0,
          isPaused: false,
          timeSource: 'system',
          customHours: 4,
          customMinutes: 17,
          customSeconds: 39,
          customTimeRunning: false,
        });
        break;
      case 'solomon':
        onChangeParams({
          showSolomonTelemetry: false,
          solomonStatusText: 'SYSTEM INITIATED',
          solomonLocationText: 'UNDISCLOSED LOCATION',
          solomonBuildText: "'SOLOMON' BUILD 0.06",
          solomonAnomalyAngle: -0.65,
        });
        break;
      case 'rings':
        onChangeParams({ rings: [DEFAULT_PRIMARY_RING] });
        break;
      case 'membrane':
        onChangeParams({
          membraneStretch: 0,
          membraneWidth: 0.36,
          membraneFollowHand: true,
        });
        break;
      case 'motion':
        onChangeParams({
          tickDuration: 0.28,
          elasticTension: 0.45,
          dampingFactor: 0.8,
          secondMotion: 'spring',
        });
        break;
      case 'physics':
        onChangeParams({
          speed: 2.3,
          decayDuration: 2.8,
          amplitude: 0.2,
          frequency: 10,
          strokeWidth: 1.5,
          peakThickness: 1.5,
          attackDuration: 0.18,
          initialStrokeWeight: 2.0,
          strokeTaperRate: 1.2,
        });
        break;
      case 'bias':
        onChangeParams({
          direction: 'clockwise',
          directionBias: 50,
          collisionMode: 'constructive',
        });
        break;
      case 'colors':
        onChangeParams({
          glowMode: 'none',
          glowIntensity: 25,
          timeColors: {
            splitBySection: false,
            primary: '#18181b',
            hours: '#18181b',
            minutes: '#18181b',
            seconds: '#18181b',
            separator: '#71717a',
          },
        });
        break;
      case 'typography':
        onChangeParams({
          fontFamily: 'jetbrains',
          digitTransition: 'morph',
          handsMode: 'digital',
          numberScale: 1.0,
          showDigitalSeconds: true,
          timeLayer: 'over',
        });
        break;
    }
  };

  const filteredPresets = selectedPresetCategory === 'All'
    ? CLOCK_PRESETS
    : CLOCK_PRESETS.filter((p) => p.category === selectedPresetCategory);

  const presetCategories = ['All', 'Minimal', 'Neon & Glow', 'Elastic & Organic', 'Mechanical', 'Complex Waves'];

  return (
    <>
      {/* 
        ============================================================
        TOP BAR FULL-WIDTH MODE
        ============================================================
      */}
      {layoutStyle === 'topbar' && (
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 border-b border-zinc-200/80 shadow-xs transition-all duration-200 font-sans text-xs select-none">
          <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-mono font-bold text-[11px] text-zinc-900 tracking-tight shrink-0">
                Acoustic Laboratory
              </span>
              <div className="h-3 w-px bg-zinc-200" />
              <button
                onClick={handleAddRing}
                className="px-2 py-0.5 bg-zinc-900 text-white rounded font-mono text-[10px] hover:bg-zinc-800 cursor-pointer"
              >
                + Add Ring ({rings.length})
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLayoutStyle('sidebar')}
                className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-mono text-[10px] cursor-pointer"
              >
                Sidebar Mode ⇲
              </button>
              <button
                onClick={onResetParams}
                className="px-2 py-1 rounded text-zinc-500 hover:text-zinc-900 font-mono text-[10px] cursor-pointer"
              >
                Reset All
              </button>
            </div>
          </div>
        </header>
      )}

      {/* 
        ============================================================
        SIDEBAR DRAWER MODE (DEFAULT)
        Pill Trigger Button + Slide-out Sidebar
        NO backdrop scrim and NO blur so the clock remains completely clear!
        ============================================================
      */}
      {layoutStyle === 'sidebar' && (
        <>
          {/* Floating Gear Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-200 cursor-pointer group shadow-sm ${
              isOpen
                ? 'bg-zinc-900 text-white border-zinc-900'
                : 'bg-white/90 text-zinc-800 border-zinc-200 hover:border-zinc-400 hover:bg-white'
            }`}
            title="Configure Clock & Laboratory"
            aria-label="Toggle Settings Panel"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-500 ${isOpen ? 'rotate-90 text-white' : 'text-zinc-700 group-hover:rotate-90'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="font-mono text-[11px] font-medium">
              {isOpen ? 'Close' : 'Settings'}
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full border border-zinc-200/50 bg-zinc-100 text-zinc-500">
              {currentVar.index < 10 ? `0${currentVar.index}` : currentVar.index}
            </span>
          </button>

          {/* 
            Slide-Over Sidebar Drawer:
            Docks on the right. Main pane shrinks to the left without covering the clock!
            No backdrop scrim and No blur.
          */}
          <aside
            className={`fixed top-0 right-0 h-full w-[380px] max-w-[94vw] bg-white border-l border-zinc-200 shadow-xl z-40 flex flex-col font-sans text-xs select-none transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
            }`}
            aria-label="Clock Configuration Drawer"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-zinc-50/80">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-zinc-900 font-mono tracking-tight text-xs uppercase">
                    Acoustic Lab
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">
                    ({activeWavesCount} in medium · {rings.length} rings)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={onResetParams}
                  className="px-2 py-1 rounded text-[10px] font-mono text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors cursor-pointer"
                  title="Reset all settings to default"
                >
                  ↺ Reset All
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors text-xs font-mono cursor-pointer"
                  title="Close Settings (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            <ExportBar config={{ variation: selectedVariation, params }} />

            {/* Scrollable Collapsible Sections */}
            <div className="overflow-y-auto px-4 py-3 space-y-3 flex-1 scrollbar-thin">
              
              {/* ======================================================== */}
              {/* SECTION 1: 20 CURATED PRESETS                            */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('presets')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      ✨ Presets (20 Curated Styles)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSection('presets');
                      }}
                      className="text-[9px] font-mono text-zinc-400 hover:text-zinc-800 underline cursor-pointer"
                      title="Reset presets"
                    >
                      ↺
                    </button>
                    <span className="text-zinc-400 text-xs">
                      {openSections.presets ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.presets && (
                  <div className="p-3 space-y-2 border-t border-zinc-100">
                    {/* Category tabs */}
                    <div className="flex flex-wrap gap-1">
                      {presetCategories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSelectedPresetCategory(cat)}
                          className={`px-2 py-0.5 rounded text-[9px] font-mono cursor-pointer transition-all ${
                            selectedPresetCategory === cat
                              ? 'bg-zinc-900 text-white font-medium shadow-2xs'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    {/* Presets Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
                      {filteredPresets.map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => onApplyPreset(preset)}
                          className="flex flex-col text-left p-2 rounded border border-zinc-200/60 hover:border-zinc-400 hover:bg-zinc-50/80 transition-all cursor-pointer group"
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono font-bold text-[10px] text-zinc-900 group-hover:text-black truncate">
                              {preset.name}
                            </span>
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: preset.tagColor }}
                            />
                          </div>
                          <p className="text-[9px] text-zinc-400 line-clamp-2 mt-0.5 leading-snug font-sans">
                            {preset.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION: CANVAS BACKGROUND COLOUR & THEME                */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('theme')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      🌌 Background Colour & Theme
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: params.backgroundColor || '#ffffff' }}
                      title={`Current Background: ${params.backgroundColor || '#ffffff'}`}
                    />
                    <span className="text-zinc-400 text-xs">
                      {openSections.theme ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.theme && (
                  <div className="p-3 space-y-3 border-t border-zinc-100 font-mono text-[10px]">
                    {/* One-Click Flip Button */}
                    <div>
                      <button
                        onClick={() => {
                          const currentlyDark = isColorDark(params.backgroundColor);
                          const nextBg = currentlyDark ? '#ffffff' : '#000000';
                          const nextInk = currentlyDark ? '#18181b' : '#ffffff';
                          onChangeParams({
                            backgroundColor: nextBg,
                            timeColors: {
                              ...params.timeColors,
                              primary: nextInk,
                              hours: nextInk,
                              minutes: nextInk,
                              seconds: nextInk,
                            },
                            rings: (params.rings || [DEFAULT_PRIMARY_RING]).map((r, i) =>
                              i === 0 ? { ...r, color: nextInk } : r
                            ),
                          });
                        }}
                        className="w-full py-1.5 px-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded font-mono text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-xs"
                      >
                        <span>⇄</span>
                        <span>Invert Palette (Black ⇋ White)</span>
                      </button>
                    </div>

                    {/* Quick Background Swatches */}
                    <div>
                      <span className="text-zinc-500 uppercase tracking-wider text-[9px] block mb-1">
                        Preset Background Tones:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { name: 'Void Black', hex: '#000000', tag: 'OLED Void' },
                          { name: 'Obsidian Noir', hex: '#09090b', tag: 'Dark Onyx' },
                          { name: 'Slate Abyss', hex: '#0f172a', tag: 'Navy Slate' },
                          { name: 'Paper White', hex: '#ffffff', tag: 'Clean Paper' },
                          { name: 'Warm Chalk', hex: '#fafaf9', tag: 'Warm Studio' },
                          { name: 'Muted Mist', hex: '#f1f5f9', tag: 'Soft Light' },
                        ].map((swatch) => {
                          const isSelected = (params.backgroundColor || '#ffffff').toLowerCase() === swatch.hex.toLowerCase();
                          return (
                            <button
                              key={swatch.hex}
                              onClick={() => {
                                const newDark = isColorDark(swatch.hex);
                                const defaultInk = newDark ? '#ffffff' : '#18181b';
                                onChangeParams({
                                  backgroundColor: swatch.hex,
                                  timeColors: {
                                    ...params.timeColors,
                                    primary: defaultInk,
                                    hours: defaultInk,
                                    minutes: defaultInk,
                                    seconds: defaultInk,
                                  },
                                  rings: (params.rings || [DEFAULT_PRIMARY_RING]).map((r, i) =>
                                    i === 0 ? { ...r, color: defaultInk } : r
                                  ),
                                });
                              }}
                              className={`flex items-center gap-1.5 p-1.5 rounded border transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-zinc-900 ring-1 ring-zinc-900 bg-zinc-50'
                                  : 'border-zinc-200 hover:border-zinc-400 bg-white'
                              }`}
                            >
                              <span
                                className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/15 shadow-2xs"
                                style={{ backgroundColor: swatch.hex }}
                              />
                              <div className="flex flex-col text-left overflow-hidden">
                                <span className="text-[9px] text-zinc-800 font-bold truncate leading-tight">
                                  {swatch.name}
                                </span>
                                <span className="text-[7.5px] text-zinc-400 truncate leading-tight">
                                  {swatch.tag}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Custom Color Input */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-100 gap-2">
                      <span className="text-zinc-600 text-[9px] uppercase tracking-wider">
                        Custom Hex Colour:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={params.backgroundColor || '#ffffff'}
                          onChange={(e) => onChangeParams({ backgroundColor: e.target.value })}
                          className="w-6 h-6 p-0 border border-zinc-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={params.backgroundColor || '#ffffff'}
                          onChange={(e) => onChangeParams({ backgroundColor: e.target.value })}
                          placeholder="#000000"
                          className="w-18 px-1.5 py-0.5 border border-zinc-200 rounded font-mono text-[10px] text-zinc-800"
                        />
                      </div>
                    </div>

                    <p className="text-[8.5px] text-zinc-400 leading-normal pt-1 border-t border-zinc-100">
                      💡 Ring linework and center numerals dynamically auto-adapt to ensure high contrast against any light or dark background.
                    </p>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION: MASTER TIME FLOW, SPEED & CANVAS FREEZE         */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('time')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      ⏱️ Time Flow, Speed & Freeze
                    </span>
                    {params.isPaused && (
                      <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded font-mono text-[9px] font-bold">
                        FROZEN
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSection('time');
                      }}
                      className="text-[9px] font-mono text-zinc-400 hover:text-zinc-800 underline cursor-pointer"
                      title="Reset time controls"
                    >
                      ↺
                    </button>
                    <span className="text-zinc-400 text-xs">
                      {openSections.time ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.time && (
                  <div className="p-3 space-y-3 border-t border-zinc-100 font-mono text-[10px]">
                    {/* Freeze / Live Toggle & Step Frame */}
                    <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-800 text-[10px]">
                          Canvas Rendering:
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onChangeParams({ isPaused: !params.isPaused })}
                            className={`px-3 py-1 rounded-full font-bold cursor-pointer transition-all ${
                              params.isPaused
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-zinc-900 text-white'
                            }`}
                          >
                            {params.isPaused ? '▶ Resume Canvas' : '⏸ Freeze Canvas (Space)'}
                          </button>
                        </div>
                      </div>

                      {/* Step Frame button when paused for troubleshooting visual tears */}
                      {params.isPaused && (
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60">
                          <span className="text-zinc-500 text-[9px]">
                            Troubleshoot Frame-by-Frame:
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => onStepFrame && onStepFrame(1 / 60)}
                              className="px-2 py-0.5 rounded bg-white border border-zinc-300 hover:border-zinc-500 text-zinc-800 font-bold cursor-pointer shadow-2xs"
                              title="Advance 1 frame (16.6ms)"
                            >
                              +1 Frame
                            </button>
                            <button
                              onClick={() => onStepFrame && onStepFrame(1.0)}
                              className="px-2 py-0.5 rounded bg-white border border-zinc-300 hover:border-zinc-500 text-zinc-800 font-bold cursor-pointer shadow-2xs"
                              title="Advance 1 second"
                            >
                              +1 Sec
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Master Speed Multiplier */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-zinc-600">
                        <span className="font-bold">Master Speed Multiplier:</span>
                        <span className="font-bold text-zinc-900 text-[11px] bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200">
                          {(params.speedMultiplier ?? 1.0).toFixed(2)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.05"
                        value={params.speedMultiplier ?? 1.0}
                        onChange={(e) => onChangeParams({ speedMultiplier: parseFloat(e.target.value), isPaused: false })}
                        className="w-full h-1.5 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                      />
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {[0.0, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0].map((spd) => (
                          <button
                            key={spd}
                            onClick={() => onChangeParams({ speedMultiplier: spd, isPaused: spd === 0 })}
                            className={`px-1.5 py-0.5 rounded text-[9px] cursor-pointer transition-all ${
                              params.speedMultiplier === spd && !params.isPaused
                                ? 'bg-zinc-900 text-white font-bold'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            {spd === 0 ? '0x (Pause)' : `${spd}x`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Time Source: System Clock vs Custom Time */}
                    <div className="space-y-2 pt-1 border-t border-zinc-100">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-600 font-bold">Clock Source:</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => onChangeParams({ timeSource: 'system' })}
                            className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                              (params.timeSource || 'system') === 'system'
                                ? 'bg-zinc-900 text-white font-bold'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            Live System
                          </button>
                          <button
                            onClick={() => onChangeParams({ timeSource: 'custom' })}
                            className={`px-2 py-0.5 rounded cursor-pointer transition-all ${
                              params.timeSource === 'custom'
                                ? 'bg-zinc-900 text-white font-bold'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            Manual / Custom
                          </button>
                        </div>
                      </div>

                      {/* Custom Time Pickers */}
                      {params.timeSource === 'custom' && (
                        <div className="p-2.5 bg-zinc-50 rounded border border-zinc-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-zinc-700">Display Any Time:</span>
                            <button
                              onClick={() => onChangeParams({
                                customHours: 4,
                                customMinutes: 17,
                                customSeconds: 39,
                              })}
                              className="px-1.5 py-0.5 bg-zinc-900 text-white rounded text-[9px] hover:bg-zinc-800 cursor-pointer"
                              title="Set time to Solomon Divergence 04:17:39"
                            >
                              Solomon (04:17:39)
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <div className="text-[9px] text-zinc-500">Hours (HH)</div>
                              <input
                                type="number"
                                min="0"
                                max="23"
                                value={params.customHours ?? 4}
                                onChange={(e) => onChangeParams({ customHours: parseInt(e.target.value, 10) || 0 })}
                                className="w-full text-center font-bold text-zinc-900 bg-white border border-zinc-300 rounded py-0.5"
                              />
                            </div>
                            <div>
                              <div className="text-[9px] text-zinc-500">Minutes (MM)</div>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={params.customMinutes ?? 17}
                                onChange={(e) => onChangeParams({ customMinutes: parseInt(e.target.value, 10) || 0 })}
                                className="w-full text-center font-bold text-zinc-900 bg-white border border-zinc-300 rounded py-0.5"
                              />
                            </div>
                            <div>
                              <div className="text-[9px] text-zinc-500">Seconds (SS)</div>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={params.customSeconds ?? 39}
                                onChange={(e) => onChangeParams({ customSeconds: parseInt(e.target.value, 10) || 0 })}
                                className="w-full text-center font-bold text-zinc-900 bg-white border border-zinc-300 rounded py-0.5"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <label className="flex items-center gap-1.5 cursor-pointer text-[9px]">
                              <input
                                type="checkbox"
                                checked={params.customTimeRunning ?? false}
                                onChange={(e) => onChangeParams({ customTimeRunning: e.target.checked })}
                                className="accent-zinc-900 rounded"
                              />
                              <span className="text-zinc-700">Advance Custom Time with Speed Multiplier</span>
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 2: MULTI-RING LAYERS MANAGER                     */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('rings')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      ⭕ Ring Layers ({rings.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddRing();
                      }}
                      className="px-1.5 py-0.5 bg-zinc-900 text-white rounded text-[9px] font-mono hover:bg-zinc-800 cursor-pointer"
                      title="Add a new ring with a random cute neon color"
                    >
                      + Add Ring
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSection('rings');
                      }}
                      className="text-[9px] font-mono text-zinc-400 hover:text-zinc-800 underline cursor-pointer"
                      title="Reset rings"
                    >
                      ↺
                    </button>
                    <span className="text-zinc-400 text-xs">
                      {openSections.rings ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.rings && (
                  <div className="p-3 space-y-3 border-t border-zinc-100">
                    <div className="space-y-2">
                      {rings.map((ring, idx) => (
                        <div
                          key={ring.id}
                          className="p-2.5 rounded border border-zinc-200 bg-zinc-50/50 space-y-2"
                        >
                          {/* Row 1: Name, Layer Controls, Visibility, Delete */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] text-zinc-400">
                                #{idx + 1}
                              </span>
                              <input
                                type="text"
                                value={ring.name}
                                onChange={(e) => handleUpdateRing(idx, { name: e.target.value })}
                                className="font-mono text-[10px] font-bold text-zinc-800 bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-zinc-900 focus:outline-hidden w-24 truncate"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              {/* Move Up / Down */}
                              <button
                                disabled={idx === 0}
                                onClick={() => handleMoveRing(idx, 'up')}
                                className="px-1 text-[9px] font-mono text-zinc-500 hover:text-zinc-900 disabled:opacity-30 cursor-pointer"
                                title="Move ring forward in layer order"
                              >
                                ▲
                              </button>
                              <button
                                disabled={idx === rings.length - 1}
                                onClick={() => handleMoveRing(idx, 'down')}
                                className="px-1 text-[9px] font-mono text-zinc-500 hover:text-zinc-900 disabled:opacity-30 cursor-pointer"
                                title="Move ring backward in layer order"
                              >
                                ▼
                              </button>
                              {/* Toggle visibility */}
                              <button
                                onClick={() => handleUpdateRing(idx, { visible: ring.visible === false ? true : false })}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono cursor-pointer ${
                                  ring.visible !== false ? 'text-zinc-900 bg-zinc-200/60' : 'text-zinc-400 bg-zinc-100'
                                }`}
                                title="Toggle visibility"
                              >
                                {ring.visible !== false ? '👁' : '🚫'}
                              </button>
                              {/* Delete (if not primary) */}
                              {rings.length > 1 && (
                                <button
                                  onClick={() => handleDeleteRing(idx)}
                                  className="text-zinc-400 hover:text-red-600 px-1 text-[10px] font-mono cursor-pointer"
                                  title="Remove ring"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Color Picker & Cute Neon Swatches */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="color"
                                value={ring.color}
                                onChange={(e) => handleUpdateRing(idx, { color: e.target.value })}
                                className="w-5 h-5 rounded cursor-pointer border border-zinc-300 p-0"
                                title="Custom Color Picker"
                              />
                              <span className="font-mono text-[9px] text-zinc-600 uppercase">
                                {ring.color}
                              </span>
                            </div>

                            {/* Quick Cute Neon Swatches */}
                            <div className="flex items-center gap-1">
                              {CUTE_NEON_PALETTE.slice(0, 7).map((c) => (
                                <button
                                  key={c.name}
                                  onClick={() => handleUpdateRing(idx, { color: c.hex })}
                                  className="w-3.5 h-3.5 rounded-full border border-black/10 hover:scale-115 transition-transform cursor-pointer"
                                  style={{ backgroundColor: c.hex }}
                                  title={c.name}
                                />
                              ))}
                            </div>
                          </div>

                          {/* Row 3: Gradient mode */}
                          <div className="flex items-center justify-between text-[9px] font-mono">
                            <span className="text-zinc-500">Gradient:</span>
                            <div className="flex gap-1">
                              {(['solid', 'angular', 'radial-amplitude'] as RingGradientType[]).map((g) => (
                                <button
                                  key={g}
                                  onClick={() => handleUpdateRing(idx, { gradientType: g })}
                                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                                    ring.gradientType === g
                                      ? 'bg-zinc-900 text-white font-medium'
                                      : 'bg-zinc-200/60 text-zinc-600 hover:bg-zinc-300'
                                  }`}
                                >
                                  {g === 'solid' ? 'Solid' : g === 'angular' ? 'Conic' : 'Radial'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Row 4: Secondary Color if gradient */}
                          {ring.gradientType !== 'solid' && (
                            <div className="flex items-center justify-between text-[9px] font-mono">
                              <span className="text-zinc-500">Secondary Color:</span>
                              <div className="flex items-center gap-1">
                                <input
                                  type="color"
                                  value={ring.secondaryColor || '#67e8f9'}
                                  onChange={(e) => handleUpdateRing(idx, { secondaryColor: e.target.value })}
                                  className="w-4 h-4 rounded cursor-pointer border border-zinc-300 p-0"
                                />
                                <span className="text-zinc-600">{ring.secondaryColor || '#67e8f9'}</span>
                              </div>
                            </div>
                          )}

                          {/* Row 5: Fine Sliders (Radius Offset, Time Offset, Thickness, Blur, Opacity) */}
                          <div className="grid grid-cols-2 gap-2 text-[9px] font-mono pt-1 border-t border-zinc-200/40">
                            <div>
                              <div className="flex justify-between text-zinc-500">
                                <span>Radius Offset:</span>
                                <span className="font-bold text-zinc-900">{ring.radiusOffset || 0}px</span>
                              </div>
                              <input
                                type="range"
                                min="-50"
                                max="50"
                                step="1"
                                value={ring.radiusOffset || 0}
                                onChange={(e) => handleUpdateRing(idx, { radiusOffset: parseInt(e.target.value, 10) })}
                                className="w-full h-1 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between text-zinc-500">
                                <span>Time Lag/Offset:</span>
                                <span className="font-bold text-zinc-900">{(ring.timeOffset || 0).toFixed(1)}s</span>
                              </div>
                              <input
                                type="range"
                                min="-3.0"
                                max="3.0"
                                step="0.1"
                                value={ring.timeOffset || 0}
                                onChange={(e) => handleUpdateRing(idx, { timeOffset: parseFloat(e.target.value) })}
                                className="w-full h-1 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between text-zinc-500">
                                <span>Line Thickness:</span>
                                <span className="font-bold text-zinc-900">{(ring.strokeWidth || 1.5).toFixed(1)}px</span>
                              </div>
                              <input
                                type="range"
                                min="0.5"
                                max="8.0"
                                step="0.1"
                                value={ring.strokeWidth || 1.5}
                                onChange={(e) => handleUpdateRing(idx, { strokeWidth: parseFloat(e.target.value) })}
                                className="w-full h-1 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between text-zinc-500">
                                <span>Blur / Glow:</span>
                                <span className="font-bold text-zinc-900">{ring.blur || 0}px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="20"
                                step="0.5"
                                value={ring.blur || 0}
                                onChange={(e) => handleUpdateRing(idx, { blur: parseFloat(e.target.value) })}
                                className="w-full h-1 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between text-zinc-500">
                                <span>Opacity:</span>
                                <span className="font-bold text-zinc-900">{Math.round((ring.opacity ?? 1.0) * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="0.1"
                                max="1.0"
                                step="0.05"
                                value={ring.opacity ?? 1.0}
                                onChange={(e) => handleUpdateRing(idx, { opacity: parseFloat(e.target.value) })}
                                className="w-full h-1 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                              />
                            </div>

                            <div>
                              <div className="flex justify-between text-zinc-500">
                                <span>Blend Mode:</span>
                                <select
                                  value={ring.blendMode || 'source-over'}
                                  onChange={(e) => handleUpdateRing(idx, { blendMode: e.target.value as any })}
                                  className="text-[9px] font-mono bg-zinc-100 rounded px-1 py-0.5 border border-zinc-300"
                                >
                                  <option value="source-over">Normal</option>
                                  <option value="screen">Screen</option>
                                  <option value="lighter">Lighter</option>
                                  <option value="multiply">Multiply</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Row 6: Circumferential Noise & Interference Options */}
                          <div className="pt-2 border-t border-zinc-200/60 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={ring.noiseEnabled ?? false}
                                  onChange={(e) => handleUpdateRing(idx, { noiseEnabled: e.target.checked })}
                                  className="accent-zinc-900 rounded cursor-pointer"
                                />
                                <span className="font-bold text-[9px] text-zinc-800">
                                  ⚡ Circumferential Noise & Interference
                                </span>
                              </label>
                              <span className="text-[9px] font-mono text-zinc-400 capitalize">
                                {ring.noiseType || 'fractal'}
                              </span>
                            </div>

                            {ring.noiseEnabled && (
                              <div className="space-y-1.5 pl-2.5 border-l-2 border-zinc-300 text-[9px] font-mono bg-zinc-100/40 p-1.5 rounded-r">
                                <div className="flex justify-between items-center">
                                  <span className="text-zinc-600 font-medium">Noise Profile:</span>
                                  <select
                                    value={ring.noiseType || 'fractal'}
                                    onChange={(e) => handleUpdateRing(idx, { noiseType: e.target.value as any })}
                                    className="bg-white rounded px-1.5 py-0.5 border border-zinc-300 text-[9px]"
                                  >
                                    <option value="fractal">Fractal fBm</option>
                                    <option value="seismic">Seismic Spikes</option>
                                    <option value="particulate">Particulate Stipple</option>
                                    <option value="interference">Interference Static</option>
                                    <option value="smooth">Smooth Harmonic</option>
                                  </select>
                                </div>

                                <div>
                                  <div className="flex justify-between text-zinc-600">
                                    <span>Noise Amplitude:</span>
                                    <span className="font-bold text-zinc-900">{ring.noiseAmplitude ?? 10}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="40"
                                    step="1"
                                    value={ring.noiseAmplitude ?? 10}
                                    onChange={(e) => handleUpdateRing(idx, { noiseAmplitude: parseInt(e.target.value, 10) })}
                                    className="w-full h-1 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between text-zinc-600">
                                    <span>Roughness / Freq:</span>
                                    <span className="font-bold text-zinc-900">{ring.noiseFrequency ?? 16}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="2"
                                    max="40"
                                    step="1"
                                    value={ring.noiseFrequency ?? 16}
                                    onChange={(e) => handleUpdateRing(idx, { noiseFrequency: parseInt(e.target.value, 10) })}
                                    className="w-full h-1 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between text-zinc-600">
                                    <span>Filament Strands:</span>
                                    <span className="font-bold text-zinc-900">{ring.noiseDensity ?? 1}</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="1"
                                    max="6"
                                    step="1"
                                    value={ring.noiseDensity ?? 1}
                                    onChange={(e) => handleUpdateRing(idx, { noiseDensity: parseInt(e.target.value, 10) })}
                                    className="w-full h-1 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                                  />
                                </div>

                                <div>
                                  <div className="flex justify-between text-zinc-600">
                                    <span>Ink Bleed / Stipple:</span>
                                    <span className="font-bold text-zinc-900">{ring.noiseBleed ?? 0}px</span>
                                  </div>
                                  <input
                                    type="range"
                                    min="0"
                                    max="25"
                                    step="1"
                                    value={ring.noiseBleed ?? 0}
                                    onChange={(e) => handleUpdateRing(idx, { noiseBleed: parseInt(e.target.value, 10) })}
                                    className="w-full h-1 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                                  />
                                </div>

                                <div className="pt-1 border-t border-zinc-200/60">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={ring.divergenceSpikes ?? false}
                                      onChange={(e) => handleUpdateRing(idx, { divergenceSpikes: e.target.checked })}
                                      className="accent-zinc-900 rounded"
                                    />
                                    <span className="text-zinc-800 font-bold">Divergence Spike Anomaly</span>
                                  </label>
                                </div>

                                {ring.divergenceSpikes && (
                                  <div>
                                    <div className="flex justify-between text-zinc-600">
                                      <span>Spike Intensity:</span>
                                      <span className="font-bold text-zinc-900">{ring.divergenceIntensity ?? 65}%</span>
                                    </div>
                                    <input
                                      type="range"
                                      min="10"
                                      max="100"
                                      step="5"
                                      value={ring.divergenceIntensity ?? 65}
                                      onChange={(e) => handleUpdateRing(idx, { divergenceIntensity: parseInt(e.target.value, 10) })}
                                      className="w-full h-1 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 3: ELASTIC MEMBRANE STRETCH (HAND DEFORMATION)   */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('membrane')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      🎪 Hand Membrane Deformation
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSection('membrane');
                      }}
                      className="text-[9px] font-mono text-zinc-400 hover:text-zinc-800 underline cursor-pointer"
                      title="Reset membrane"
                    >
                      ↺
                    </button>
                    <span className="text-zinc-400 text-xs">
                      {openSections.membrane ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.membrane && (
                  <div className="p-3 space-y-2.5 border-t border-zinc-100 font-mono text-[10px]">
                    <p className="text-[9px] text-zinc-400 font-sans leading-snug">
                      As the second hand turns, the needle physically stretches and pushes the outer ring like fabric stretched over a tent pole.
                    </p>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Membrane Stretch Push</span>
                        <span className="font-bold text-zinc-900">{params.membraneStretch ?? 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        step="2"
                        value={params.membraneStretch ?? 0}
                        onChange={(e) => onChangeParams({ membraneStretch: parseInt(e.target.value, 10) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                      <span className="text-[9px] text-zinc-400">0px = normal circular ring; 50px = dramatic outward bulge</span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Tent Angular Width</span>
                        <span className="font-bold text-zinc-900">{(params.membraneWidth ?? 0.36).toFixed(2)} rad</span>
                      </div>
                      <input
                        type="range"
                        min="0.15"
                        max="0.80"
                        step="0.02"
                        value={params.membraneWidth ?? 0.36}
                        onChange={(e) => onChangeParams({ membraneWidth: parseFloat(e.target.value) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                    </div>

                    <div className="flex items-center justify-between text-zinc-700 pt-1">
                      <span>Needle Touches Deformed Apex</span>
                      <button
                        onClick={() => onChangeParams({ membraneFollowHand: !(params.membraneFollowHand ?? true) })}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          params.membraneFollowHand ?? true ? 'bg-zinc-900' : 'bg-zinc-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            params.membraneFollowHand ?? true ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 4: SECOND HAND MOTION SMOOTHING                  */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('motion')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      ⏱ Second Motion Dynamics
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSection('motion');
                      }}
                      className="text-[9px] font-mono text-zinc-400 hover:text-zinc-800 underline cursor-pointer"
                      title="Reset motion"
                    >
                      ↺
                    </button>
                    <span className="text-zinc-400 text-xs">
                      {openSections.motion ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.motion && (
                  <div className="p-3 space-y-2.5 border-t border-zinc-100 font-mono text-[10px]">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onChangeParams({ tickDuration: 1.0, elasticTension: 0, secondMotion: 'smooth' })}
                        className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer"
                      >
                        Sweep
                      </button>
                      <button
                        onClick={() => onChangeParams({ tickDuration: 0.28, elasticTension: 0.45, secondMotion: 'spring' })}
                        className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer"
                      >
                        Spring
                      </button>
                      <button
                        onClick={() => onChangeParams({ tickDuration: 0.001, elasticTension: 0, secondMotion: 'step' })}
                        className="px-2 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer"
                      >
                        Quartz Step
                      </button>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Transition Duration</span>
                        <span className="font-bold text-zinc-900">{(params.tickDuration ?? 0.28).toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        min="0.00"
                        max="1.00"
                        step="0.02"
                        value={params.tickDuration ?? 0.28}
                        onChange={(e) => onChangeParams({ tickDuration: parseFloat(e.target.value) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                      <span className="text-[9px] text-zinc-400">0.00s = instant snap · 0.28s = mechanical tick · 1.00s = sweep</span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Elastic Bounce / Tension</span>
                        <span className="font-bold text-zinc-900">{Math.round((params.elasticTension ?? 0.45) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={params.elasticTension ?? 0.45}
                        onChange={(e) => onChangeParams({ elasticTension: parseFloat(e.target.value) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Damping Factor</span>
                        <span className="font-bold text-zinc-900">{(params.dampingFactor ?? 0.8).toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="2.0"
                        step="0.05"
                        value={params.dampingFactor ?? 0.8}
                        onChange={(e) => onChangeParams({ dampingFactor: parseFloat(e.target.value) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 5: DIRECTION & BIASING ("BOTH" FIX)              */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('bias')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      🧭 Direction & Push Biasing
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSection('bias');
                      }}
                      className="text-[9px] font-mono text-zinc-400 hover:text-zinc-800 underline cursor-pointer"
                      title="Reset bias"
                    >
                      ↺
                    </button>
                    <span className="text-zinc-400 text-xs">
                      {openSections.bias ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.bias && (
                  <div className="p-3 space-y-2.5 border-t border-zinc-100 font-mono text-[10px]">
                    <div className="grid grid-cols-3 gap-1">
                      {(['clockwise', 'counter', 'both'] as const).map((dir) => (
                        <button
                          key={dir}
                          onClick={() => onChangeParams({ direction: dir })}
                          className={`py-1 rounded text-center capitalize cursor-pointer transition-all ${
                            params.direction === dir
                              ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          {dir === 'clockwise' ? 'Clockwise' : dir === 'counter' ? 'Counter' : 'Both'}
                        </button>
                      ))}
                    </div>

                    <div className="flex flex-col gap-0.5 pt-1">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Biasing Ratio (CW vs CCW)</span>
                        <span className="font-bold text-zinc-900">
                          {params.directionBias ?? 50}% CW / {100 - (params.directionBias ?? 50)}% CCW
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="1"
                        value={params.directionBias ?? 50}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          // Auto ensure 'both' is active so moving bias always works
                          onChangeParams({ directionBias: val, direction: 'both' });
                        }}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                      <span className="text-[9px] text-zinc-400">
                        0% = 100% Counter-Clockwise · 50% = Balanced · 100% = 100% Clockwise
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-zinc-600 pt-1">
                      <span>Collision at 180°:</span>
                      <div className="flex gap-1">
                        {(['constructive', 'dissipate', 'reflect'] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => onChangeParams({ collisionMode: m })}
                            className={`px-1.5 py-0.5 rounded text-[9px] cursor-pointer ${
                              params.collisionMode === m
                                ? 'bg-zinc-900 text-white font-bold'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 6: WAVE PHYSICS & SHOCK SMOOTHER                 */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('physics')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      🌊 Wave Physics (High-Range)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSection('physics');
                      }}
                      className="text-[9px] font-mono text-zinc-400 hover:text-zinc-800 underline cursor-pointer"
                      title="Reset physics"
                    >
                      ↺
                    </button>
                    <span className="text-zinc-400 text-xs">
                      {openSections.physics ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.physics && (
                  <div className="p-3 space-y-2.5 border-t border-zinc-100 font-mono text-[10px]">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Wave Root Shock Smoother (0-Amp Attack)</span>
                        <span className="font-bold text-zinc-900">{(params.attackDuration ?? 0.18).toFixed(2)}s</span>
                      </div>
                      <input
                        type="range"
                        min="0.00"
                        max="0.80"
                        step="0.02"
                        value={params.attackDuration ?? 0.18}
                        onChange={(e) => onChangeParams({ attackDuration: parseFloat(e.target.value) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                      <span className="text-[9px] text-zinc-400">Softens initial pulse jerk right at second tick birth</span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Heavy Crest Stroke on Ripple Start</span>
                        <span className="font-bold text-zinc-900">{(params.initialStrokeWeight ?? 2.0).toFixed(1)}×</span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="8.0"
                        step="0.2"
                        value={params.initialStrokeWeight ?? 2.0}
                        onChange={(e) => onChangeParams({ initialStrokeWeight: parseFloat(e.target.value) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Stroke Taper Rate</span>
                        <span className="font-bold text-zinc-900">{(params.strokeTaperRate ?? 1.2).toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.1"
                        value={params.strokeTaperRate ?? 1.2}
                        onChange={(e) => onChangeParams({ strokeTaperRate: parseFloat(e.target.value) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Transit Time (Speed)</span>
                        <span className="font-bold text-zinc-900">{params.speed.toFixed(1)}s</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="10.0"
                        step="0.1"
                        value={params.speed}
                        onChange={(e) => onChangeParams({ speed: parseFloat(e.target.value) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Natural Decay Persistence</span>
                        <span className="font-bold text-zinc-900">{params.decayDuration.toFixed(1)}s</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="12.0"
                        step="0.1"
                        value={params.decayDuration}
                        onChange={(e) => onChangeParams({ decayDuration: parseFloat(e.target.value) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Wave Amplitude</span>
                        <span className="font-bold text-zinc-900">{params.amplitude.toFixed(2)}×</span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="5.00"
                        step="0.05"
                        value={params.amplitude}
                        onChange={(e) => onChangeParams({ amplitude: parseFloat(e.target.value) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Frequency (Ripples in packet)</span>
                        <span className="font-bold text-zinc-900">{params.frequency}</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="30"
                        step="1"
                        value={params.frequency}
                        onChange={(e) => onChangeParams({ frequency: parseInt(e.target.value, 10) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 7: COLOR PALETTE, GLOWS & SPLIT TIME COLORS      */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('colors')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      🎨 Color, Glow & Time Digits
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSection('colors');
                      }}
                      className="text-[9px] font-mono text-zinc-400 hover:text-zinc-800 underline cursor-pointer"
                      title="Reset colors"
                    >
                      ↺
                    </button>
                    <span className="text-zinc-400 text-xs">
                      {openSections.colors ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.colors && (
                  <div className="p-3 space-y-3 border-t border-zinc-100 font-mono text-[10px]">
                    {/* Cute Neon Palette Swatches */}
                    <div>
                      <span className="text-zinc-500 uppercase tracking-wider text-[9px] block mb-1">
                        Cute Glowy Faded Neon Palette:
                      </span>
                      <div className="grid grid-cols-4 gap-1.5">
                        {CUTE_NEON_PALETTE.map((pal) => (
                          <button
                            key={pal.name}
                            onClick={() => {
                              // Apply to primary ring and time
                              handleUpdateRing(0, { color: pal.hex });
                              onChangeParams({
                                timeColors: {
                                  ...params.timeColors,
                                  primary: pal.hex,
                                },
                              });
                            }}
                            className="flex items-center gap-1.5 p-1 rounded border border-zinc-200 hover:border-zinc-400 bg-zinc-50/50 cursor-pointer"
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                              style={{ backgroundColor: pal.hex }}
                            />
                            <span className="text-[9px] text-zinc-700 truncate">{pal.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Acoustic Glow Auras */}
                    <div className="space-y-1.5 pt-1 border-t border-zinc-100">
                      <span className="text-zinc-500 uppercase tracking-wider text-[9px] block">
                        Phosphor Glow Aura & Emitter:
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {GLOW_OPTIONS.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => onChangeParams({ glowMode: g.id })}
                            className={`py-1 px-1 rounded text-center truncate cursor-pointer transition-all ${
                              (params.glowMode || 'none') === g.id
                                ? 'bg-zinc-900 text-white font-medium shadow-2xs'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                            title={g.hint}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col gap-0.5 pt-1">
                        <div className="flex justify-between items-baseline text-zinc-600">
                          <span>Aura / Emitter Intensity</span>
                          <span className="font-bold text-zinc-900">{params.glowIntensity ?? 25}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="5"
                          value={params.glowIntensity ?? 25}
                          onChange={(e) => onChangeParams({ glowIntensity: parseInt(e.target.value, 10) })}
                          className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                        />
                      </div>
                    </div>

                    {/* Splittable Time Colors by Section */}
                    <div className="space-y-2 pt-1 border-t border-zinc-100">
                      <div className="flex items-center justify-between text-zinc-700">
                        <span className="font-bold">Split Time Colors (HH : MM : SS)</span>
                        <button
                          onClick={() => {
                            const current = params.timeColors?.splitBySection ?? false;
                            onChangeParams({
                              timeColors: {
                                ...(params.timeColors || {
                                  primary: '#18181b',
                                  hours: '#18181b',
                                  minutes: '#18181b',
                                  seconds: '#18181b',
                                  separator: '#71717a',
                                }),
                                splitBySection: !current,
                              },
                            });
                          }}
                          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                            params.timeColors?.splitBySection ? 'bg-zinc-900' : 'bg-zinc-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                              params.timeColors?.splitBySection ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {params.timeColors?.splitBySection ? (
                        <div className="grid grid-cols-4 gap-1.5 p-2 bg-zinc-50 rounded border border-zinc-200">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[9px] text-zinc-500">Hours</span>
                            <input
                              type="color"
                              value={params.timeColors.hours}
                              onChange={(e) => onChangeParams({
                                timeColors: { ...params.timeColors, hours: e.target.value },
                              })}
                              className="w-6 h-6 rounded cursor-pointer border border-zinc-300 p-0"
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[9px] text-zinc-500">Minutes</span>
                            <input
                              type="color"
                              value={params.timeColors.minutes}
                              onChange={(e) => onChangeParams({
                                timeColors: { ...params.timeColors, minutes: e.target.value },
                              })}
                              className="w-6 h-6 rounded cursor-pointer border border-zinc-300 p-0"
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[9px] text-zinc-500">Seconds</span>
                            <input
                              type="color"
                              value={params.timeColors.seconds}
                              onChange={(e) => onChangeParams({
                                timeColors: { ...params.timeColors, seconds: e.target.value },
                              })}
                              className="w-6 h-6 rounded cursor-pointer border border-zinc-300 p-0"
                            />
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-[9px] text-zinc-500">Colon (:)</span>
                            <input
                              type="color"
                              value={params.timeColors.separator}
                              onChange={(e) => onChangeParams({
                                timeColors: { ...params.timeColors, separator: e.target.value },
                              })}
                              className="w-6 h-6 rounded cursor-pointer border border-zinc-300 p-0"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-2 bg-zinc-50 rounded border border-zinc-200">
                          <span className="text-zinc-600">Uniform Time Color:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={params.timeColors?.primary || '#18181b'}
                              onChange={(e) => onChangeParams({
                                timeColors: {
                                  ...(params.timeColors || {
                                    splitBySection: false,
                                    hours: '#18181b',
                                    minutes: '#18181b',
                                    seconds: '#18181b',
                                    separator: '#71717a',
                                  }),
                                  primary: e.target.value,
                                },
                              })}
                              className="w-5 h-5 rounded cursor-pointer border border-zinc-300 p-0"
                            />
                            <span className="text-zinc-700 uppercase">{params.timeColors?.primary || '#18181b'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 8: TYPOGRAPHY, SHAPE MORPH & LAYERING           */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('typography')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      🔤 Center Typography & Hands
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSection('typography');
                      }}
                      className="text-[9px] font-mono text-zinc-400 hover:text-zinc-800 underline cursor-pointer"
                      title="Reset typography"
                    >
                      ↺
                    </button>
                    <span className="text-zinc-400 text-xs">
                      {openSections.typography ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.typography && (
                  <div className="p-3 space-y-2.5 border-t border-zinc-100 font-mono text-[10px]">
                    {/* Font Selector */}
                    <div>
                      <span className="text-zinc-500 uppercase tracking-wider text-[9px] block mb-1">
                        Font Family:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {FONT_OPTIONS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => onChangeParams({ fontFamily: f.id })}
                            className={`py-1 px-1.5 rounded text-center truncate cursor-pointer transition-all ${
                              (params.fontFamily || 'jetbrains') === f.id
                                ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Digit Transition Mode (True Morph vs Roll vs Fade) */}
                    <div>
                      <span className="text-zinc-500 uppercase tracking-wider text-[9px] block mb-1">
                        Numeral Transition Mode:
                      </span>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { id: 'morph', label: 'True Morph', title: 'Vector line coordinate deformation' },
                          { id: 'roll', label: 'Roll', title: 'Odometer drum roll' },
                          { id: 'fade', label: 'Fade', title: 'Soft cross-fade' },
                          { id: 'instant', label: 'Step', title: 'Crisp quartz change' },
                        ].map((m) => (
                          <button
                            key={m.id}
                            onClick={() => onChangeParams({ digitTransition: m.id as any })}
                            className={`py-1 rounded text-center cursor-pointer transition-all ${
                              params.digitTransition === m.id
                                ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                            title={m.title}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>

                      {/* Flubber Morph Style: Stroke vs Fill */}
                      {params.digitTransition === 'morph' && (
                        <div className="p-2 bg-zinc-50 rounded border border-zinc-200 space-y-1 mt-1.5">
                          <span className="text-[9px] text-zinc-500 font-bold block uppercase tracking-wider">
                            Flubber Morph Topology:
                          </span>
                          <div className="grid grid-cols-2 gap-1">
                            <button
                              onClick={() => onChangeParams({ digitMorphStyle: 'stroke' })}
                              className={`py-1 rounded text-center cursor-pointer transition-all ${
                                (params.digitMorphStyle || 'stroke') === 'stroke'
                                  ? 'bg-zinc-900 text-white font-bold'
                                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                              }`}
                              title="Continuous single-stroke geometric line morphing"
                            >
                              Line Morph (Stroke)
                            </button>
                            <button
                              onClick={() => onChangeParams({ digitMorphStyle: 'fill' })}
                              className={`py-1 rounded text-center cursor-pointer transition-all ${
                                params.digitMorphStyle === 'fill'
                                  ? 'bg-zinc-900 text-white font-bold'
                                  : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                              }`}
                              title="Solid typographic ink glyph morphing"
                            >
                              Ink Glyph (Fill)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Time Layer Order: Over vs Under Ring */}
                    <div>
                      <span className="text-zinc-500 uppercase tracking-wider text-[9px] block mb-1">
                        Time Layer Depth:
                      </span>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => onChangeParams({ timeLayer: 'over' })}
                          className={`py-1 rounded text-center cursor-pointer transition-all ${
                            (params.timeLayer || 'over') === 'over'
                              ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                          title="Numbers sit in front of the ring"
                        >
                          Over Ring (Front)
                        </button>
                        <button
                          onClick={() => onChangeParams({ timeLayer: 'under' })}
                          className={`py-1 rounded text-center cursor-pointer transition-all ${
                            params.timeLayer === 'under'
                              ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                          title="Waves and ripples visibly sweep over the numbers"
                        >
                          Under Ring (Waves Sweep Over)
                        </button>
                      </div>
                    </div>

                    {/* Hands Mode */}
                    <div>
                      <span className="text-zinc-500 uppercase tracking-wider text-[9px] block mb-1">
                        Clock Hands Mode:
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {(['digital', 'analog', 'hybrid'] as const).map((hm) => (
                          <button
                            key={hm}
                            onClick={() => onChangeParams({ handsMode: hm })}
                            className={`py-1 rounded text-center capitalize cursor-pointer transition-all ${
                              params.handsMode === hm
                                ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                            }`}
                          >
                            {hm}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Number Scale */}
                    <div className="flex flex-col gap-0.5 pt-1">
                      <div className="flex justify-between items-baseline text-zinc-600">
                        <span>Number Size Scale</span>
                        <span className="font-bold text-zinc-900">{Math.round((params.numberScale ?? 1.0) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.8"
                        step="0.05"
                        value={params.numberScale ?? 1.0}
                        onChange={(e) => onChangeParams({ numberScale: parseFloat(e.target.value) })}
                        className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                      />
                    </div>

                    {/* Show/Hide Seconds */}
                    <div className="flex items-center justify-between text-zinc-700 pt-1">
                      <span>Display Seconds (:SS)</span>
                      <button
                        onClick={() => onChangeParams({ showDigitalSeconds: !params.showDigitalSeconds })}
                        className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                          params.showDigitalSeconds ? 'bg-zinc-900' : 'bg-zinc-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            params.showDigitalSeconds ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 9: 11 WESTWORLD CIRCUMFERENCE STUDIES            */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('studies')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      🌀 Circumference Studies ({VARIATIONS.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-400">
                      {currentVar.name}
                    </span>
                    <span className="text-zinc-400 text-xs">
                      {openSections.studies ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.studies && (
                  <div className="p-3 space-y-2 border-t border-zinc-100">
                    <div className="grid grid-cols-6 gap-1 font-mono text-[10px]">
                      {VARIATIONS.map((v) => (
                        <button
                          key={v.id}
                          onClick={() => onSelectVariation(v.id)}
                          className={`py-1 rounded text-center cursor-pointer transition-all ${
                            v.id === selectedVariation
                              ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                          }`}
                        >
                          {v.index < 10 ? `0${v.index}` : v.index}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">
                      {currentVar.name}: {currentVar.description}
                    </p>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION: WESTWORLD SOLOMON HUD & RETICLE LEADER LINE     */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('solomon')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      🎯 Solomon Telemetry HUD & Reticle
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        resetSection('solomon');
                      }}
                      className="text-[9px] font-mono text-zinc-400 hover:text-zinc-800 underline cursor-pointer"
                      title="Reset Solomon HUD"
                    >
                      ↺
                    </button>
                    <span className="text-zinc-400 text-xs">
                      {openSections.solomon ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.solomon && (
                  <div className="p-3 space-y-2.5 border-t border-zinc-100 font-mono text-[10px]">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={params.showSolomonTelemetry ?? false}
                          onChange={(e) => onChangeParams({ showSolomonTelemetry: e.target.checked })}
                          className="accent-zinc-900 rounded cursor-pointer"
                        />
                        <span className="font-bold text-zinc-800">
                          Show Diagnostic HUD & Leader Line
                        </span>
                      </label>
                    </div>

                    <p className="text-[9px] text-zinc-400 leading-relaxed font-sans">
                      Renders the exact telemetry HUD block and diagnostic vector needle pointing to the seismic divergence anomaly on the ring (matching the reference image).
                    </p>

                    <div className="space-y-1.5 pt-1">
                      <div>
                        <span className="text-zinc-500 text-[9px]">Status Header:</span>
                        <input
                          type="text"
                          value={params.solomonStatusText ?? 'SYSTEM INITIATED'}
                          onChange={(e) => onChangeParams({ solomonStatusText: e.target.value })}
                          className="w-full font-mono text-[10px] text-zinc-900 bg-zinc-50 border border-zinc-200 rounded px-2 py-1 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[9px]">Location Readout:</span>
                        <input
                          type="text"
                          value={params.solomonLocationText ?? 'UNDISCLOSED LOCATION'}
                          onChange={(e) => onChangeParams({ solomonLocationText: e.target.value })}
                          className="w-full font-mono text-[10px] text-zinc-900 bg-zinc-50 border border-zinc-200 rounded px-2 py-1 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <span className="text-zinc-500 text-[9px]">Build Identifier:</span>
                        <input
                          type="text"
                          value={params.solomonBuildText ?? "'SOLOMON' BUILD 0.06"}
                          onChange={(e) => onChangeParams({ solomonBuildText: e.target.value })}
                          className="w-full font-mono text-[10px] text-zinc-900 bg-zinc-50 border border-zinc-200 rounded px-2 py-1 focus:outline-hidden"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-zinc-500 text-[9px]">
                          <span>Primary Tower Angle:</span>
                          <span className="font-bold text-zinc-900">
                            {((((params.solomonAnomalyAngle ?? -0.65) * 180) / Math.PI + 360) % 360).toFixed(0)}° (
                            {((params.solomonAnomalyAngle ?? -0.65) < 0 ? '' : '+') + (params.solomonAnomalyAngle ?? -0.65).toFixed(2)} rad)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="-3.14"
                          max="3.14"
                          step="0.05"
                          value={params.solomonAnomalyAngle ?? -0.65}
                          onChange={(e) => onChangeParams({ solomonAnomalyAngle: parseFloat(e.target.value) })}
                          className="w-full h-1.5 accent-zinc-900 bg-zinc-200 rounded cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="pt-1 flex gap-2">
                      <button
                        onClick={() => {
                          const solomonPreset = CLOCK_PRESETS.find((p) => p.variation === 'solomon');
                          if (solomonPreset) onApplyPreset(solomonPreset);
                        }}
                        className="flex-1 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded font-mono text-[10px] font-bold cursor-pointer transition-colors shadow-2xs"
                      >
                        Apply Solomon Preset
                      </button>
                      <button
                        onClick={() => onChangeParams({ solomonAnomalyAngle: -0.65 })}
                        className="px-2.5 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded font-mono text-[10px] cursor-pointer"
                        title="Reset angle to 04:17:39 (~1:40)"
                      >
                        Default (1:40)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECTION 10: FLUID WEATHER MORPH & SCRUBBER               */}
              {/* ======================================================== */}
              <div className="border border-zinc-200/70 rounded-lg overflow-hidden bg-white shadow-2xs">
                <div
                  onClick={() => toggleSection('weather')}
                  className="flex items-center justify-between px-3 py-2 bg-zinc-50/70 hover:bg-zinc-100/60 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-zinc-800 uppercase tracking-wider">
                      ⛅ Weather Morph & Manual Scrub
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-400 text-xs">
                      {openSections.weather ? '▾' : '▸'}
                    </span>
                  </div>
                </div>

                {openSections.weather && (
                  <div className="p-3 space-y-2.5 border-t border-zinc-100 font-mono text-[10px]">
                    <div className="flex items-center justify-between">
                      <span>Clock ↔ Weather Scrub</span>
                      <span className="font-bold text-zinc-900">{Math.round(morphProgress * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={morphProgress}
                      onChange={(e) => onChangeMorph(parseFloat(e.target.value))}
                      className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                    />

                    <div className="flex gap-1.5 pt-1">
                      <button
                        onClick={onToggleAutoMorph}
                        className={`flex-1 py-1 rounded text-center cursor-pointer transition-all ${
                          isAutoMorphing
                            ? 'bg-zinc-900 text-white font-bold shadow-2xs'
                            : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                        }`}
                      >
                        {isAutoMorphing ? 'Pause Auto Morph' : 'Auto Morph Loop'}
                      </button>
                      <button
                        onClick={onTriggerPulse}
                        className="px-2.5 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-700 cursor-pointer"
                        title="Inject acoustic pulse"
                      >
                        + Pulse
                      </button>
                    </div>

                    <div className="pt-2 border-t border-zinc-100 flex items-center justify-between">
                      <span>Time Mode:</span>
                      <button
                        onClick={onToggleLiveTime}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          isLiveTime
                            ? 'bg-zinc-900 text-white font-bold'
                            : 'bg-zinc-200 text-zinc-700'
                        }`}
                      >
                        {isLiveTime ? 'Live System Clock' : 'Manual Second Scrub'}
                      </button>
                    </div>

                    {!isLiveTime && (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex justify-between items-baseline text-zinc-600">
                          <span>Scrub Second</span>
                          <span className="font-bold text-zinc-900">{scrubSecond}s</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="59"
                          step="1"
                          value={scrubSecond}
                          onChange={(e) => onChangeScrubSecond(parseInt(e.target.value, 10))}
                          className="accent-zinc-900 cursor-pointer h-1 bg-zinc-200 rounded appearance-none w-full"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-3 border-t border-zinc-100 bg-zinc-50/80 flex items-center justify-between text-[10px] font-mono">
              <span className="text-zinc-400">Westworld Horizon v3.0</span>
              <button
                onClick={onResetParams}
                className="text-zinc-600 hover:text-black font-bold underline cursor-pointer"
              >
                Reset All to Defaults
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
};
