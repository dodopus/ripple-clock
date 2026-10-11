import React, { useEffect, useRef, useState, useMemo } from 'react';
import { interpolate } from 'flubber';
import { DigitMorphStyle } from '../types/clock';

interface Props {
  digit: string; // '0'..'9'
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  morphStyle?: DigitMorphStyle;
}

// -------------------------------------------------------------
// GEOMETRIC STROKE NUMERALS (viewBox 0 0 60 100)
// Clean single-stroke vectors designed with balanced optical weights
// -------------------------------------------------------------
export const STROKE_DIGIT_PATHS: Record<string, string> = {
  '0': 'M 30 16 C 44 16 48 32 48 51 C 48 70 44 86 30 86 C 16 86 12 70 12 51 C 12 32 16 16 30 16',
  '1': 'M 22 28 L 32 16 L 32 86',
  '2': 'M 16 32 C 16 18 24 16 32 16 C 44 16 47 24 47 33 C 47 48 34 64 16 86 L 47 86',
  '3': 'M 16 28 C 22 17 32 16 38 16 C 46 16 47 24 47 34 C 47 43 38 49 31 50 C 40 51 47 59 47 69 C 47 79 40 86 31 86 C 21 86 15 79 15 71',
  '4': 'M 36 16 L 14 56 L 47 56 L 36 56 L 36 86',
  '5': 'M 46 16 L 18 16 L 16 46 C 22 41 30 40 36 40 C 45 40 47 49 47 65 C 47 77 40 86 30 86 C 20 86 14 79 14 71',
  '6': 'M 42 22 C 32 16 20 24 16 42 C 12 56 12 73 16 80 C 20 86 30 86 37 86 C 46 86 47 76 47 65 C 47 53 39 46 29 46 C 19 46 14 56 14 68',
  '7': 'M 14 16 L 47 16 L 26 86',
  '8': 'M 30 16 C 39 16 46 23 46 33 C 46 43 38 49 30 49 C 22 49 14 55 14 66 C 14 77 21 86 30 86 C 39 86 46 77 46 66 C 46 55 38 49 30 49 C 22 49 14 43 14 33 C 14 23 21 16 30 16',
  '9': 'M 18 80 C 28 86 40 78 44 60 C 48 46 48 29 44 22 C 40 16 30 16 23 16 C 14 16 13 26 13 37 C 13 49 21 56 31 56 C 41 56 46 46 46 34',
};

