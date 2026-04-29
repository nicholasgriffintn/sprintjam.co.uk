import { useLayoutEffect } from "react";

import { applyPageMeta, type MetaTagConfig } from "@/utils/meta";

export function usePageMeta(config: MetaTagConfig): void {
  useLayoutEffect(() => {
    applyPageMeta(config);
  }, [config]);
}
