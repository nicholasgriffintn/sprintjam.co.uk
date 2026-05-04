import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

interface UseUrlParamsOptions {
  onJoinRoom: (roomKey: string) => void;
}

export const useUrlParams = ({ onJoinRoom }: UseUrlParamsOptions) => {
  const location = useLocation();
  const didCheckUrlParams = useRef(false);

  useEffect(() => {
    if (didCheckUrlParams.current) return;

    didCheckUrlParams.current = true;

    const searchParams = new URLSearchParams(location.search);
    const joinParam = searchParams.get("join");

    if (joinParam && joinParam.length > 0) {
      onJoinRoom(joinParam.toUpperCase());
    }
  }, [location.search, onJoinRoom]);
};