// -------------------------------------------------------------
// PRE-SAMPLED 41-POINT PATH COORDINATES FOR ZERO-TEAR STROKE MORPHING
// Eliminates polygon closure loops, diagonal tears, and chord glitches completely!
// -------------------------------------------------------------
const STROKE_SAMPLES: Record<string, [number, number][]> = {
  '0': [[30,16],[34.4,16.6],[38.3,18.5],[41.4,21.5],[43.7,25.3],[45.4,29.3],[46.5,33.5],[47.2,37.9],[47.7,42.3],[47.9,46.6],[48,51],[47.9,55.4],[47.7,59.7],[47.2,64.1],[46.5,68.5],[45.4,72.7],[43.7,76.7],[41.4,80.5],[38.3,83.5],[34.4,85.4],[30,86],[25.6,85.4],[21.7,83.5],[18.6,80.5],[16.3,76.7],[14.6,72.7],[13.5,68.5],[12.8,64.1],[12.3,59.7],[12.1,55.4],[12,51],[12.1,46.6],[12.3,42.3],[12.8,37.9],[13.5,33.5],[14.6,29.3],[16.3,25.3],[18.6,21.5],[21.7,18.5],[25.6,16.6],[30,16]],
  '1': [[22,28],[23.4,26.4],[24.7,24.7],[26.1,23.1],[27.5,21.4],[28.9,19.8],[30.2,18.1],[31.6,16.5],[32,17.5],[32,19.6],[32,21.8],[32,23.9],[32,26.1],[32,28.2],[32,30.3],[32,32.5],[32,34.6],[32,36.8],[32,38.9],[32,41],[32,43.2],[32,45.3],[32,47.5],[32,49.6],[32,51.8],[32,53.9],[32,56],[32,58.2],[32,60.3],[32,62.5],[32,64.6],[32,66.7],[32,68.9],[32,71],[32,73.2],[32,75.3],[32,77.4],[32,79.6],[32,81.7],[32,83.9],[32,86]],
  '2': [[16,32],[16.2,28.3],[16.9,24.8],[18.4,21.5],[20.9,18.8],[24.1,17.1],[27.6,16.3],[31.3,16],[34.9,16.2],[38.4,17],[41.6,18.7],[44.1,21.3],[45.8,24.6],[46.6,28.1],[47,31.7],[46.9,35.4],[46.3,39],[45.4,42.5],[44.1,45.9],[42.6,49.2],[40.9,52.4],[39.1,55.5],[37.1,58.7],[35,61.7],[32.9,64.6],[30.7,67.5],[28.5,70.4],[26.3,73.3],[24,76.1],[21.7,79],[19.5,81.8],[17.1,84.6],[17.9,86],[21.5,86],[25.1,86],[28.8,86],[32.4,86],[36.1,86],[39.7,86],[43.4,86],[47,86]],
  '3': [[16,28],[18,24.8],[20.6,22],[23.5,19.7],[26.9,17.9],[30.5,16.8],[34.2,16.2],[38,16],[41.7,16.8],[44.5,19.3],[46,22.8],[46.7,26.5],[46.9,30.2],[47,34],[46.5,37.8],[44.9,41.2],[42.5,44.2],[39.6,46.6],[36.3,48.4],[32.7,49.7],[33,50.3],[36.6,51.6],[39.8,53.6],[42.5,56.3],[44.6,59.4],[46.1,62.9],[46.9,66.6],[47,70.3],[46.4,74.1],[45,77.6],[42.8,80.8],[40,83.3],[36.7,85],[33,85.9],[29.2,85.9],[25.5,85.2],[22,83.7],[19.1,81.3],[16.8,78.3],[15.5,74.7],[15,71]],
  '4': [[36,16],[34.6,18.6],[33.1,21.2],[31.7,23.9],[30.2,26.5],[28.8,29.1],[27.4,31.7],[25.9,34.3],[24.5,37],[23,39.6],[21.6,42.2],[20.1,44.8],[18.7,47.5],[17.3,50.1],[15.8,52.7],[14.4,55.3],[16.2,56],[19.2,56],[22.2,56],[25.2,56],[28.2,56],[31.2,56],[34.2,56],[37.1,56],[40.1,56],[43.1,56],[46.1,56],[44.9,56],[41.9,56],[38.9,56],[36,56.1],[36,59.1],[36,62.1],[36,65.1],[36,68.1],[36,71],[36,74],[36,77],[36,80],[36,83],[36,86]],
  '5': [[46,16],[41.9,16],[37.8,16],[33.7,16],[29.5,16],[25.4,16],[21.3,16],[17.9,16.8],[17.7,20.9],[17.4,25],[17.1,29.1],[16.9,33.2],[16.6,37.3],[16.3,41.4],[16,45.6],[19,43.9],[22.7,42.2],[26.7,41],[30.7,40.3],[34.8,40],[38.9,40.4],[42.4,42.4],[44.6,45.9],[45.8,49.8],[46.5,53.8],[46.8,58],[47,62.1],[47,66.2],[46.5,70.3],[45.4,74.3],[43.7,78],[41.2,81.2],[38,83.8],[34.2,85.4],[30.2,86],[26,85.6],[22.2,84.3],[18.8,82],[16.2,78.9],[14.5,75.1],[14,71]],
  '6': [[42,22],[37.7,20.3],[33.1,20.2],[28.7,21.7],[25,24.4],[22,27.9],[19.6,31.9],[17.7,36.1],[16.3,40.6],[15.2,45],[14.3,49.5],[13.6,54.1],[13.2,58.7],[13,63.4],[13.1,68],[13.7,72.6],[14.7,77.1],[16.9,81.2],[20.7,83.8],[25.1,85.2],[29.7,85.8],[34.3,86],[38.9,85.8],[43,83.7],[45.3,79.8],[46.4,75.3],[46.9,70.7],[47,66.1],[46.7,61.4],[45.6,57],[43.4,52.9],[40.2,49.6],[36.1,47.3],[31.7,46.2],[27,46.1],[22.7,47.6],[19.1,50.6],[16.7,54.5],[15.1,58.8],[14.3,63.4],[14,68]],
  '7': [[14,16],[16.7,16],[19.3,16],[22,16],[24.6,16],[27.3,16],[29.9,16],[32.6,16],[35.2,16],[37.9,16],[40.5,16],[43.2,16],[45.8,16],[46.6,17.4],[45.8,20],[45.1,22.5],[44.3,25],[43.5,27.6],[42.8,30.1],[42,32.7],[41.2,35.2],[40.5,37.7],[39.7,40.3],[39,42.8],[38.2,45.4],[37.4,47.9],[36.7,50.4],[35.9,53],[35.1,55.5],[34.4,58.1],[33.6,60.6],[32.9,63.1],[32.1,65.7],[31.3,68.2],[30.6,70.8],[29.8,73.3],[29,75.8],[28.3,78.4],[27.5,80.9],[26.8,83.5],[26,86]],
  '8': [[30,16],[35.2,16.8],[39.8,19.3],[43.3,23.3],[45.4,28.1],[46,33.3],[45.1,38.5],[42.5,43.1],[38.5,46.6],[33.7,48.6],[28.4,49.1],[23.3,50.5],[19,53.4],[15.8,57.7],[14.3,62.7],[14.1,67.9],[15,73.1],[17.1,78],[20.4,82.1],[24.8,85],[30,86],[35.2,85],[39.6,82.1],[42.9,78],[45,73.1],[45.9,67.9],[45.7,62.7],[44.2,57.7],[41,53.4],[36.7,50.5],[31.6,49.1],[26.3,48.6],[21.5,46.6],[17.5,43.1],[14.9,38.5],[14,33.3],[14.6,28.1],[16.7,23.3],[20.2,19.3],[24.8,16.8],[30,16]],
  '9': [[18,80],[22.3,81.7],[26.9,81.8],[31.3,80.3],[35,77.6],[38,74.1],[40.4,70.1],[42.3,65.9],[43.7,61.4],[44.8,57],[45.7,52.5],[46.4,47.9],[46.8,43.3],[47,38.6],[46.9,34],[46.3,29.4],[45.3,24.9],[43.1,20.8],[39.3,18.2],[34.9,16.8],[30.3,16.2],[25.7,16],[21.1,16.2],[17,18.3],[14.7,22.2],[13.6,26.7],[13.1,31.3],[13,35.9],[13.3,40.6],[14.4,45],[16.6,49.1],[19.8,52.4],[23.9,54.7],[28.3,55.8],[33,55.9],[37.3,54.4],[40.9,51.4],[43.3,47.5],[44.9,43.2],[45.7,38.6],[46,34]],
};

