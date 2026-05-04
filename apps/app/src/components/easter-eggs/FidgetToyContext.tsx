import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

export type ToyKind = "spinner" | "pop-pad" | "joystick";

export type ActiveToy = {
  id: number;
  kind: ToyKind;
  createdAt: number;
};

type FidgetToyContextValue = {
  isPickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  toys: ActiveToy[];
  addToy: (kind: ToyKind) => void;
  removeToy: (toyId: number) => void;
};

const FidgetToyContext = createContext<FidgetToyContextValue | undefined>(
  undefined,
);

const fallbackFidgetToyContext: FidgetToyContextValue = {
  isPickerOpen: false,
  openPicker: () => undefined,
  closePicker: () => undefined,
  toys: [],
  addToy: () => undefined,
  removeToy: () => undefined,
};

export function FidgetToyProvider({ children }: { children: ReactNode }) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [toys, setToys] = useState<ActiveToy[]>([]);

  const value = useMemo<FidgetToyContextValue>(
    () => ({
      isPickerOpen,
      openPicker: () => setIsPickerOpen(true),
      closePicker: () => setIsPickerOpen(false),
      toys,
      addToy: (kind) => {
        setToys((current) => [
          ...current.slice(-4),
          {
            id: Date.now(),
            kind,
            createdAt: current.length,
          },
        ]);
      },
      removeToy: (toyId) => {
        setToys((current) => current.filter((toy) => toy.id !== toyId));
      },
    }),
    [isPickerOpen, toys],
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
