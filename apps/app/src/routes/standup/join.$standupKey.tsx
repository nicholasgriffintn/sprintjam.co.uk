import { useParams } from "react-router";

import { StandupJoinScreen } from "@/components/standup/StandupJoinScreen";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("standupJoin");

export default function StandupJoinRoute() {
  const { standupKey: routeStandupKey } = useParams<{ standupKey: string }>();
  return <StandupJoinScreen initialStandupKey={routeStandupKey} />;
}
