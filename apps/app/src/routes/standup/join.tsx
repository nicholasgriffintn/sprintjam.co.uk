import { StandupJoinScreen } from "@/components/standup/StandupJoinScreen";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("standupJoin");

export default function StandupJoinRoute() {
  return <StandupJoinScreen />;
}