// -------------------------------------------------------------
// FILLED TYPOGRAPHIC GLYPHS (viewBox 0 0 60 100)
// High-contrast Grotesque / DIN typographic silhouettes with proper counters
// -------------------------------------------------------------
export const FILL_DIGIT_PATHS: Record<string, string> = {
  '0': 'M 30 14 C 44 14 48 30 48 50 C 48 70 44 86 30 86 C 16 86 12 70 12 50 C 12 30 16 14 30 14 Z M 30 24 C 22 24 20 36 20 50 C 20 64 22 76 30 76 C 38 76 40 64 40 50 C 40 36 38 24 30 24 Z',
  '1': 'M 22 26 L 34 14 L 34 86 L 22 86 L 22 80 L 28 80 L 28 22 L 22 26 Z',
  '2': 'M 14 32 C 14 18 24 14 32 14 C 42 14 47 22 47 32 C 47 46 36 60 22 78 L 48 78 L 48 86 L 14 86 L 14 78 L 32 54 C 40 44 41 36 41 32 C 41 24 37 20 31 20 C 24 20 20 24 20 32 Z',
  '3': 'M 16 28 C 22 17 32 14 38 14 C 46 14 48 22 48 32 C 48 40 42 46 34 48 C 43 50 49 58 49 68 C 49 78 42 86 32 86 C 22 86 14 78 14 70 L 21 70 C 21 75 25 80 32 80 C 38 80 42 75 42 68 C 42 60 36 55 28 55 L 26 55 L 26 49 L 28 49 C 35 49 41 45 41 32 C 41 24 37 20 31 20 C 25 20 21 24 21 28 Z',
  '4': 'M 36 14 L 36 58 L 12 58 L 12 50 L 30 14 L 36 14 Z M 30 25 L 18 52 L 30 52 Z M 36 64 L 36 86 L 30 86 L 30 64 Z',
  '5': 'M 46 14 L 18 14 L 16 46 C 22 41 30 40 36 40 C 44 40 48 48 48 64 C 48 78 41 86 30 86 C 20 86 14 78 14 70 L 21 70 C 21 75 25 80 30 80 C 37 80 41 74 41 64 C 41 53 37 46 30 46 C 24 46 18 49 18 49 L 22 20 L 46 20 Z',
  '6': 'M 42 20 L 38 24 C 28 18 20 28 17 44 C 21 40 28 38 34 38 C 43 38 48 46 48 62 C 48 76 41 86 30 86 C 18 86 12 74 12 52 C 12 30 22 14 36 14 C 40 14 44 18 42 20 Z M 30 44 C 23 44 18 51 18 62 C 18 73 23 80 30 80 C 37 80 41 73 41 62 C 41 51 37 44 30 44 Z',
  '7': 'M 14 14 L 48 14 L 48 20 L 26 86 L 19 86 L 41 20 L 14 20 Z',
  '8': 'M 30 14 C 40 14 46 22 46 32 C 46 41 40 47 32 49 C 41 51 47 58 47 68 C 47 78 40 86 30 86 C 20 86 13 78 13 68 C 13 58 19 51 28 49 C 20 47 14 41 14 32 C 14 22 20 14 30 14 Z M 30 20 C 24 20 20 25 20 32 C 20 39 24 44 30 44 C 36 44 40 39 40 32 C 40 25 36 20 30 20 Z M 30 54 C 23 54 19 60 19 68 C 19 76 23 80 30 80 C 37 80 41 76 41 68 C 41 60 37 54 30 54 Z',
  '9': 'M 18 80 L 22 76 C 32 82 40 72 43 56 C 39 60 32 62 26 62 C 17 62 12 54 12 38 C 12 24 19 14 30 14 C 42 14 48 26 48 48 C 48 70 38 86 24 86 C 20 86 16 82 18 80 Z M 30 56 C 37 56 42 49 42 38 C 42 27 37 20 30 20 C 23 20 19 27 19 38 C 19 49 23 56 30 56 Z',
};

