import rawConfig from './clock.config.json';
import type { AnimationParams, VariationId } from './types/clock';

/**
 * Everything needed to reproduce a clock look: the ripple study plus its params.
 * This is the exact shape that "Copy config" in the settings drawer puts on the
 * clipboard and that the CodePen export bakes into `const CLOCK_CONFIG = …`.
 */
export interface ClockConfig {
  variation: VariationId;
  params: AnimationParams;
}

/**
 * The lab's defaults. To make a look you dialled in the new default, use
 * "Copy config" in the settings drawer and paste it over `clock.config.json`.
 */
export const DEFAULT_CLOCK_CONFIG = rawConfig as ClockConfig;

export const serializeConfig = (config: ClockConfig): string => JSON.stringify(config, null, 2);
