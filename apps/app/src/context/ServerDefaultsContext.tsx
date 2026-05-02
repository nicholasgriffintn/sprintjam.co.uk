import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useRevalidator } from "react-router";

import type { ServerDefaults } from "@/types";
import { cloneServerDefaults } from "@/utils/settings";

interface ServerDefaultsContextValue {
  serverDefaults: ServerDefaults;
  isLoadingDefaults: boolean;
}

const ServerDefaultsContext =
  createContext<ServerDefaultsContextValue | null>(null);

export function ServerDefaultsProvider({
  children,
  defaults,
}: {
  children: ReactNode;
  defaults: ServerDefaults;
}) {
  const revalidator = useRevalidator();
  const serverDefaults = useMemo(
    () => cloneServerDefaults(defaults),
    [defaults],
  );

  const value = useMemo<ServerDefaultsContextValue>(
    () => ({
      serverDefaults,
      isLoadingDefaults: revalidator.state !== "idle",
    }),
    [revalidator.state, serverDefaults],
  );

  return (
    <ServerDefaultsContext.Provider value={value}>
      {children}
    </ServerDefaultsContext.Provider>
  );
}

export function useServerDefaults(): ServerDefaultsContextValue {
  const context = useContext(ServerDefaultsContext);
  if (!context) {
    throw new Error(
      "useServerDefaults must be used within ServerDefaultsProvider",
    );
  }
  return context;
}
