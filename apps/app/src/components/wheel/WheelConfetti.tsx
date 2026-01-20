import { useEffect, useState, useCallback, useRef } from 'react';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

const COLORS = [
  '#E53935',
  '#1E88E5',
  '#43A047',
  '#FDD835',
  '#8E24AA',
  '#00ACC1',
  '#FB8C00',
  '#EC407A',
];

interface WheelConfettiProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function WheelConfetti({ trigger, onComplete }: WheelConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const createParticles = useCallback(() => {
    const newParticles: Particle[] = [];
    const count = 100;

    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }

    return newParticles;
  }, []);

  useEffect(() => {
    if (!trigger) {
      return;
    }

    const initialParticles = createParticles();
    setParticles(initialParticles);

    let frameCount = 0;
    const maxFrames = 180;

    const animate = () => {
      frameCount++;

      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1,
          rotation: p.rotation + p.rotationSpeed,
        })),
      );

      if (frameCount < maxFrames) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setParticles([]);
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [trigger, createParticles, onComplete]);

  if (particles.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none overflow-hidden z-50"
    >
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </div>
  );
}
