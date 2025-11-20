import { useEffect, useRef } from "react";

interface UseUrlParamsOptions {
  onJoinRoom: (roomKey: string) => void;
}

export const useUrlParams = ({ onJoinRoom }: UseUrlParamsOptions) => {
  const didCheckUrlParams = useRef(false);

  useEffect(() => {
    if (didCheckUrlParams.current) return;

    didCheckUrlParams.current = true;

    try {
      const url = new URL(window.location.href);
      const joinParam = url.searchParams.get("join");

      if (joinParam && joinParam.length > 0) {
        onJoinRoom(joinParam.toUpperCase());
        window.history.replaceState({}, document.title, "/");
      }
    } catch (err) {
      console.error("Failed to parse URL parameters", err);
    }
  }, [onJoinRoom]);
};
