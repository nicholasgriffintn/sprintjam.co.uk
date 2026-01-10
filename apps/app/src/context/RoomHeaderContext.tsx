import { createContext, useContext, useState, type ReactNode } from "react";

import type { RoomSettingsTabId } from "@/components/RoomSettingsTabs";

interface RoomHeaderContextValue {
  isShareModalOpen: boolean;
  setIsShareModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  openSettings: (tab?: RoomSettingsTabId) => void;
  closeSettings: () => void;
  settingsInitialTab: RoomSettingsTabId | undefined;
  isSaveToWorkspaceOpen: boolean;
  setIsSaveToWorkspaceOpen: (open: boolean) => void;
}

const RoomHeaderContext = createContext<RoomHeaderContextValue | null>(null);

export function RoomHeaderProvider({ children }: { children: ReactNode }) {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<
    RoomSettingsTabId | undefined
  >(undefined);
  const [isSaveToWorkspaceOpen, setIsSaveToWorkspaceOpen] = useState(false);

  const openSettings = (tab?: RoomSettingsTabId) => {
    setSettingsInitialTab(tab);
    setIsSettingsModalOpen(true);
  };

  const closeSettings = () => {
    setIsSettingsModalOpen(false);
    setSettingsInitialTab(undefined);
  };

  return (
    <RoomHeaderContext.Provider
      value={{
        isShareModalOpen,
        setIsShareModalOpen,
        isSettingsModalOpen,
        openSettings,
        closeSettings,
        settingsInitialTab,
        isSaveToWorkspaceOpen,
        setIsSaveToWorkspaceOpen,
      }}
    >
      {children}
    </RoomHeaderContext.Provider>
  );
}

export function useRoomHeader() {
  const context = useContext(RoomHeaderContext);
  if (!context) {
    throw new Error("useRoomHeader must be used within RoomHeaderProvider");
  }
  return context;
}

export function useRoomHeaderOptional() {
  return useContext(RoomHeaderContext);
}
