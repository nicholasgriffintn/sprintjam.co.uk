import { useCallback } from "react";
import { useNavigate } from "react-router";
import type { NavigateOptions } from "react-router";

import {
  getPathFromScreen,
  type AppScreen,
  type RouteParams,
} from "@/config/routes";

function scrollToPageTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
}

export function useAppNavigation() {
  const navigate = useNavigate();

  return useCallback(
    (
      screen: AppScreen,
      params?: RouteParams | string,
      options?: NavigateOptions,
    ) => {
      navigate(getPathFromScreen(screen, params), options);

      if ("requestAnimationFrame" in window) {
        window.requestAnimationFrame(scrollToPageTop);
      } else {
        scrollToPageTop();
      }
    },
    [navigate],
  );
}
