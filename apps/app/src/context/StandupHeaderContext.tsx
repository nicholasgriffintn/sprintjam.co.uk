import { createContext, useContext, useState, type ReactNode } from "react";
import type { StandupData } from "@sprintjam/types";

interface StandupHeaderContextValue {
  standupKey: string | null;
  setStandupKey: (key: string | null) => void;
  standupStatus: StandupData["status"] | null;
  setStandupStatus: (status: StandupData["status"] | null) => void;
  respondedCount: number;
  setRespondedCount: (count: number) => void;
  participantCount: number;
  setParticipantCount: (count: number) => void;
}

const StandupHeaderContext = createContext<StandupHeaderContextValue | null>(
  null,
);

export function StandupHeaderProvider({ children }: { children: ReactNode }) {
  const [standupKey, setStandupKey] = useState<string | null>(null);
  const [standupStatus, setStandupStatus] = useState<
    StandupData["status"] | null
  >(null);
  const [respondedCount, setRespondedCount] = useState(0);
  const [participantCount, setParticipantCount] = useState(0);

  return (
    <StandupHeaderContext.Provider
      value={{
        standupKey,
        setStandupKey,
        standupStatus,
        setStandupStatus,
        respondedCount,
        setRespondedCount,
        participantCount,
        setParticipantCount,
      }}
    >
      {children}
    </StandupHeaderContext.Provider>
  );
}

export function useStandupHeader() {
  const context = useContext(StandupHeaderContext);
  if (!context) {
    throw new Error(
      "useStandupHeader must be used within StandupHeaderProvider",
    );
  }
  return context;
}

export function useStandupHeaderOptional() {
  return useContext(StandupHeaderContext);
}
