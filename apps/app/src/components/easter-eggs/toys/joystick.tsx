import { useRef, useState } from 'react';
import {
  type PointerEvent as ReactPointerEvent,
} from 'react';

import {
  playFidgetStickSound,
} from "@/lib/fidget-audio";

export function Joystick() {
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
    if (now - lastStickSoundRef.current > 70) {
      playFidgetStickSound(Math.hypot(nextStick.x, nextStick.y));
      lastStickSoundRef.current = now;
    }
  };

  return (
    <div
      ref={padRef}
      onPointerDown={(event) => {
        setIsDragging(true);
        updateStick(event);
      }}
      onPointerMove={(event) => {
        if (isDragging) {
          updateStick(event);
        }
      }}
      onPointerUp={() => setIsDragging(false)}
      onPointerLeave={() => setIsDragging(false)}
      className="relative grid h-44 place-items-center rounded-2xl border border-white/60 p-4 transition-colors touch-none dark:border-white/10"
      style={{
        backgroundColor: `hsl(${hue} 88% ${Math.min(92, lightness + 38)}%)`,
      }}
      role="application"
      aria-label="Move the joystick around the pad to change its colour"
    >
      <div
        className="absolute inset-4 rounded-2xl border border-white/60 shadow-inner"
        style={{
          background: `radial-gradient(circle at ${50 + stick.x * 24}% ${50 + stick.y * 24}%, hsl(${hue} 88% ${lightness}%), hsl(${hue} 68% 32%))`,
        }}
      />
      <span className="absolute h-20 w-20 rounded-full border border-white/70 bg-black/10 shadow-[inset_0_10px_18px_rgba(255,255,255,0.18),inset_0_-12px_22px_rgba(15,23,42,0.18)]" />
      <span
        className="relative h-16 w-16 rounded-full border border-white/80 shadow-[0_14px_24px_rgba(15,23,42,0.28),inset_0_10px_18px_rgba(255,255,255,0.28)] transition-colors"
        style={{
          backgroundColor: `hsl(${hue} 88% ${lightness}%)`,
          transform: `translate(${stick.x * 32}px, ${stick.y * 32}px)`,
        }}
      />
    </div>
  );
}