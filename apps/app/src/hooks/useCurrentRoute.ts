import { useMemo } from "react";
import { useLocation } from "react-router";

import { parsePath } from "@/config/routes";

export function useCurrentRoute() {
  const location = useLocation();

  return useMemo(() => parsePath(location.pathname), [location.pathname]);
}
