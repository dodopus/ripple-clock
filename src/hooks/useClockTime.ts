import { useState, useEffect, useRef, useCallback } from 'react';
import { ActivePulse, AnimationParams } from '../types/clock';

export interface ClockTime {
  hours: number;
  minutes: number;
  seconds: number;
  fraction: number;
  rawTimestamp: number;
}

interface Options {
  /** false = hold the second hand at `scrubSecond` (lab scrubbing). */
  isLiveTime?: boolean;
  scrubSecond?: number;
}

// How often (in frames) decayed pulses are swept out between second ticks
const PULSE_SWEEP_FRAMES = 30;

const toClockTime = (totalSec: number, now: number): ClockTime => {
  const total = Math.max(0, totalSec);
  return {
    hours: Math.floor(total / 3600) % 24,
    minutes: Math.floor((total % 3600) / 60),
    seconds: Math.floor(total % 60),
    fraction: total % 1,
    rawTimestamp: now,
  };
};

/**
 * 60fps time source + acoustic pulse emitter shared by the lab and the CodePen export.
 * Handles system/custom time, the master speed multiplier, freezing and frame stepping.
 */
export function useClockTime(params: AnimationParams, { isLiveTime = true, scrubSecond = 0 }: Options = {}) {
  // Active in-flight pulses that persist across ticks and naturally decay
  const [activePulses, setActivePulses] = useState<ActivePulse[]>([]);
  const pulseIdCounter = useRef<number>(0);
  const lastSecondRef = useRef<number>(-1);

  const [time, setTime] = useState<ClockTime>(() => toClockTime(10 * 3600 + 42 * 60 + 18, performance.now()));

  // Simulated continuous second accumulator for slow-motion and custom time
  const simulatedSecRef = useRef<number>(10 * 3600 + 42 * 60 + 18);
  const lastTickTimeRef = useRef<number>(performance.now());

  // Initialize simulated time when switching to custom time
  useEffect(() => {
    if (params.timeSource === 'custom') {
      simulatedSecRef.current = params.customHours * 3600 + params.customMinutes * 60 + params.customSeconds;
    }
  }, [params.timeSource, params.customHours, params.customMinutes, params.customSeconds]);

  // Step frame forward when paused
  const stepFrame = useCallback((deltaSec = 1 / 60) => {
    simulatedSecRef.current += deltaSec;
    setTime(toClockTime(simulatedSecRef.current, performance.now()));
  }, []);

  // Time loop with master speed multiplier & canvas freeze support
  useEffect(() => {
    let animId: number;
    let frame = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - lastTickTimeRef.current) / 1000));
      lastTickTimeRef.current = now;

      // Frozen or speed 0: do not advance time or emit new pulses
      if (params.isPaused || params.speedMultiplier === 0) {
        animId = requestAnimationFrame(tick);
        return;
      }

      const speedMult = Math.max(0, params.speedMultiplier ?? 1.0);
      let next: ClockTime;

      if (params.timeSource === 'custom') {
        if (params.customTimeRunning) {
          simulatedSecRef.current += dt * speedMult;
        }
        next = toClockTime(simulatedSecRef.current, now);
      } else if (speedMult === 1.0 && isLiveTime) {
        const d = new Date();
        simulatedSecRef.current = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() + d.getMilliseconds() / 1000;
        next = toClockTime(simulatedSecRef.current, now);
      } else if (!isLiveTime) {
        next = { hours: 10, minutes: 42, seconds: scrubSecond, fraction: ((now / 1000) / params.speed) % 1, rawTimestamp: now };
      } else {
        // Slow-motion or fast-forward system time simulation
        simulatedSecRef.current += dt * speedMult;
        next = toClockTime(simulatedSecRef.current, now);
      }

      setTime(next);

      const isAlive = (p: ActivePulse) => (now - p.birthTime) / 1000 < params.decayDuration;

      if (next.seconds !== lastSecondRef.current) {
        // New second tick: spawn a pulse
        lastSecondRef.current = next.seconds;
        const originAngle = (next.seconds / 60) * (Math.PI * 2) - Math.PI / 2;
        setActivePulses((prev) => [
          ...prev.filter(isAlive),
          { id: ++pulseIdCounter.current, originAngle, birthTime: now, initialAmplitude: 1.0 },
        ]);
      } else if (++frame % PULSE_SWEEP_FRAMES === 0) {
        setActivePulses((prev) => {
          const unexpired = prev.filter(isAlive);
          return unexpired.length === prev.length ? prev : unexpired;
        });
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

  const triggerPulse = useCallback(() => {
    const now = performance.now();
    const originAngle = (time.seconds / 60) * (Math.PI * 2) - Math.PI / 2;
    setActivePulses((prev) => [
      ...prev.filter((p) => (now - p.birthTime) / 1000 < params.decayDuration),
      { id: ++pulseIdCounter.current, originAngle, birthTime: now, initialAmplitude: 1.3 },
    ]);
  }, [time.seconds, params.decayDuration]);

  return { time, activePulses, stepFrame, triggerPulse };
}