// Global memoized cache of Flubber interpolators for filled mode
const FILL_INTERPOLATOR_CACHE = new Map<string, (t: number) => string>();

function getFillInterpolator(fromDigit: string, toDigit: string): (t: number) => string {
  const cacheKey = `${fromDigit}->${toDigit}`;
  const existing = FILL_INTERPOLATOR_CACHE.get(cacheKey);
  if (existing) return existing;

  const pA = FILL_DIGIT_PATHS[fromDigit] || FILL_DIGIT_PATHS['0'];
  const pB = FILL_DIGIT_PATHS[toDigit] || FILL_DIGIT_PATHS['0'];

  try {
    const fn = interpolate(pA, pB, { maxSegmentLength: 2 });
    FILL_INTERPOLATOR_CACHE.set(cacheKey, fn);
    return fn;
  } catch {
    const fallback = (_t: number) => pB;
    FILL_INTERPOLATOR_CACHE.set(cacheKey, fallback);
    return fallback;
  }
}

// Zero-tear stroke interpolator: linearly transitions 41 points along the curve
function getStrokeInterpolator(fromDigit: string, toDigit: string): (t: number) => string {
  const ptsA = STROKE_SAMPLES[fromDigit] || STROKE_SAMPLES['0'];
  const ptsB = STROKE_SAMPLES[toDigit] || STROKE_SAMPLES['0'];

  return (t: number) => {
    const p0x = ptsA[0][0] + (ptsB[0][0] - ptsA[0][0]) * t;
    const p0y = ptsA[0][1] + (ptsB[0][1] - ptsA[0][1]) * t;
    let d = `M ${p0x.toFixed(1)} ${p0y.toFixed(1)}`;
    for (let i = 1; i < ptsA.length; i++) {
      const x = ptsA[i][0] + (ptsB[i][0] - ptsA[i][0]) * t;
      const y = ptsA[i][1] + (ptsB[i][1] - ptsA[i][1]) * t;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return d;
  };
}

function easeOutQuart(x: number): number {
  return 1 - Math.pow(1 - x, 4);
}

export const MorphingVectorDigit: React.FC<Props> = ({
  digit,
  width,
  height,
  color,
  strokeWidth,
  morphStyle = 'stroke',
}) => {
  const targetPath = morphStyle === 'fill'
    ? (FILL_DIGIT_PATHS[digit] || FILL_DIGIT_PATHS['0'])
    : (STROKE_DIGIT_PATHS[digit] || STROKE_DIGIT_PATHS['0']);

  const [currentPathD, setCurrentPathD] = useState<string>(targetPath);
  const prevDigitRef = useRef<string>(digit);
  const animFrameRef = useRef<number | null>(null);
  const animStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const prev = prevDigitRef.current;
    if (prev === digit) {
      setCurrentPathD(targetPath);
      return;
    }

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }

    const interpolator = morphStyle === 'fill'
      ? getFillInterpolator(prev, digit)
      : getStrokeInterpolator(prev, digit);

    prevDigitRef.current = digit;
    animStartTimeRef.current = performance.now();
    const duration = 280; // ms transition

    const step = (now: number) => {
      const elapsed = now - animStartTimeRef.current;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeOutQuart(progress);

      try {
        const nextD = interpolator(eased);
        setCurrentPathD(nextD);
      } catch {
        setCurrentPathD(targetPath);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        setCurrentPathD(targetPath);
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [digit, targetPath, morphStyle]);

  const normalizedStrokeWidth = useMemo(() => {
    return Math.max(1.8, (strokeWidth * 60) / Math.max(20, width));
  }, [strokeWidth, width]);

  return (
    <div
      className="inline-flex items-center justify-center select-none"
      style={{
        width,
        height,
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 60 100"
        className="w-full h-full overflow-visible"
        style={{ display: 'block' }}
      >
        {morphStyle === 'fill' ? (
          <path
            d={currentPathD}
            fill={color}
            fillRule="evenodd"
            className="transition-colors duration-150"
          />
        ) : (
          <path
            d={currentPathD}
            fill="none"
            stroke={color}
            strokeWidth={normalizedStrokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-colors duration-150"
          />
        )}
      </svg>
    </div>
  );
};
