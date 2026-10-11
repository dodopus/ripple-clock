import React from 'react';
import { DigitTransitionMode, DigitMorphStyle, ClockFontFamily, TimeColors } from '../types/clock';
import { MorphingVectorDigit } from './MorphingVectorDigit';

interface Props {
  hours: number;
  minutes: number;
  seconds: number;
  showSeconds: boolean;
  transitionMode: DigitTransitionMode;
  morphStyle?: DigitMorphStyle;
  fontSize: number; // in pixels
  fontFamily?: ClockFontFamily;
  timeColors?: TimeColors;
  className?: string;
}

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const FONT_MAP: Record<ClockFontFamily, string> = {
  jetbrains: "'JetBrains Mono', monospace",
  jakarta: "'Plus Jakarta Sans', sans-serif",
  space: "'Space Grotesk', sans-serif",
  syne: "'Syne', sans-serif",
  cinzel: "'Cinzel', serif",
};

/**
 * Digit Colon Component:
 * In 'morph' mode, renders matching vector dots aligned to the exact optical center of the morph digits.
 * In text modes, renders standard typographic colon.
 */
const DigitalColon: React.FC<{
  mode: DigitTransitionMode;
  fontSize: number;
  itemHeight: number;
  fontFamily: ClockFontFamily;
  color: string;
}> = ({ mode, fontSize, itemHeight, fontFamily, color }) => {
  const colonWidth = Math.max(12, Math.round(fontSize * 0.28));

  if (mode === 'morph') {
    return (
      <span
        className="inline-flex items-center justify-center shrink-0 px-0.5 select-none"
        style={{
          width: `${colonWidth}px`,
          height: `${itemHeight}px`,
        }}
      >
        <svg
          width={colonWidth}
          height={itemHeight}
          viewBox="0 0 30 100"
          className="inline-block overflow-visible"
        >
          <circle
            cx="15"
            cy="38"
            r={Math.max(2, fontSize * 0.05)}
            fill={color}
            style={{
              filter: color.startsWith('#18') ? 'none' : `drop-shadow(0 0 3px ${color}88)`,
            }}
          />
          <circle
            cx="15"
            cy="66"
            r={Math.max(2, fontSize * 0.05)}
            fill={color}
            style={{
              filter: color.startsWith('#18') ? 'none' : `drop-shadow(0 0 3px ${color}88)`,
            }}
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center justify-center font-light opacity-60 px-0.5 shrink-0 select-none"
      style={{
        fontSize: `${fontSize * 0.88}px`,
        width: `${colonWidth}px`,
        height: `${itemHeight}px`,
        fontFamily: FONT_MAP[fontFamily],
        color,
        lineHeight: 1,
      }}
    >
      :
    </span>
  );
};

/**
 * Single digit component supporting:
 * - 'morph': true vector coordinate shape morphing where lines bend and transform into the next numeral
 * - 'roll': vertical odometer drum with generous width
 * - 'fade': soft cross-fade
 * - 'instant': direct quartz update
 */
const DigitalDigit: React.FC<{
  digit: string;
  fontSize: number;
  itemHeight: number;
  mode: DigitTransitionMode;
  morphStyle?: DigitMorphStyle;
  fontFamily: ClockFontFamily;
  color: string;
}> = ({ digit, fontSize, itemHeight, mode, morphStyle, fontFamily, color }) => {
  const numValue = parseInt(digit, 10);
  const validNum = isNaN(numValue) ? 0 : numValue;
  // Use balanced width (0.60em) so numbers breathe naturally and align with tabular rhythm
  const digitWidth = Math.max(20, Math.round(fontSize * 0.6));

  const fontStyle = {
    fontFamily: FONT_MAP[fontFamily] || FONT_MAP.jetbrains,
    fontSize: `${fontSize}px`,
    color,
  };

  // 1. True Vector Coordinate Shape Morph Mode
  if (mode === 'morph') {
    return (
      <span
        className="inline-flex items-center justify-center relative tabular-nums select-none px-0.5"
        style={{
          width: `${digitWidth}px`,
          height: `${itemHeight}px`,
        }}
      >
        <MorphingVectorDigit
          digit={digit}
          width={digitWidth}
          height={itemHeight}
          color={color}
          strokeWidth={Math.max(2.2, fontSize * 0.065)}
          morphStyle={morphStyle}
        />
      </span>
    );
  }

  // 2. Instant / Step Mode
  if (mode === 'instant') {
    return (
      <span
        className="inline-flex items-center justify-center tabular-nums leading-none select-none font-light px-0.5"
        style={{
          ...fontStyle,
          width: `${digitWidth}px`,
          height: `${itemHeight}px`,
        }}
      >
        {digit}
      </span>
    );
  }

  // 3. Fade Mode
  if (mode === 'fade') {
    return (
      <span
        key={digit}
        className="inline-flex items-center justify-center tabular-nums leading-none select-none font-light px-0.5 animate-fadeIn"
        style={{
          ...fontStyle,
          width: `${digitWidth}px`,
          height: `${itemHeight}px`,
        }}
      >
        {digit}
      </span>
    );
  }

  // 4. 'roll' Mode: Precision Odometer Drum with no clipping
  return (
    <span
      className="inline-block relative tabular-nums select-none font-light px-0.5 overflow-hidden"
      style={{
        ...fontStyle,
        width: `${digitWidth}px`,
        height: `${itemHeight}px`,
      }}
    >
      <div
        className="transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col"
        style={{
          transform: `translateY(-${validNum * itemHeight}px)`,
        }}
      >
        {DIGITS.map((d) => (
          <div
            key={d}
            className="flex items-center justify-center leading-none"
            style={{
              height: `${itemHeight}px`,
              width: `${digitWidth}px`,
            }}
          >
            {d}
          </div>
        ))}
      </div>
    </span>
  );
};

export const RollingDigitalTime: React.FC<Props> = ({
  hours,
  minutes,
  seconds,
  showSeconds,
  transitionMode,
  morphStyle = 'stroke',
  fontSize,
  fontFamily = 'jetbrains',
  timeColors,
  className = '',
}) => {
  const hStr = hours.toString().padStart(2, '0');
  const mStr = minutes.toString().padStart(2, '0');
  const sStr = seconds.toString().padStart(2, '0');

  // Determine colors per section
  const isSplit = timeColors?.splitBySection ?? false;
  const hoursColor = isSplit ? (timeColors?.hours || '#18181b') : (timeColors?.primary || '#18181b');
  const minutesColor = isSplit ? (timeColors?.minutes || '#18181b') : (timeColors?.primary || '#18181b');
  const secondsColor = isSplit ? (timeColors?.seconds || '#18181b') : (timeColors?.primary || '#18181b');
  const sepColor = isSplit ? (timeColors?.separator || '#71717a') : (timeColors?.primary || '#71717a');

  const itemHeight = Math.round(fontSize * 1.15);

  return (
    <div
      className={`inline-flex items-center justify-center tabular-nums select-none tracking-tight font-light ${className}`}
      style={{ lineHeight: 1, height: `${itemHeight}px` }}
    >
      {/* Hours Group */}
      <div className="flex items-center">
        <DigitalDigit
          digit={hStr[0]}
          fontSize={fontSize}
          itemHeight={itemHeight}
          mode={transitionMode}
          morphStyle={morphStyle}
          fontFamily={fontFamily}
          color={hoursColor}
        />
        <DigitalDigit
          digit={hStr[1]}
          fontSize={fontSize}
          itemHeight={itemHeight}
          mode={transitionMode}
          morphStyle={morphStyle}
          fontFamily={fontFamily}
          color={hoursColor}
        />
      </div>

      {/* First Colon */}
      <DigitalColon
        mode={transitionMode}
        fontSize={fontSize}
        itemHeight={itemHeight}
        fontFamily={fontFamily}
        color={sepColor}
      />

      {/* Minutes Group */}
      <div className="flex items-center">
        <DigitalDigit
          digit={mStr[0]}
          fontSize={fontSize}
          itemHeight={itemHeight}
          mode={transitionMode}
          morphStyle={morphStyle}
          fontFamily={fontFamily}
          color={minutesColor}
        />
        <DigitalDigit
          digit={mStr[1]}
          fontSize={fontSize}
          itemHeight={itemHeight}
          mode={transitionMode}
          morphStyle={morphStyle}
          fontFamily={fontFamily}
          color={minutesColor}
        />
      </div>

      {/* Second Colon and Seconds Group (Toggleable & Smooth) */}
      <div
        className="flex items-center overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          maxWidth: showSeconds ? `${fontSize * 3.5}px` : '0px',
          opacity: showSeconds ? 1 : 0,
          pointerEvents: showSeconds ? 'auto' : 'none',
        }}
      >
        <DigitalColon
          mode={transitionMode}
          fontSize={fontSize}
          itemHeight={itemHeight}
          fontFamily={fontFamily}
          color={sepColor}
        />
        <div className="flex items-center shrink-0">
          <DigitalDigit
            digit={sStr[0]}
            fontSize={fontSize}
            itemHeight={itemHeight}
            mode={transitionMode}
            morphStyle={morphStyle}
            fontFamily={fontFamily}
            color={secondsColor}
          />
          <DigitalDigit
            digit={sStr[1]}
            fontSize={fontSize}
            itemHeight={itemHeight}
            mode={transitionMode}
            morphStyle={morphStyle}
            fontFamily={fontFamily}
            color={secondsColor}
          />
        </div>
      </div>
    </div>
  );
};
