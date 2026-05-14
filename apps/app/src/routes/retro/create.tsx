import { RetroCreateScreen } from "@/components/retro/RetroCreateScreen";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("retroCreate");

export default function RetroCreateRoute() {
  return <RetroCreateScreen />;
}
