import { cn } from "@/lib/cn";

export function composeClassName<State>(
  baseClassName: string,
  className?: string | ((state: State) => string | undefined),
) {
  if (typeof className === "function") {
    return (state: State) => cn(baseClassName, className(state));
  }

  return cn(baseClassName, className);
}
