import { useRef, useEffect, useState, useCallback } from "react";
import { motion, useAnimation, useMotionValue } from "framer-motion";
import type { WheelEntry, SpinState } from "@sprintjam/types";

import { playTickSound } from "@/lib/wheel-audio";

// TODO: Generate colours with an algo and ensure sufficient contrast
const WHEEL_COLORS = [
  "#E53935",
  "#1E88E5",
  "#43A047",
  "#FDD835",
  "#8E24AA",
  "#00ACC1",
  "#FB8C00",
  "#3949AB",
];

interface WheelCanvasProps {
  entries: WheelEntry[];
  spinState: SpinState | null;
  onSpinComplete?: () => void;
  disabled?: boolean;
  onSpin?: () => void;
  playSounds?: boolean;
}

function getSegmentAtAngle(rotation: number, numSegments: number): number {
  if (numSegments === 0) return 0;
  const segmentAngle = 360 / numSegments;
  const adjustedRotation = rotation + 90;
  const normalizedRotation = ((adjustedRotation % 360) + 360) % 360;
  const segmentIndex = Math.floor(normalizedRotation / segmentAngle);
  return segmentIndex % numSegments;
}

export function WheelCanvas({
  entries,
  spinState,
  onSpinComplete,
  disabled,
  onSpin,
  playSounds = true,
}: WheelCanvasProps) {
  const controls = useAnimation();
  const rotation = useMotionValue(0);
  const lastTickRotation = useRef(0);
  const spinIdRef = useRef<string | null>(null);
  const enabledEntries = entries.filter((e) => e.enabled);
  const [currentSegment, setCurrentSegment] = useState(0);

  const segmentAngle =
    enabledEntries.length > 0 ? 360 / enabledEntries.length : 360;

  useEffect(() => {
    const unsubscribe = rotation.on('change', (latest) => {
      const segment = getSegmentAtAngle(latest, enabledEntries.length);
      setCurrentSegment(segment);
    });
    return () => unsubscribe();
  }, [rotation, enabledEntries.length]);

  useEffect(() => {
    if (!spinState?.isSpinning || enabledEntries.length === 0) {
      return;
    }

    const currentSpinId = `${spinState.startedAt}-${spinState.targetIndex}`;
    if (spinIdRef.current === currentSpinId) {
      return;
    }
    spinIdRef.current = currentSpinId;

    const targetIndex = spinState.targetIndex ?? 0;
    const segmentAngle = 360 / enabledEntries.length;
    const targetAngle = targetIndex * segmentAngle + segmentAngle / 2;
    const fullRotations = 5;

    const currentRotation = rotation.get();
    const baseRotation = Math.floor(currentRotation / 360) * 360;
    const finalRotation =
      baseRotation + fullRotations * 360 + (90 - targetAngle);

    controls.start({
      rotate: finalRotation,
      transition: {
        duration: spinState.duration / 1000,
        ease: [0.2, 0.8, 0.3, 1],
      },
    });

    const tickInterval = setInterval(() => {
      if (playSounds) {
        const currentRotation = rotation.get();
        const rotationDiff = Math.abs(
          currentRotation - lastTickRotation.current,
        );
        const segmentsPassedFloat = rotationDiff / segmentAngle;

        if (segmentsPassedFloat >= 1) {
          const elapsed = Date.now() - spinState.startedAt;
          const progress = Math.min(elapsed / spinState.duration, 1);
          const speed = Math.max(0.1, 1 - progress);
          playTickSound(speed);
          lastTickRotation.current = currentRotation;
        }
      }
    }, 50);

    const timeout = setTimeout(() => {
      clearInterval(tickInterval);
      spinIdRef.current = null;
      onSpinComplete?.();
    }, spinState.duration);

    return () => {
      clearTimeout(timeout);
      clearInterval(tickInterval);
    };
  }, [
    spinState,
    enabledEntries.length,
    controls,
    rotation,
    onSpinComplete,
    playSounds,
  ]);

  const handleClick = useCallback(() => {
    if (!disabled && !spinState?.isSpinning && enabledEntries.length >= 2 && onSpin) {
      onSpin();
    }
  }, [disabled, spinState?.isSpinning, enabledEntries.length, onSpin]);

  const arrowColour =
    enabledEntries.length > 0
      ? WHEEL_COLORS[currentSegment % WHEEL_COLORS.length]
      : '#FDD835';

  if (enabledEntries.length === 0) {
    return (
      <div className="relative aspect-square w-full">
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-slate-800/50 border-4 border-slate-700">
          <p className="text-slate-400 text-center px-8">
            Add entries to spin the wheel
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full">
      <div
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10"
        style={{
          width: 0,
          height: 0,
          borderTop: '20px solid transparent',
          borderBottom: '20px solid transparent',
          borderRight: `30px solid ${arrowColour}`,
          filter: 'drop-shadow(-2px 0 4px rgba(0,0,0,0.3))',
          transition: 'border-right-color 0.1s ease-out',
        }}
      />

      <motion.div
        className="w-full h-full cursor-pointer"
        animate={controls}
        style={{ rotate: rotation }}
        onClick={handleClick}
        data-testid="wheel-canvas"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {enabledEntries.map((entry, index) => {
            const startAngle = index * segmentAngle - 90;
            const endAngle = startAngle + segmentAngle;
            const largeArc = segmentAngle > 180 ? 1 : 0;

            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = 50 + 48 * Math.cos(startRad);
            const y1 = 50 + 48 * Math.sin(startRad);
            const x2 = 50 + 48 * Math.cos(endRad);
            const y2 = 50 + 48 * Math.sin(endRad);

            const midAngle = ((startAngle + endAngle) / 2) * (Math.PI / 180);
            const textX = 50 + 30 * Math.cos(midAngle);
            const textY = 50 + 30 * Math.sin(midAngle);
            const textRotation = (startAngle + endAngle) / 2 + 90;

            const color = WHEEL_COLORS[index % WHEEL_COLORS.length];

            return (
              <g key={entry.id}>
                <path
                  d={`M 50 50 L ${x1} ${y1} A 48 48 0 ${largeArc} 1 ${x2} ${y2} Z`}
                  fill={color}
                  stroke="#1e293b"
                  strokeWidth="0.5"
                />
                <text
                  x={textX}
                  y={textY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                  className="fill-white font-semibold"
                  style={{
                    fontSize: Math.min(6, 60 / enabledEntries.length),
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  }}
                >
                  {entry.name.length > 12
                    ? entry.name.slice(0, 10) + '...'
                    : entry.name}
                </text>
              </g>
            );
          })}

          <circle
            cx="50"
            cy="50"
            r="8"
            fill="#f8fafc"
            stroke="#1e293b"
            strokeWidth="1"
          />
        </svg>
      </motion.div>

      {!spinState?.isSpinning && enabledEntries.length >= 2 && onSpin && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-sm rounded-xl px-6 py-3 border border-white/10">
            <p className="text-lg font-semibold text-white">Click to spin</p>
            <p className="text-sm text-white/70">or press ctrl+enter</p>
          </div>
        </div>
      )}

      {enabledEntries.length === 1 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-900/80 rounded-lg px-4 py-2">
            <p className="text-white/80 text-sm">Add more entries to spin</p>
          </div>
        </div>
      )}
    </div>
  );
}
