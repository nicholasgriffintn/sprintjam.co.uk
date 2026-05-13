import { createContext, useContext, useState, type ReactNode } from "react";
import type { RetroPhase, RetroStatus } from "@sprintjam/types";

interface RetroHeaderContextValue {
  retroKey: string | null;
  setRetroKey: (key: string | null) => void;
  phase: RetroPhase | null;
  setPhase: (phase: RetroPhase | null) => void;
  status: RetroStatus | null;
  setStatus: (status: RetroStatus | null) => void;
  participantCount: number;
  setParticipantCount: (count: number) => void;
}

const RetroHeaderContext = createContext<RetroHeaderContextValue | null>(null);

export function RetroHeaderProvider({ children }: { children: ReactNode }) {
  const [retroKey, setRetroKey] = useState<string | null>(null);
  const [phase, setPhase] = useState<RetroPhase | null>(null);
  const [status, setStatus] = useState<RetroStatus | null>(null);
  const [participantCount, setParticipantCount] = useState(0);

  return (
    <RetroHeaderContext.Provider
      value={{
        retroKey,
        setRetroKey,
        phase,
        setPhase,
        status,
        setStatus,
        participantCount,
        setParticipantCount,
      }}
    >
      {children}
    </RetroHeaderContext.Provider>
  );
}

export function useRetroHeader() {
  const context = useContext(RetroHeaderContext);
  if (!context) {
    throw new Error("useRetroHeader must be used within RetroHeaderProvider");
  }
  return context;
}

export function useRetroHeaderOptional() {
  return useContext(RetroHeaderContext);
}
