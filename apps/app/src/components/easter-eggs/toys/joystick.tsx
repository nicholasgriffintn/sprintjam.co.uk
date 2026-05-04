import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";

import { playFidgetStickSound } from "@/lib/fidget-audio";

const STICK_KEY_STEP = 0.2;

export function Joystick({ isSoundEnabled }: { isSoundEnabled: boolean }) {
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const padRef = useRef<HTMLDivElement | null>(null);
  const lastStickSoundRef = useRef(0);

  const strength = Math.min(1, Math.hypot(stick.x, stick.y));
  const hue = Math.round(
    ((Math.atan2(stick.y, stick.x) + Math.PI) / (Math.PI * 2)) * 360,
  );
  const lightness = Math.round(42 + (1 - strength) * 18);

  const updateStick = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!padRef.current) {
      return;
    }

    const rect = padRef.current.getBoundingClientRect();
    const rawX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const rawY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    const distance = Math.max(1, Math.hypot(rawX, rawY));
    const nextStick = {
      x: rawX / distance,
      y: rawY / distance,
    };
    setStick(nextStick);
    const now = Date.now();
    if (isSoundEnabled && now - lastStickSoundRef.current > 70) {
      playFidgetStickSound(Math.hypot(nextStick.x, nextStick.y));
      lastStickSoundRef.current = now;
    }
  };

  const updateStickFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const keyOffsets: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -STICK_KEY_STEP, y: 0 },
      ArrowRight: { x: STICK_KEY_STEP, y: 0 },
      ArrowUp: { x: 0, y: -STICK_KEY_STEP },
      ArrowDown: { x: 0, y: STICK_KEY_STEP },
      Home: { x: -stick.x, y: -stick.y },
    };
    const offset = keyOffsets[event.key];

    if (!offset) {
      return;
    }

    event.preventDefault();
    setStick((current) => {
      const nextStick = {
        x: Math.max(-1, Math.min(1, current.x + offset.x)),
        y: Math.max(-1, Math.min(1, current.y + offset.y)),
      };
      if (isSoundEnabled) {
        playFidgetStickSound(Math.hypot(nextStick.x, nextStick.y));
      }
      return nextStick;
    });
  };

  return (
    <div
      ref={padRef}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
        updateStick(event);
      }}
      onPointerMove={(event) => {
        if (isDragging) {
          updateStick(event);
        }
      }}
      onPointerUp={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        setIsDragging(false);
      }}
      onPointerCancel={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
        setIsDragging(false);
      }}
      onKeyDown={updateStickFromKeyboard}
      tabIndex={0}
      className="relative grid h-44 place-items-center rounded-2xl border border-white/60 p-4 transition-colors touch-none dark:border-white/10"
      style={{
        backgroundColor: `hsl(${hue} 88% ${Math.min(92, lightness + 38)}%)`,
      }}
      role="slider"
      aria-label="Move the joystick around the pad to change its colour"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(strength * 100)}
      aria-valuetext={`X ${Math.round(stick.x * 100)}, Y ${Math.round(stick.y * 100)}`}
    >
      <div
        className="absolute inset-4 rounded-2xl border border-white/60 shadow-inner"
        style={{
          background: `radial-gradient(circle at ${50 + stick.x * 24}% ${50 + stick.y * 24}%, hsl(${hue} 88% ${lightness}%), hsl(${hue} 68% 32%))`,
        }}
      />
      <span className="absolute h-20 w-20 rounded-full border border-white/70 bg-black/10 shadow-[inset_0_10px_18px_rgba(255,255,255,0.18),inset_0_-12px_22px_rgba(15,23,42,0.18)]" />
      <span
        className="relative h-16 w-16 rounded-full border border-white/80 shadow-[0_14px_24px_rgba(15,23,42,0.28),inset_0_10px_18px_rgba(255,255,255,0.28)] transition-colors motion-reduce:transition-none"
        style={{
          backgroundColor: `hsl(${hue} 88% ${lightness}%)`,
          transform: `translate(${stick.x * 32}px, ${stick.y * 32}px)`,
        }}
      />
    </div>
  );
}
