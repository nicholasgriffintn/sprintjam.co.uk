declare module "canvas-confetti" {
  interface ConfettiOptions {
    particleCount?: number;
    spread?: number;
    origin?: { x?: number; y?: number };
    [key: string]: any;
  }

  function confetti(options?: ConfettiOptions): void;

  export default confetti;
}
