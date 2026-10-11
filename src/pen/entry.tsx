// Entry for the CodePen export. The exporter bundles this file and prepends
// `const CLOCK_CONFIG = {...}` to the output, so in the pen the config sits at the top.
import { createRoot } from 'react-dom/client';
import { PenClock } from './PenClock';
import type { ClockConfig } from '../clock.config';

declare const CLOCK_CONFIG: ClockConfig;

createRoot(document.getElementById('root')!).render(<PenClock config={CLOCK_CONFIG} />);
