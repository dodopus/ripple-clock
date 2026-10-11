import React, { useRef, useEffect } from 'react';
import {
  VariationId,
  AnimationParams,
  ActivePulse,
  WeatherData,
  RingLayer,
} from '../types/clock';
import {
  TWO_PI,
  CHARCOAL_COLORS,
  GLOW_PRESETS,
  gaussian,
  angularDistance,
  clockwiseDistance,
  counterClockwiseDistance,
  fractalNoise,
  circumferentialFbm,
  circumferentialInterference,
  seismicDivergenceProfile,
  hash2D,
  isColorDark,
} from '../utils/math';
import { RollingDigitalTime } from './RollingDigitalTime';
import { DEFAULT_PRIMARY_RING } from '../utils/presets';

interface Props {
  variation: VariationId;
  size: number;
  hours: number;
  minutes: number;
  seconds: number;
  fraction: number;
  rawTimestamp: number;
  params: AnimationParams;
  activePulses: ActivePulse[];
  morphProgress?: number; // 0 = Pure Clock, 1 = Pure Weather
  weatherData?: WeatherData;
  showCenterText?: boolean;
  className?: string;
}

export const AcousticCircleCanvas: React.FC<Props> = ({
  variation,
  size,
  hours,
  minutes,
  seconds,
  fraction,
  rawTimestamp,
  params,
  activePulses,
  morphProgress = 0,
  weatherData,
  showCenterText = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Motion Smoothing Dynamics (Configurable via user's fine sliders):
  let smoothSecValue = seconds;
  const tickDur = Math.max(0.001, params.tickDuration ?? 0.28);
  if (tickDur >= 0.98) {
    // 100% Continuous liquid sweep
    smoothSecValue = seconds + fraction;
  } else if (params.secondMotion === 'smooth') {
    smoothSecValue = seconds + fraction;
  } else {
    // Escapement / Spring step easing
    const u = Math.min(1.0, fraction / tickDur);
    const tension = params.elasticTension ?? 0.45;
    const damp = params.dampingFactor ?? 0.8;

    let eased: number;
    if (tension > 0.05) {
      // Damped harmonic oscillator recoil
      const decay = Math.exp(-damp * u * 6);
      const osc = Math.cos(u * Math.PI * (1 + tension * 2.5));
      eased = 1.0 - decay * osc;
    } else {
      // Smooth cubic ease-out step
      eased = 1 - Math.pow(1 - u, 3);
    }
    smoothSecValue = seconds + eased;
  }

  // Current second angle around circle (-PI/2 is top / 12 o'clock)
  const secondAngle = (smoothSecValue / 60) * TWO_PI - Math.PI / 2;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle High-DPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const baseRadius = size * 0.38;

    // Adapt linework and text contrast dynamically to background color
    const isDarkBg = isColorDark(params.backgroundColor);
    const inkRgb = isDarkBg ? '255, 255, 255' : '24, 24, 27';
    const inkDimRgb = isDarkBg ? '212, 212, 216' : '82, 82, 91';
    const inkSolid = isDarkBg ? '#ffffff' : '#18181b';

    const morph = Math.max(0, Math.min(1, morphProgress));
    const now = rawTimestamp;

    // Direction Biasing (0% = all CCW, 50% = 50/50, 100% = all CW)
    const biasRatio = Math.max(0, Math.min(100, params.directionBias ?? 50)) / 100;
    const cwBiasFactor = biasRatio * 2;
    const ccwBiasFactor = (1 - biasRatio) * 2;

    // Initial shock smoother (Wave root attack duration)
    const attack = Math.max(0.001, params.attackDuration ?? 0.18);

    // Heavy initial stroke multiplier coupled with amplitude
    const initStrokeWeight = params.initialStrokeWeight ?? 2.0;
    const ampStrokeLink = params.linkStrokeToAmplitude ? (1 + params.amplitude * 1.5) : 1.0;
    const crestWeightBoost = (initStrokeWeight * ampStrokeLink - 1);
    const strokeTaperRate = params.strokeTaperRate ?? 1.2;

    // Directional distance helper
    const getDirectionalDist = (theta: number, originAngle: number) => {
      if (params.direction === 'clockwise') {
        return clockwiseDistance(theta, originAngle);
      } else if (params.direction === 'counter') {
        return counterClockwiseDistance(theta, originAngle);
      } else {
        return angularDistance(theta, originAngle);
      }
    };

    // Helper: Build in-flight pulses for a given time offset
    const getPulsesToRender = (timeOffsetSec: number) => {
      const pulsesList: {
        originAngle: number;
        travelDist: number;
        strength: number;
        phaseShift: number;
        ageSec: number;
        attackGain: number;
      }[] = [];

      if (activePulses && activePulses.length > 0) {
        for (let i = 0; i < activePulses.length; i++) {
          const pulse = activePulses[i];
          const ageSec = Math.max(0, (now - pulse.birthTime) / 1000 + timeOffsetSec);
          const decayProgress = ageSec / Math.max(0.1, params.decayDuration);
          if (decayProgress >= 1.0) continue;

          const attackGain = ageSec < attack
            ? Math.sin((ageSec / attack) * (Math.PI / 2))
            : 1.0;

          const strength = pulse.initialAmplitude * Math.pow(1.0 - decayProgress, 1.6) * attackGain;
          const totalTravel = (Math.PI / Math.max(0.1, params.speed)) * ageSec;

          let travelDist = totalTravel;
          if (params.direction === 'both') {
            const cycle = totalTravel % (Math.PI * 2);
            travelDist = cycle <= Math.PI ? cycle : (Math.PI * 2 - cycle);
          }

          pulsesList.push({
            originAngle: pulse.originAngle,
            travelDist,
            strength,
            phaseShift: ageSec * 12,
            ageSec,
            attackGain,
          });
        }
      }

      if (pulsesList.length === 0) {
        const cycle = ((now / 1000 + timeOffsetSec) / params.speed) % 1;
        const fallbackTravel = params.direction === 'both' ? cycle * Math.PI : cycle * TWO_PI;
        pulsesList.push({
          originAngle: secondAngle,
          travelDist: fallbackTravel,
          strength: 1.0,
          phaseShift: (now / 1000) * 12,
          ageSec: 0.5,
          attackGain: 1.0,
        });
      }

      return pulsesList;
    };

    // Helper: Compute wave metrics for a given angle on a specific ring
    const computeWaveMetrics = (
      theta: number,
      pulses: ReturnType<typeof getPulsesToRender>,
      secAngle: number
    ) => {
      const dOrigin = angularDistance(theta, secAngle);
      const originPeak = gaussian(dOrigin, 0, 0.32);

      let totalRadialRipple = 0;
      let totalPacketEnv = 0;
      let totalThicknessMultiplier = 0;
      const waveSigma = 0.42;

      for (let p = 0; p < pulses.length; p++) {
        const pulse = pulses[p];
        const travelProgress = Math.min(1, pulse.travelDist / Math.PI);
        const strokeTaper = Math.max(0, Math.pow(1 - travelProgress, strokeTaperRate));
        const crestMultiplier = 1 + crestWeightBoost * strokeTaper;

        let packetEnv = 0;
        let ripple = 0;

        if (params.direction === 'both') {
          const dCW = clockwiseDistance(theta, pulse.originAngle);
          const dCCW = counterClockwiseDistance(theta, pulse.originAngle);

          const envCW = gaussian(dCW, pulse.travelDist, waveSigma) * pulse.strength * cwBiasFactor;
          const envCCW = gaussian(dCCW, pulse.travelDist, waveSigma) * pulse.strength * ccwBiasFactor;

          const dMin = Math.min(dCW, dCCW);
          const spatialDecay = 1.0 - (1.0 - params.decay) * (dMin / Math.PI);
          packetEnv = (envCW + envCCW) * spatialDecay;

          if (params.collisionMode === 'constructive' && Math.abs(pulse.travelDist - Math.PI) < 0.3) {
            const collisionFactor = gaussian(angularDistance(theta, pulse.originAngle), Math.PI, 0.35) * pulse.strength;
            packetEnv += collisionFactor * 0.7;
          }

          const rippleCW = Math.cos(params.frequency * (dCW - pulse.travelDist)) * envCW;
          const rippleCCW = Math.cos(params.frequency * (dCCW - pulse.travelDist)) * envCCW;
          ripple = rippleCW + rippleCCW;
        } else {
          const d = getDirectionalDist(theta, pulse.originAngle);
          const currentPacketCenter = pulse.travelDist % TWO_PI;
          let diff = Math.abs(d - currentPacketCenter);
          if (diff > Math.PI) diff = TWO_PI - diff;
          packetEnv = Math.exp(-0.5 * (diff / waveSigma) * (diff / waveSigma)) * pulse.strength;

          const loopDecay = Math.max(0.2, 1.0 - (pulse.travelDist / (TWO_PI * 1.5)) * (1.0 - params.decay));
          packetEnv *= loopDecay;
          ripple = Math.cos(params.frequency * (d - pulse.travelDist)) * packetEnv;
        }

        totalRadialRipple += ripple;
        totalPacketEnv += packetEnv;
        totalThicknessMultiplier += packetEnv * 1.6 * crestMultiplier;
      }

      // Elastic Membrane Outline Deformation calculation
      const activeMembraneDepth = (params.membraneStretch !== undefined && params.membraneStretch > 0)
        ? params.membraneStretch
        : (variation === 'membrane-stretch' ? 36 : 0);
      const membraneWidth = Math.max(0.12, params.membraneWidth ?? 0.36);

      let membranePush = 0;
      if (activeMembraneDepth > 0) {
        const u = dOrigin / membraneWidth;
        if (u < 1.0) {
          membranePush = activeMembraneDepth * Math.pow(1 - u * u, 2) * (1 - morph * 0.7);
        }
      }

      return {
        d: dOrigin,
        packetEnv: totalPacketEnv,
        originPeak,
        radialRipple: totalRadialRipple,
        thicknessMultiplier: totalThicknessMultiplier,
        membranePush,
      };
    };

    // -------------------------------------------------------------
    // GLOW & EMITTER AURA SETUP
    // -------------------------------------------------------------
    const glowConfig = GLOW_PRESETS[params.glowMode || 'none'] || GLOW_PRESETS.none;
    const isGlowActive = params.glowMode && params.glowMode !== 'none' && (params.glowIntensity ?? 25) > 0;
    const glowFactor = (params.glowIntensity ?? 25) / 100;

    if (isGlowActive) {
      ctx.save();
      const originPush = (params.membraneStretch || (variation === 'membrane-stretch' ? 36 : 0)) * (1 - morph * 0.7);
      const originR = baseRadius + originPush;
      const originX = cx + Math.cos(secondAngle) * originR;
      const originY = cy + Math.sin(secondAngle) * originR;
      const auraRadius = Math.max(22, size * 0.09);

      const grad = ctx.createRadialGradient(originX, originY, 1, originX, originY, auraRadius);
      const alphaPeak = 0.45 * glowFactor * (1 - morph * 0.4);
      grad.addColorStop(0, glowConfig.emitterRgba.replace(/[\d\.]+\)$/, `${alphaPeak})`));
      grad.addColorStop(0.5, glowConfig.emitterRgba.replace(/[\d\.]+\)$/, `${alphaPeak * 0.35})`));
      grad.addColorStop(1, glowConfig.emitterRgba.replace(/[\d\.]+\)$/, '0)'));

      ctx.beginPath();
      ctx.arc(originX, originY, auraRadius, 0, TWO_PI);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }

    // -------------------------------------------------------------
    // MULTI-RING LAYER SYSTEM (Primary + Additional Rings in Order)
    // -------------------------------------------------------------
    const rawRings: RingLayer[] = params.rings && params.rings.length > 0
      ? params.rings
      : [DEFAULT_PRIMARY_RING];

    // Filter to only visible rings, rendered from bottom to top
    // (layer 0 is rendered first, later layers on top)
    const visibleRings = rawRings.filter((r) => r.visible !== false);

    // Helper: Compute circumferential noise & interference displacement for any ring
    const computeLayerNoise = (theta: number, rLayer: RingLayer, timeSec: number) => {
      if (!rLayer.noiseEnabled && !(rLayer.noiseAmplitude && rLayer.noiseAmplitude > 0)) {
        return 0;
      }
      const amp = rLayer.noiseAmplitude ?? 8;
      const freq = rLayer.noiseFrequency ?? 14;
      const spd = rLayer.noiseSpeed ?? 1.2;
      const nType = rLayer.noiseType ?? 'fractal';

      let nVal = 0;
      if (nType === 'fractal') {
        nVal = circumferentialFbm(theta, timeSec, freq, spd, 4);
      } else if (nType === 'interference') {
        nVal = circumferentialInterference(theta, timeSec, freq);
      } else if (nType === 'seismic') {
        nVal = circumferentialFbm(theta, timeSec, freq, spd, 4);
        if (Math.abs(nVal) > 0.3) nVal *= 1.9;
      } else if (nType === 'particulate') {
        const rawFbm = circumferentialFbm(theta, timeSec, freq * 1.5, spd * 1.5, 3);
        const staticHash = hash2D(Math.floor(theta * 100), Math.floor(timeSec * 8));
        nVal = rawFbm * 0.65 + staticHash * 0.35;
      } else {
        nVal = Math.sin(theta * freq + timeSec * spd * 3) * 0.7 + Math.cos(theta * (freq * 0.5) - timeSec * spd) * 0.3;
      }

      if (rLayer.divergenceSpikes) {
        const dAngle = rLayer.divergenceAngle !== undefined ? rLayer.divergenceAngle : -0.65;
        const dIntensity = (rLayer.divergenceIntensity ?? 65) / 100;
        const spike = seismicDivergenceProfile(theta, dAngle, dIntensity * 2.2);
        nVal += spike;
      }

      return nVal * amp;
    };

    visibleRings.forEach((layer) => {
      ctx.save();

      const ringRadius = Math.max(20, baseRadius + (layer.radiusOffset || 0));
      const ringCx = cx + (layer.offsetX || 0);
      const ringCy = cy + (layer.offsetY || 0);
      let ringColor = layer.color || inkSolid;
      if (isDarkBg && (ringColor === '#18181b' || ringColor === '#27272a' || ringColor === '#000000')) {
        ringColor = '#ffffff';
      } else if (!isDarkBg && (ringColor === '#ffffff' || ringColor === '#fff')) {
        ringColor = '#18181b';
      }
      const ringStrokeWidth = layer.strokeWidth || params.strokeWidth || 1.5;
      const ringTimeOffset = layer.timeOffset || 0;
      const ringVariation = layer.variationOverride || variation;

      // Opacity and blend mode
      ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1.0;
      if (layer.blendMode) {
        ctx.globalCompositeOperation = layer.blendMode;
      }

      // Soft blur / glow shadow
      if (layer.blur && layer.blur > 0) {
        ctx.shadowBlur = layer.blur * 2;
        ctx.shadowColor = ringColor;
      }

      // Prepare stroke style (solid, angular conic, or radial amplitude)
      let effectiveStrokeStyle: string | CanvasGradient = ringColor;
      if (layer.gradientType === 'angular') {
        const conic = ctx.createConicGradient(secondAngle, ringCx, ringCy);
        conic.addColorStop(0, ringColor);
        conic.addColorStop(0.5, layer.secondaryColor || '#67e8f9');
        conic.addColorStop(1, ringColor);
        effectiveStrokeStyle = conic;
      } else if (layer.gradientType === 'radial-amplitude') {
        const radGrad = ctx.createRadialGradient(
          ringCx,
          ringCy,
          ringRadius * 0.8,
          ringCx,
          ringCy,
          ringRadius * 1.2
        );
        radGrad.addColorStop(0, ringColor);
        radGrad.addColorStop(1, layer.secondaryColor || '#c084fc');
        effectiveStrokeStyle = radGrad;
      }

      // Time offset angle for this ring
      const ringSecAngle = ((smoothSecValue + ringTimeOffset) / 60) * TWO_PI - Math.PI / 2;
      const pulsesForRing = getPulsesToRender(ringTimeOffset);

      // Render variation geometry for this ring
      switch (ringVariation) {
        // -----------------------------------------------------------
        // 1. SOLITON HARMONIC WAVE
        // -----------------------------------------------------------
        case 'soliton': {
          const segments = 360;
          const points: { x: number; y: number; width: number }[] = [];

          for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * TWO_PI;
            const { originPeak, radialRipple, thicknessMultiplier, membranePush } = computeWaveMetrics(
              theta,
              pulsesForRing,
              ringSecAngle
            );

            const radialOffset = radialRipple * (params.amplitude * 14) * (1 - morph * 0.7);
            const thickness = (ringStrokeWidth * (
              1 +
              (params.peakThickness - 1) * originPeak +
              thicknessMultiplier
            )) * (1 - morph * 0.2);

            const layerNoise = computeLayerNoise(theta, layer, now / 1000) * (1 - morph * 0.7);
            const r = ringRadius + radialOffset + layerNoise + membranePush;
            const x = ringCx + Math.cos(theta) * r;
            const y = ringCy + Math.sin(theta) * r;
            points.push({ x, y, width: Math.max(0.5, thickness) });
          }

          for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = effectiveStrokeStyle;
            ctx.lineWidth = (p1.width + p2.width) / 2;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
          break;
        }

        // -----------------------------------------------------------
        // 2. REHOBOAM AI DIVERGENCE (Westworld Supercomputer)
        // -----------------------------------------------------------
        case 'rehoboam': {
          const segments = 480;
          ctx.beginPath();

          for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * TWO_PI;
            const { originPeak, membranePush } = computeWaveMetrics(theta, pulsesForRing, ringSecAngle);

            let acousticBurst = 0;
            for (let p = 0; p < pulsesForRing.length; p++) {
              const pulse = pulsesForRing[p];

              if (params.direction === 'both') {
                const dCW = clockwiseDistance(theta, pulse.originAngle);
                const dCCW = counterClockwiseDistance(theta, pulse.originAngle);
                const envCW = gaussian(dCW, pulse.travelDist, 0.45) * pulse.strength * cwBiasFactor;
                const envCCW = gaussian(dCCW, pulse.travelDist, 0.45) * pulse.strength * ccwBiasFactor;

                const fCW = (Math.sin(dCW * 12 - pulse.travelDist * 6) + Math.sin(dCW * 26 + pulse.travelDist * 4) * 0.6) * envCW;
                const fCCW = (Math.sin(dCCW * 12 - pulse.travelDist * 6) + Math.sin(dCCW * 26 + pulse.travelDist * 4) * 0.6) * envCCW;
                acousticBurst += (fCW + fCCW) * (params.amplitude * 16);
              } else {
                const d = getDirectionalDist(theta, pulse.originAngle);
                const env = gaussian(d, pulse.travelDist, 0.45) * pulse.strength;
                const f1 = Math.sin(d * 12 - pulse.travelDist * 6);
                const f2 = Math.sin(d * 26 + pulse.travelDist * 4) * 0.6;
                const f3 = Math.sin(d * 42 - pulse.travelDist * 8) * 0.35;
                acousticBurst += (f1 + f2 + f3) * env * (params.amplitude * 16);
              }
            }

            const divergenceSpike = Math.pow(originPeak, 2.5) * (params.amplitude * 24);
            const layerNoise = computeLayerNoise(theta, layer, now / 1000) * (1 - morph * 0.7);
            const r = ringRadius + (acousticBurst + divergenceSpike) * (1 - morph * 0.65) + layerNoise + membranePush;
            const x = ringCx + Math.cos(theta) * r;
            const y = ringCy + Math.sin(theta) * r;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.closePath();
          ctx.strokeStyle = effectiveStrokeStyle;
          ctx.lineWidth = ringStrokeWidth * (1.2 + (params.peakThickness * 0.5));
          ctx.stroke();

          // Secondary inner echo resonance ring
          ctx.beginPath();
          for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * TWO_PI;
            const { originPeak } = computeWaveMetrics(theta, pulsesForRing, ringSecAngle);
            let innerAcoustic = 0;
            for (let p = 0; p < pulsesForRing.length; p++) {
              const pulse = pulsesForRing[p];
              const d = getDirectionalDist(theta, pulse.originAngle);
              const env = gaussian(d, pulse.travelDist, 0.45) * pulse.strength;
              innerAcoustic += Math.sin(d * 20 - pulse.travelDist * 8) * env * (params.amplitude * 7);
            }
            const r = ringRadius - 6 + (innerAcoustic - originPeak * 8) * (1 - morph * 0.6);
            const x = ringCx + Math.cos(theta) * r;
            const y = ringCy + Math.sin(theta) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = Math.max(0.5, ringStrokeWidth * 0.8);
          ctx.stroke();
          break;
        }

        // -----------------------------------------------------------
        // 2B. SOLOMON SECTOR DIVERGENCE (Westworld S3 Solomon - Stepped Fuzzy Towers)
        // -----------------------------------------------------------
        case 'solomon': {
          const dAngle = params.solomonAnomalyAngle ?? -0.65; // Primary Anomaly (~1:40 on clock, matching lore)
          const bleed = layer.noiseBleed ?? 14;
          const timeSec = now / 1000;
          const noiseSpeed = layer.noiseSpeed ?? 1.2;
          const flutterTime = timeSec * noiseSpeed;

          // Distinct Divergence Fuzzy Towers (Architectural stepped columnar blocks around timeline)
          const towers = [
            // Primary Anomaly Skyscraper Tower: Tallest multi-tiered skyscraper with 3 terraces
            { angle: dAngle, width: 0.44, height: 92 * (params.amplitude * 2.2 + 0.5), isPrimary: true },
            // East Sector Divergence Tower
            { angle: 0.52, width: 0.28, height: 52 * (params.amplitude * 2.0 + 0.5), isPrimary: false },
            // South-East Anomaly Tower
            { angle: 1.95, width: 0.34, height: 68 * (params.amplitude * 2.1 + 0.5), isPrimary: false },
            // South-West Divergence Tower
            { angle: 3.35, width: 0.26, height: 48 * (params.amplitude * 1.9 + 0.5), isPrimary: false },
            // North-West Anomaly Tower
            { angle: 4.80, width: 0.30, height: 60 * (params.amplitude * 2.0 + 0.5), isPrimary: false },
          ];

          // 1. Draw base orbit circle (clean timeline boundary)
          ctx.beginPath();
          ctx.arc(ringCx, ringCy, ringRadius, 0, TWO_PI);
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = Math.max(1.2, ringStrokeWidth * 1.15);
          ctx.stroke();

          // 2. Faint concentric telemetry radar arcs
          ctx.save();
          ctx.strokeStyle = ringColor;
          ctx.globalAlpha = (layer.opacity ?? 1.0) * (isDarkBg ? 0.18 : 0.12);
          ctx.lineWidth = 0.8;
          ctx.setLineDash([2, 5]);
          ctx.beginPath();
          ctx.arc(ringCx, ringCy, ringRadius - 18, 0, TWO_PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(ringCx, ringCy, ringRadius + 22, 0, TWO_PI);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();

          // 3. Dense Radial Filament Towers (Fuzzy Towers)
          // 1100 fine radial needles creating true stepped fuzzy skyscraper columns
          const filamentCount = 1100;
          const corePoints: { x: number; y: number }[] = [];
          
          type Needle = {
            bx: number;
            by: number;
            tx: number;
            ty: number;
            wx?: number;
            wy?: number;
            isTower: boolean;
            isPrimaryTower: boolean;
          };

          const needles: Needle[] = [];

          for (let f = 0; f < filamentCount; f++) {
            const theta = (f / filamentCount) * TWO_PI;
            const { originPeak, membranePush } = computeWaveMetrics(theta, pulsesForRing, ringSecAngle);

            // Compute divergence tower envelope with stepped architectural setbacks
            let towerHeight = 0;
            let isTowerFilament = false;
            let isPrimaryFilament = false;

            for (let t = 0; t < towers.length; t++) {
              const tow = towers[t];
              const dist = angularDistance(theta, tow.angle);
              if (dist < tow.width) {
                isTowerFilament = true;
                if (tow.isPrimary) isPrimaryFilament = true;

                const u = dist / tow.width; // 0 (center) to 1 (outer edge)

                // Distinct stepped terrace profile (flat roofs with abrupt setbacks)
                let terraceFactor = 0;
                if (u < 0.32) {
                  // Central Spire
                  terraceFactor = 1.0;
                } else if (u < 0.65) {
                  // Mid Terrace Setback
                  terraceFactor = 0.76;
                } else if (u < 0.94) {
                  // Low Shoulder Setback
                  terraceFactor = 0.48;
                } else {
                  // Steep vertical cliff fall-off
                  terraceFactor = Math.max(0, (1.0 - u) / 0.06) * 0.48;
                }

                // Vertical barcode teeth stepping (every needle differs slightly in height like graphic equalizer)
                const needleIndex = f;
                const barcodeHash = (Math.sin(needleIndex * 19.3 + tow.angle * 7) * 0.5 + 0.5);
                const teethModulation = 0.82 + 0.24 * barcodeHash;

                // Seismic electrostatic flutter
                const microFlutter = 1.0 + 0.14 * Math.sin(theta * 70 + flutterTime * 12);

                const currentTowerH = tow.height * terraceFactor * teethModulation * microFlutter;
                towerHeight = Math.max(towerHeight, currentTowerH);
              }
            }

            // High-frequency ambient electrostatic acoustic carpet along timeline
            const ambientJitter = (3.5 + 4.5 * Math.abs(Math.sin(theta * 48 + flutterTime * 4))) * (1 - morph * 0.5);

            // Second tick pulse acoustic surge
            let acousticSurge = 0;
            for (let p = 0; p < pulsesForRing.length; p++) {
              const pulse = pulsesForRing[p];
              const d = getDirectionalDist(theta, pulse.originAngle);
              const env = gaussian(d, pulse.travelDist, 0.45) * pulse.strength;
              acousticSurge += env * (params.amplitude * 16);
            }

            const totalHeight = (towerHeight + ambientJitter + acousticSurge) * (1 - morph * 0.4);
            const rBase = ringRadius + membranePush;
            const rOut = rBase + totalHeight;
            // Inward counter-roots dipping into circle
            const rInnerRoot = rBase - (isTowerFilament ? Math.min(14, 4 + totalHeight * 0.14) : 3);

            const cosT = Math.cos(theta);
            const sinT = Math.sin(theta);
            const tipX = ringCx + cosT * rOut;
            const tipY = ringCy + sinT * rOut;
            const baseX = ringCx + cosT * rInnerRoot;
            const baseY = ringCy + sinT * rInnerRoot;

            corePoints.push({ x: tipX, y: tipY });

            // Whisker tip extending beyond core needle (creates fuzzy/furry electric crown)
            let wx: number | undefined;
            let wy: number | undefined;
            if (isTowerFilament && f % 2 === 0) {
              const fuzzLength = 3 + (hash2D(f * 17, 3) * 6);
              const rFuzz = rOut + fuzzLength;
              wx = ringCx + cosT * rFuzz;
              wy = ringCy + sinT * rFuzz;
            }

            needles.push({
              bx: baseX,
              by: baseY,
              tx: tipX,
              ty: tipY,
              wx,
              wy,
              isTower: isTowerFilament,
              isPrimaryTower: isPrimaryFilament,
            });
          }

          // 3A. Batch render core dense radial needles
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i < needles.length; i++) {
            const nd = needles[i];
            ctx.moveTo(nd.bx, nd.by);
            ctx.lineTo(nd.tx, nd.ty);
          }
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 1.0;
          ctx.globalAlpha = (layer.opacity ?? 1.0) * (isDarkBg ? 0.78 : 0.65);
          ctx.stroke();

          // 3B. Batch render fuzzy whisker bristles (creates the fuzzy tower crowns)
          ctx.beginPath();
          for (let i = 0; i < needles.length; i++) {
            const nd = needles[i];
            if (nd.wx !== undefined && nd.wy !== undefined) {
              // Start from 60% of needle and overshoot to whisker tip
              const midX = (nd.bx + nd.tx) * 0.5;
              const midY = (nd.by + nd.ty) * 0.5;
              ctx.moveTo(midX, midY);
              ctx.lineTo(nd.wx, nd.wy);
            }
          }
          ctx.lineWidth = 0.6;
          ctx.globalAlpha = (layer.opacity ?? 1.0) * (isDarkBg ? 0.35 : 0.25);
          ctx.stroke();
          ctx.restore();

          // 4. Subtle stepped contour envelope line along tower peaks
          if (corePoints.length > 0) {
            ctx.save();
            ctx.beginPath();
            corePoints.forEach((pt, idx) => {
              if (idx === 0) ctx.moveTo(pt.x, pt.y);
              else ctx.lineTo(pt.x, pt.y);
            });
            ctx.closePath();
            ctx.strokeStyle = ringColor;
            ctx.globalAlpha = (layer.opacity ?? 1.0) * (isDarkBg ? 0.45 : 0.3);
            ctx.lineWidth = 0.85;
            ctx.stroke();
            ctx.restore();
          }

          // 5. Particulate ink stipple mist / smoke plume hovering over towers
          if (bleed > 0) {
            ctx.save();
            ctx.fillStyle = ringColor;
            towers.forEach((tow) => {
              const dotCount = Math.round(tow.height * 0.38);
              for (let s = 0; s < dotCount; s++) {
                const angleOff = (hash2D(s * 13, tow.height) * 2 - 1) * tow.width * 0.9;
                const radOff = ringRadius + tow.height + 4 + Math.abs(hash2D(s * 29, 7)) * bleed * 1.3;
                const dotX = ringCx + Math.cos(tow.angle + angleOff) * radOff;
                const dotY = ringCy + Math.sin(tow.angle + angleOff) * radOff;
                ctx.globalAlpha = (0.12 + Math.abs(Math.sin(s * 3.7 + flutterTime)) * 0.25) * (layer.opacity ?? 1.0);
                ctx.beginPath();
                ctx.arc(dotX, dotY, Math.max(0.4, (s % 3) * 0.45 + 0.4), 0, TWO_PI);
                ctx.fill();
              }
            });
            ctx.restore();
          }

          // 6. Solomon Internal Quantum Strategy Triangles (Westworld Lore signature)
          if (params.showSolomonInteriorMesh !== false) {
            ctx.save();
            ctx.strokeStyle = ringColor;
            ctx.fillStyle = ringColor;
            ctx.lineWidth = 0.8;

            const nodeCount = 14;
            const nodes: { x: number; y: number }[] = [];
            const interiorRadius = ringRadius * 0.78;
            const meshRotation = (timeSec * 0.04);

            for (let n = 0; n < nodeCount; n++) {
              const a = (n / nodeCount) * TWO_PI + meshRotation;
              const jitterR = interiorRadius * (0.68 + 0.28 * Math.abs(Math.sin(n * 2.7)));
              nodes.push({
                x: ringCx + Math.cos(a) * jitterR,
                y: ringCy + Math.sin(a) * jitterR,
              });
            }

            // Draw interconnected triangles
            ctx.beginPath();
            for (let i = 0; i < nodes.length; i++) {
              const n1 = nodes[i];
              const n2 = nodes[(i + 3) % nodes.length];
              const n3 = nodes[(i + 7) % nodes.length];
              ctx.moveTo(n1.x, n1.y);
              ctx.lineTo(n2.x, n2.y);
              ctx.lineTo(n3.x, n3.y);
              ctx.lineTo(n1.x, n1.y);
            }
            ctx.globalAlpha = (layer.opacity ?? 1.0) * (isDarkBg ? 0.22 : 0.14);
            ctx.stroke();

            // Draw small vertex nodes
            ctx.globalAlpha = (layer.opacity ?? 1.0) * (isDarkBg ? 0.5 : 0.3);
            for (let i = 0; i < nodes.length; i++) {
              ctx.beginPath();
              ctx.arc(nodes[i].x, nodes[i].y, 1.5, 0, TWO_PI);
              ctx.fill();
            }
            ctx.restore();
          }

          break;
        }

        // -----------------------------------------------------------
        // 3. FLUID INK RIBBON
        // -----------------------------------------------------------
        case 'fluid-ribbon': {
          const segments = 360;
          const outerPoints: { x: number; y: number }[] = [];
          const innerPoints: { x: number; y: number }[] = [];

          for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * TWO_PI;
            const { originPeak, radialRipple, thicknessMultiplier, membranePush } = computeWaveMetrics(
              theta,
              pulsesForRing,
              ringSecAngle
            );

            const halfThick = (ringStrokeWidth * (
              0.8 +
              (params.peakThickness * 1.8) * originPeak +
              thicknessMultiplier * 1.2
            )) * (1 - morph * 0.4);

            const waveOsc = radialRipple * (params.amplitude * 10);
            const rOut = ringRadius + halfThick + waveOsc + membranePush;
            const rIn = ringRadius - halfThick - waveOsc * 0.6 + membranePush;

            outerPoints.push({
              x: ringCx + Math.cos(theta) * rOut,
              y: ringCy + Math.sin(theta) * rOut,
            });
            innerPoints.push({
              x: ringCx + Math.cos(theta) * rIn,
              y: ringCy + Math.sin(theta) * rIn,
            });
          }

          ctx.beginPath();
          outerPoints.forEach((pt, idx) => {
            if (idx === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          });
          for (let i = innerPoints.length - 1; i >= 0; i--) {
            ctx.lineTo(innerPoints[i].x, innerPoints[i].y);
          }
          ctx.closePath();
          ctx.fillStyle = effectiveStrokeStyle;
          ctx.fill();
          break;
        }

        // -----------------------------------------------------------
        // 4. STRATIFIED TENDRILS (5-Strand Braided Resonator)
        // -----------------------------------------------------------
        case 'tendrils': {
          const strandCount = 5;
          const segments = 240;

          for (let s = 0; s < strandCount; s++) {
            const strandOffset = (s - (strandCount - 1) / 2);
            ctx.beginPath();

            for (let i = 0; i <= segments; i++) {
              const theta = (i / segments) * TWO_PI;
              const { originPeak, radialRipple, membranePush } = computeWaveMetrics(
                theta,
                pulsesForRing,
                ringSecAngle
              );

              const strandBraid = Math.sin(theta * 14 + (now / 1500) + s * 1.2) * (2.8 * (1 - morph * 0.5));
              const waveDisp = radialRipple * (params.amplitude * 12);
              const r = ringRadius + strandOffset * 4.2 + strandBraid + waveDisp + membranePush;

              const x = ringCx + Math.cos(theta) * r;
              const y = ringCy + Math.sin(theta) * r;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }

            ctx.strokeStyle = effectiveStrokeStyle;
            ctx.lineWidth = Math.max(0.5, ringStrokeWidth * 0.9);
            ctx.stroke();
          }
          break;
        }

        // -----------------------------------------------------------
        // 5. ECHO SHELLS
        // -----------------------------------------------------------
        case 'echo-shells': {
          const shellOffsets = [-12, -6, 0, 6, 12];
          const segments = 280;

          shellOffsets.forEach((shellDist, idx) => {
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
              const theta = (i / segments) * TWO_PI;
              let shellRipple = 0;

              for (let p = 0; p < pulsesForRing.length; p++) {
                const pulse = pulsesForRing[p];
                const d = angularDistance(theta, pulse.originAngle);
                const echoTravel = (pulse.travelDist - idx * 0.25 + Math.PI * 2) % Math.PI;
                const shellEnv = gaussian(d, echoTravel, 0.45) * pulse.strength * 0.6;
                shellRipple += Math.sin(d * 14 - pulse.travelDist * 6) * shellEnv;
              }

              const r = ringRadius + shellDist + shellRipple * (params.amplitude * 7);
              const x = ringCx + Math.cos(theta) * r;
              const y = ringCy + Math.sin(theta) * r;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = effectiveStrokeStyle;
            ctx.lineWidth = ringStrokeWidth;
            ctx.stroke();
          });
          break;
        }

        // -----------------------------------------------------------
        // 6. ACOUSTIC DOPPLER CHIRP
        // -----------------------------------------------------------
        case 'chirp': {
          const segments = 400;
          ctx.beginPath();

          for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * TWO_PI;
            const { originPeak, membranePush } = computeWaveMetrics(theta, pulsesForRing, ringSecAngle);

            let totalChirp = 0;
            for (let p = 0; p < pulsesForRing.length; p++) {
              const pulse = pulsesForRing[p];
              const d = angularDistance(theta, pulse.originAngle);
              const env = gaussian(d, pulse.travelDist, 0.45) * pulse.strength;
              const localFreq = 34 - (d / Math.PI) * 26;
              totalChirp += Math.sin(localFreq * d - pulse.travelDist * 8) * env * (params.amplitude * 12);
            }

            const originSwell = originPeak * (params.amplitude * 14);
            const r = ringRadius + (totalChirp + originSwell) * (1 - morph * 0.7) + membranePush;
            const x = ringCx + Math.cos(theta) * r;
            const y = ringCy + Math.sin(theta) * r;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.strokeStyle = effectiveStrokeStyle;
          ctx.lineWidth = ringStrokeWidth * (1 + params.peakThickness * 0.8);
          ctx.stroke();
          break;
        }

        // -----------------------------------------------------------
        // 7. TECTONIC NOISE HORIZON
        // -----------------------------------------------------------
        case 'tectonic': {
          const segments = 360;
          ctx.beginPath();

          for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * TWO_PI;
            const { originPeak, packetEnv, membranePush } = computeWaveMetrics(
              theta,
              pulsesForRing,
              ringSecAngle
            );

            const noiseCoord = (theta / TWO_PI) * 14 + (now / 2000);
            const noiseVal = fractalNoise(noiseCoord, 3, 2.2, 0.5);
            const turbulenceWeight = (originPeak * 1.5 + packetEnv * 2.2) * (params.amplitude * 16);
            const r = ringRadius + noiseVal * turbulenceWeight * (1 - morph * 0.8) + membranePush;

            const x = ringCx + Math.cos(theta) * r;
            const y = ringCy + Math.sin(theta) * r;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }

          ctx.closePath();
          ctx.strokeStyle = effectiveStrokeStyle;
          ctx.lineWidth = ringStrokeWidth * (1.2 + params.peakThickness * 0.7);
          ctx.stroke();
          break;
        }

        // -----------------------------------------------------------
        // 8. PARTICLE SWARM CLOUD
        // -----------------------------------------------------------
        case 'particle-swarm': {
          const particleCount = 140;
          for (let p = 0; p < particleCount; p++) {
            const theta = (p / particleCount) * TWO_PI + Math.sin(p * 99 + now / 1000) * 0.05;
            const { originPeak, packetEnv, membranePush } = computeWaveMetrics(
              theta,
              pulsesForRing,
              ringSecAngle
            );

            const jitter = (Math.sin(p * 45 + now / 400) * 0.5 + Math.cos(p * 23) * 0.5) * 8;
            const r = ringRadius + jitter + (originPeak * 18 + packetEnv * 22) * (params.amplitude * 1.5) + membranePush;

            const x = ringCx + Math.cos(theta) * r;
            const y = ringCy + Math.sin(theta) * r;
            const ptRadius = Math.max(1, (1.2 + originPeak * 2.5 + packetEnv * 2) * (ringStrokeWidth / 1.5));

            ctx.beginPath();
            ctx.arc(x, y, ptRadius, 0, TWO_PI);
            ctx.fillStyle = effectiveStrokeStyle;
            ctx.fill();
          }
          break;
        }

        // -----------------------------------------------------------
        // 9. RIBBED VERTEBRAE SPINE
        // -----------------------------------------------------------
        case 'ribbed-spine': {
          const ribCount = 90;
          for (let i = 0; i < ribCount; i++) {
            const theta = (i / ribCount) * TWO_PI;
            const { originPeak, packetEnv, membranePush } = computeWaveMetrics(
              theta,
              pulsesForRing,
              ringSecAngle
            );

            const ribLen = (5 + (originPeak * 22 + packetEnv * 18) * (params.amplitude * 1.2)) * (1 - morph * 0.5);
            const rInner = ringRadius - ribLen / 2 + membranePush;
            const rOuter = ringRadius + ribLen / 2 + membranePush;

            ctx.beginPath();
            ctx.moveTo(ringCx + Math.cos(theta) * rInner, ringCy + Math.sin(theta) * rInner);
            ctx.lineTo(ringCx + Math.cos(theta) * rOuter, ringCy + Math.sin(theta) * rOuter);
            ctx.strokeStyle = effectiveStrokeStyle;
            ctx.lineWidth = originPeak > 0.4 ? ringStrokeWidth * 1.5 : ringStrokeWidth;
            ctx.stroke();
          }
          break;
        }

        // -----------------------------------------------------------
        // 10. ELASTIC MEMBRANE STRETCH (Analog Needle Push & Outline Deformation)
        // -----------------------------------------------------------
        case 'membrane-stretch':
        default: {
          const segments = 360;
          const points: { x: number; y: number; width: number; push: number; theta: number }[] = [];

          for (let i = 0; i <= segments; i++) {
            const theta = (i / segments) * TWO_PI;
            const { originPeak, radialRipple, thicknessMultiplier, membranePush } = computeWaveMetrics(
              theta,
              pulsesForRing,
              ringSecAngle
            );

            const rippleOffset = radialRipple * (params.amplitude * 10) * (1 - morph * 0.7);
            const r = ringRadius + rippleOffset + membranePush;

            const thickness = (ringStrokeWidth * (
              1 +
              (params.peakThickness - 1) * originPeak * 0.6 +
              thicknessMultiplier * 0.5 +
              (membranePush > 0 ? (membranePush / 28) * 0.85 : 0)
            )) * (1 - morph * 0.2);

            const x = ringCx + Math.cos(theta) * r;
            const y = ringCy + Math.sin(theta) * r;
            points.push({ x, y, width: Math.max(0.5, thickness), push: membranePush, theta });
          }

          // Draw baseline unstretched reference ring (faint ghost perimeter)
          ctx.beginPath();
          ctx.arc(ringCx, ringCy, ringRadius, 0, TWO_PI);
          ctx.strokeStyle = ringColor;
          ctx.globalAlpha = (layer.opacity || 1.0) * 0.15;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1.0;

          // Draw subtle elastic tension strain rays under the deformed membrane tent
          for (let i = 0; i < points.length; i += 3) {
            const pt = points[i];
            if (pt.push > 1.2) {
              const strainRatio = pt.push / 36;
              ctx.beginPath();
              ctx.moveTo(ringCx + Math.cos(pt.theta) * ringRadius, ringCy + Math.sin(pt.theta) * ringRadius);
              ctx.lineTo(pt.x, pt.y);
              ctx.strokeStyle = ringColor;
              ctx.globalAlpha = Math.min(0.4, strainRatio * 0.4);
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
          ctx.globalAlpha = layer.opacity !== undefined ? layer.opacity : 1.0;

          // Draw deformed perimeter membrane curve
          for (let i = 0; i < points.length - 1; i++) {
            const p1 = points[i];
            const p2 = points[i + 1];
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = effectiveStrokeStyle;
            ctx.lineWidth = (p1.width + p2.width) / 2;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
          break;
        }
      }

      ctx.restore();
    });

    // Reset shadow state
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    // -------------------------------------------------------------
    // WEATHER OVERLAY (When morphing towards Weather)
    // -------------------------------------------------------------
    if (morph > 0.05) {
      ctx.save();
      const arcStart = Math.PI * 0.75;
      const arcEnd = Math.PI * 2.25;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius + 14, arcStart, arcEnd);
      ctx.strokeStyle = `rgba(${inkRgb}, ${0.15 * morph})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      const tempNormalized = weatherData ? (weatherData.temp - 40) / (95 - 40) : 0.6;
      const currentTempAngle = arcStart + tempNormalized * (arcEnd - arcStart);
      const tempMarkerX = cx + Math.cos(currentTempAngle) * (baseRadius + 14);
      const tempMarkerY = cy + Math.sin(currentTempAngle) * (baseRadius + 14);

      ctx.beginPath();
      ctx.arc(tempMarkerX, tempMarkerY, 4 * morph, 0, TWO_PI);
      ctx.fillStyle = inkSolid;
      ctx.fill();
      ctx.restore();
    }

    // -------------------------------------------------------------
    // ANALOG CLOCK HANDS (When handsMode is 'analog' or 'hybrid')
    // -------------------------------------------------------------
    if (params.handsMode !== 'digital' && morph < 0.75) {
      const handsOpacity = 1 - morph * 1.4;
      ctx.save();
      ctx.lineCap = 'round';

      // 1. Hour Hand
      const hourVal = ((hours % 12) + minutes / 60 + smoothSecValue / 3600) / 12;
      const hourAngle = hourVal * TWO_PI - Math.PI / 2;
      const hLen = baseRadius * 0.48;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(hourAngle) * hLen, cy + Math.sin(hourAngle) * hLen);
      ctx.strokeStyle = `rgba(${inkRgb}, ${handsOpacity * 0.95})`;
      ctx.lineWidth = Math.max(2.2, size * 0.007);
      ctx.stroke();

      // 2. Minute Hand
      const minVal = (minutes + smoothSecValue / 60) / 60;
      const minAngle = minVal * TWO_PI - Math.PI / 2;
      const mLen = baseRadius * 0.74;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(minAngle) * mLen, cy + Math.sin(minAngle) * mLen);
      ctx.strokeStyle = `rgba(${inkRgb}, ${handsOpacity * 0.85})`;
      ctx.lineWidth = Math.max(1.5, size * 0.0045);
      ctx.stroke();

      // 3. Second Needle (stretches to apex of deformed membrane)
      const apexPush = (params.membraneStretch !== undefined && params.membraneStretch > 0)
        ? params.membraneStretch
        : (variation === 'membrane-stretch' ? 36 : 0);
      const needleReach = (baseRadius + (params.membraneFollowHand !== false ? apexPush * (1 - morph * 0.7) : 0)) * 0.995;
      const sLen = Math.max(baseRadius * 0.94, needleReach);
      const sTail = baseRadius * 0.15;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(secondAngle) * sTail, cy - Math.sin(secondAngle) * sTail);
      ctx.lineTo(cx + Math.cos(secondAngle) * sLen, cy + Math.sin(secondAngle) * sLen);
      ctx.strokeStyle = `rgba(${inkRgb}, ${handsOpacity * 0.75})`;
      ctx.lineWidth = Math.max(1.0, size * 0.0025);
      ctx.stroke();

      // Center Arbor Hub
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(3, size * 0.009), 0, TWO_PI);
      ctx.fillStyle = inkSolid;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(1, size * 0.003), 0, TWO_PI);
      ctx.fillStyle = isDarkBg ? '#000000' : '#ffffff';
      ctx.fill();

      ctx.restore();
    }

    // -------------------------------------------------------------
    // ORIGIN SECOND INDICATOR (Subtle precision dot on the line)
    // -------------------------------------------------------------
    if (morph < 0.8) {
      const originPush = (params.membraneStretch !== undefined && params.membraneStretch > 0)
        ? params.membraneStretch
        : (variation === 'membrane-stretch' ? 36 : 0);
      const secRadius = baseRadius + originPush * (1 - morph * 0.7);
      const secIndicatorAlpha = (1 - morph) * 0.85;
      const secX = cx + Math.cos(secondAngle) * secRadius;
      const secY = cy + Math.sin(secondAngle) * secRadius;
      ctx.beginPath();
      ctx.arc(secX, secY, Math.max(2, params.strokeWidth * 0.9), 0, TWO_PI);
      ctx.fillStyle = `rgba(${inkRgb}, ${secIndicatorAlpha})`;
      ctx.fill();
    }

    // -------------------------------------------------------------
    // WESTWORLD SOLOMON HUD & DIAGNOSTIC LEADER LINE (Screenshot Replica)
    // -------------------------------------------------------------
    const isSolomonHudActive = (variation === 'solomon' || params.showSolomonTelemetry) && params.showSolomonTelemetry === true;
    if (isSolomonHudActive && morph < 0.85) {
      ctx.save();
      const hudAlpha = (1 - morph * 1.3);
      const dAngle = params.solomonAnomalyAngle ?? -0.65;
      // Position reticle bracket directly at apex of primary divergence fuzzy tower!
      const primaryTowerHeight = 92 * (params.amplitude * 2.2 + 0.5);
      const targetR = baseRadius + primaryTowerHeight + 8;
      const targetX = cx + Math.cos(dAngle) * targetR;
      const targetY = cy + Math.sin(dAngle) * targetR;

      // Interior telemetry anchor (left middle of circle)
      const hudLeftX = cx - baseRadius * 0.72;
      const hudMidX = cx - baseRadius * 0.05;
      const hudY = cy - baseRadius * 0.06;

      // 1. Diagnostic angled leader line
      ctx.beginPath();
      // Small bracket tick on left
      ctx.moveTo(hudLeftX, hudY + 18);
      ctx.lineTo(hudLeftX, hudY);
      // Horizontal span across top of telemetry text
      ctx.lineTo(hudMidX, hudY);
      // Angled straight vector to anomaly apex on outer ring
      ctx.lineTo(targetX, targetY);
      ctx.strokeStyle = `rgba(${inkRgb}, ${hudAlpha * 0.75})`;
      ctx.lineWidth = Math.max(0.8, size * 0.0018);
      ctx.stroke();

      // 2. Faceted polygon reticle bracket at outer ring anomaly
      const reticleR = Math.max(5, size * 0.015);
      ctx.beginPath();
      for (let k = 0; k < 6; k++) {
        const ra = dAngle + (k / 6) * TWO_PI + Math.PI / 6;
        const rx = targetX + Math.cos(ra) * reticleR;
        const ry = targetY + Math.sin(ra) * reticleR;
        if (k === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.strokeStyle = `rgba(${inkRgb}, ${hudAlpha * 0.9})`;
      ctx.lineWidth = Math.max(0.8, size * 0.0018);
      ctx.stroke();

      // 3. Telemetry Typography inside the circle (matching image.png)
      const hStr = hours.toString().padStart(2, '0');
      const mStr = minutes.toString().padStart(2, '0');
      const sStr = seconds.toString().padStart(2, '0');
      const timeFormatted = `${hStr}.${mStr}.${sStr}`;

      const textBaseX = hudLeftX + 8;
      const textBaseY = hudY + 22;

      // Main large time readout: "04.17.39"
      const timeFontSize = Math.max(14, size * 0.046);
      ctx.font = `600 ${timeFontSize}px 'Space Grotesk', 'Plus Jakarta Sans', monospace`;
      ctx.fillStyle = `rgba(${inkRgb}, ${hudAlpha * 0.98})`;
      ctx.textAlign = 'left';
      ctx.fillText(timeFormatted, textBaseX, textBaseY);

      // Status text: "SYSTEM INITIATED"
      const labelFontSize = Math.max(8, size * 0.024);
      ctx.font = `700 ${labelFontSize}px 'Space Grotesk', 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = `rgba(${inkRgb}, ${hudAlpha * 0.9})`;
      ctx.fillText(params.solomonStatusText || 'SYSTEM INITIATED', textBaseX, textBaseY + labelFontSize * 1.5);

      // Location text: "UNDISCLOSED LOCATION"
      ctx.font = `300 ${labelFontSize * 0.95}px 'Space Grotesk', 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = `rgba(${inkDimRgb}, ${hudAlpha * 0.85})`;
      ctx.fillText(params.solomonLocationText || 'UNDISCLOSED LOCATION', textBaseX, textBaseY + labelFontSize * 2.8);

      // Build text: "'SOLOMON' BUILD 0.06"
      ctx.font = `600 ${labelFontSize * 0.95}px 'Space Grotesk', 'Plus Jakarta Sans', monospace`;
      ctx.fillStyle = `rgba(${inkRgb}, ${hudAlpha * 0.9})`;
      ctx.fillText(params.solomonBuildText || "'SOLOMON' BUILD 0.06", textBaseX, textBaseY + labelFontSize * 4.1);

      ctx.restore();
    }

  }, [
    variation,
    size,
    secondAngle,
    hours,
    minutes,
    smoothSecValue,
    params,
    activePulses,
    morphProgress,
    rawTimestamp,
    weatherData,
  ]);

  // Dynamic color adaptation for digital time display on dark backgrounds
  const isDarkBg = isColorDark(params.backgroundColor);
  const effectiveTimeColors = React.useMemo(() => {
    if (!isDarkBg) return params.timeColors;
    const base = params.timeColors;
    return {
      ...base,
      primary: !base.primary || base.primary === '#18181b' || base.primary === '#27272a' ? '#ffffff' : base.primary,
      hours: !base.hours || base.hours === '#18181b' || base.hours === '#27272a' ? '#ffffff' : base.hours,
      minutes: !base.minutes || base.minutes === '#18181b' || base.minutes === '#27272a' ? '#ffffff' : base.minutes,
      seconds: !base.seconds || base.seconds === '#18181b' || base.seconds === '#27272a' ? '#ffffff' : base.seconds,
      separator: base.separator === '#71717a' ? '#a1a1aa' : base.separator,
    };
  }, [params.timeColors, isDarkBg]);

  // Sizing for digital time with user numberScale adjustment
  const baseFontSize = params.handsMode === 'hybrid'
    ? Math.max(12, size * 0.065)
    : Math.max(16, size * 0.11);
  const digitalFontSize = baseFontSize * (params.numberScale ?? 1.0);
  const isTimeUnderRing = params.timeLayer === 'under';
  const isSolomonHudActive = (variation === 'solomon' || params.showSolomonTelemetry) && params.showSolomonTelemetry === true;

  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {/* 
        Canvas Element: 
        If timeLayer is 'under', canvas sits on top (z-10, pointer-events-none) so ripples and waves travel OVER the numbers.
        If timeLayer is 'over', canvas sits behind (z-0) and numbers float in front (z-20).
      */}
      <canvas
        ref={canvasRef}
        style={{ width: size, height: size }}
        className={`block relative ${isTimeUnderRing ? 'z-10 pointer-events-none' : 'z-0'}`}
      />

      {/* Center Digital / Info Content */}
      {showCenterText && (
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center px-2 ${
            isTimeUnderRing ? 'z-0' : 'z-20'
          }`}
        >
          {morphProgress < 0.6 ? (
            // Clock Mode (hidden only if Solomon HUD is actively shown to avoid clutter)
            !isSolomonHudActive ? (
              <div
                className={`flex flex-col items-center transition-opacity duration-300 ${
                  params.handsMode === 'hybrid' ? 'translate-y-8 sm:translate-y-10' : ''
                }`}
                style={{ opacity: 1 - morphProgress * 1.5 }}
              >
                {params.handsMode !== 'analog' && (
                  <RollingDigitalTime
                    hours={hours}
                    minutes={minutes}
                    seconds={seconds}
                    showSeconds={params.showDigitalSeconds}
                    transitionMode={params.digitTransition}
                    morphStyle={params.digitMorphStyle}
                    fontSize={digitalFontSize}
                    fontFamily={params.fontFamily || 'jetbrains'}
                    timeColors={effectiveTimeColors}
                  />
                )}
                {params.handsMode !== 'analog' && (
                  <div
                    className={`font-mono uppercase tracking-widest mt-1.5 ${isDarkBg ? 'text-zinc-500' : 'text-zinc-400'}`}
                    style={{ fontSize: `${Math.max(7, size * 0.022)}px` }}
                  >
                    {(secondAngle * (180 / Math.PI) + 90 + 360) % 360 | 0}°
                  </div>
                )}
              </div>
            ) : null
          ) : (
            // Weather Mode
            <div
              className="flex flex-col items-center transition-opacity duration-300"
              style={{ opacity: (morphProgress - 0.4) * 1.6 }}
            >
              <div className={`font-sans tracking-tighter leading-none font-light ${isDarkBg ? 'text-white' : 'text-zinc-900'}`} style={{ fontSize: `${Math.max(20, size * 0.15)}px` }}>
                {weatherData?.temp || 72}°
              </div>
              <div
                className={`font-sans font-medium tracking-wide mt-0.5 ${isDarkBg ? 'text-zinc-300' : 'text-zinc-700'}`}
                style={{ fontSize: `${Math.max(9, size * 0.032)}px` }}
              >
                {weatherData?.condition || 'Partly Cloudy'}
              </div>
              <div
                className={`font-mono text-xs tracking-wider mt-1 ${isDarkBg ? 'text-zinc-500' : 'text-zinc-400'}`}
                style={{ fontSize: `${Math.max(7, size * 0.022)}px` }}
              >
                H {weatherData?.high || 76}° · L {weatherData?.low || 58}°
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
