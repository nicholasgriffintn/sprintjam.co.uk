import { RetroJoinScreen } from "@/components/retro/RetroJoinScreen";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("retroJoin");

export default function RetroJoinRoute() {
  return <RetroJoinScreen />;
}
