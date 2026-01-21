import { createContext, useContext, useState, type ReactNode } from "react";

interface WheelHeaderContextValue {
  wheelKey: string | null;
  setWheelKey: (key: string | null) => void;
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
}

const WheelHeaderContext = createContext<WheelHeaderContextValue | null>(null);

export function WheelHeaderProvider({ children }: { children: ReactNode }) {
  const [wheelKey, setWheelKey] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  return (
    <WheelHeaderContext.Provider
      value={{
        wheelKey,
        setWheelKey,
        isShareModalOpen,
        setIsShareModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
      }}
    >
      {children}
    </WheelHeaderContext.Provider>
  );
}

export function useWheelHeader() {
  const context = useContext(WheelHeaderContext);
  if (!context) {
    throw new Error("useWheelHeader must be used within WheelHeaderProvider");
  }
  return context;
}

export function useWheelHeaderOptional() {
  return useContext(WheelHeaderContext);
}
