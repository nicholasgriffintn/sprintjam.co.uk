import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { secureRandomInt } from "@sprintjam/utils";

export type ToyKind =
  | "spinner"
  | "pop-pad"
  | "joystick"
  | "switch-panel"
  | "slider-maze"
  | "mini-abacus";

export type ToyPosition = {
  x: number;
  y: number;
};

export type ActiveToy = {
  id: number;
  kind: ToyKind;
  createdAt: number;
  visualSeed: number;
  position: ToyPosition;
};

type FidgetToyContextValue = {
  isPickerOpen: boolean;
  isSoundEnabled: boolean;
  openPicker: () => void;
  closePicker: () => void;
  toggleSound: () => void;
  toys: ActiveToy[];
  addToy: (kind: ToyKind) => void;
  removeToy: (toyId: number) => void;
  clearToys: () => void;
  updateToyPosition: (toyId: number, position: ToyPosition) => void;
};

const FidgetToyContext = createContext<FidgetToyContextValue | undefined>(
  undefined,
);

export const MAX_FIDGET_TOYS = 6;

const fallbackFidgetToyContext: FidgetToyContextValue = {
  isPickerOpen: false,
  isSoundEnabled: true,
  openPicker: () => undefined,
  closePicker: () => undefined,
  toggleSound: () => undefined,
  toys: [],
  addToy: () => undefined,
  removeToy: () => undefined,
  clearToys: () => undefined,
  updateToyPosition: () => undefined,
};

export function FidgetToyProvider({ children }: { children: ReactNode }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [toys, setToys] = useState<ActiveToy[]>([]);
  const nextToyIdRef = useRef(0);

  const value = useMemo<FidgetToyContextValue>(
    () => ({
      isPickerOpen,
      isSoundEnabled,
      openPicker: () => setIsPickerOpen(true),
      closePicker: () => setIsPickerOpen(false),
      toggleSound: () => setIsSoundEnabled((current) => !current),
      toys,
      addToy: (kind) => {
        const toyId = nextToyIdRef.current++;
        const visualSeed = secureRandomInt(0x100000000);
        setToys((current) => {
          const visibleIndex = Math.min(current.length, MAX_FIDGET_TOYS - 1);
          return [
            ...current.slice(-(MAX_FIDGET_TOYS - 1)),
            {
              id: toyId,
              kind,
              createdAt: toyId,
              visualSeed,
              position: {
                x: 28 + visibleIndex * 28,
                y: 96 + visibleIndex * 22,
              },
            },
          ];
        });
      },
      removeToy: (toyId) => {
        setToys((current) => current.filter((toy) => toy.id !== toyId));
      },
      clearToys: () => setToys([]),
      updateToyPosition: (toyId, position) => {
        setToys((current) =>
          current.map((toy) =>
            toy.id === toyId
              ? {
                  ...toy,
                  position,
                }
              : toy,
          ),
        );
      },
    }),
    [isPickerOpen, isSoundEnabled, toys],
  );

  return (
    <FidgetToyContext.Provider value={value}>
      {children}
    </FidgetToyContext.Provider>
  );
}

export function useFidgetToys() {
  const context = useContext(FidgetToyContext);
  return context ?? fallbackFidgetToyContext;
}
