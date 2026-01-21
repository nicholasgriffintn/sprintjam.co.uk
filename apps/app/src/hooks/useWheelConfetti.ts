import { useEffect, useRef } from "react";

interface UseWheelConfettiParams {
  trigger: boolean;
  onComplete?: () => void;
}

export const useWheelConfetti = ({
  trigger,
  onComplete,
}: UseWheelConfettiParams) => {
  const hasCelebratedRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (trigger && !hasCelebratedRef.current) {
      import("canvas-confetti").then((module) => {
        const confetti = module.default;
        confetti({
          particleCount: 180,
          spread: 90,
          startVelocity: 55,
          scalar: 1.1,
          origin: { y: 0.6 },
        });
        timeoutRef.current = window.setTimeout(() => {
          onComplete?.();
        }, 300);
      });
      hasCelebratedRef.current = true;
    }

    if (!trigger) {
      hasCelebratedRef.current = false;
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    }

    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [onComplete, trigger]);
};
