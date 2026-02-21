import { createContext, useContext } from "react";

import type {
  RoomActionsContextValue,
  RoomStateContextValue,
  RoomStatusContextValue,
} from "./room-context.types";

export const RoomStateContext = createContext<
  RoomStateContextValue | undefined
>(undefined);

export const RoomStatusContext = createContext<
  RoomStatusContextValue | undefined
>(undefined);

export const RoomActionsContext = createContext<
  RoomActionsContextValue | undefined
>(undefined);

export const useRoomState = (): RoomStateContextValue => {
  const ctx = useContext(RoomStateContext);
  if (!ctx) {
    throw new Error("useRoomState must be used within RoomProvider");
  }
  return ctx;
};

export const useRoomStatus = (): RoomStatusContextValue => {
  const ctx = useContext(RoomStatusContext);
  if (!ctx) {
    throw new Error("useRoomStatus must be used within RoomProvider");
  }
  return ctx;
};

export const useRoomActions = (): RoomActionsContextValue => {
  const ctx = useContext(RoomActionsContext);
  if (!ctx) {
    throw new Error("useRoomActions must be used within RoomProvider");
  }
  return ctx;
};
