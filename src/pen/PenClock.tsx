import { useEffect, useState } from 'react';
import { AcousticCircleCanvas } from '../components/AcousticCircleCanvas';
import { useClockTime } from '../hooks/useClockTime';
import { isColorDark } from '../utils/math';
import type { ClockConfig } from '../clock.config';

const fitSize = () => Math.max(200, Math.round(Math.min(window.innerWidth * 0.88, window.innerHeight * 0.82, 640)));

/** The bare clock: what the CodePen export renders, with no lab UI around it. */
export function PenClock({ config }: { config: ClockConfig }) {
  const { variation, params } = config;
  const [size, setSize] = useState(fitSize);
  const { time, activePulses } = useClockTime(params);

  useEffect(() => {
    const onResize = () => setSize(fitSize());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const background = params.backgroundColor || (isColorDark(params.backgroundColor) ? '#000000' : '#ffffff');

  return (
    <main
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background,
      }}
    >
      <AcousticCircleCanvas
        variation={variation}
        size={size}
        hours={time.hours}
        minutes={time.minutes}
        seconds={time.seconds}
        fraction={time.fraction}
        rawTimestamp={time.rawTimestamp}
        params={params}
        activePulses={activePulses}
      />
    </main>
  );
}
