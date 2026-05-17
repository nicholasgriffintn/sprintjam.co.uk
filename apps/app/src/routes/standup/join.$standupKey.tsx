import { useParams } from "react-router";

import { StandupJoinScreen } from "@/components/standup/StandupJoinScreen";
import { NOINDEX_ROBOTS } from "@/utils/meta";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("standupJoin", ({ params }) =>
  params.standupKey ? { robots: NOINDEX_ROBOTS } : {},
);

export default function StandupJoinRoute() {
  const { standupKey: routeStandupKey } = useParams<{ standupKey: string }>();
  return <StandupJoinScreen initialStandupKey={routeStandupKey} />;
}
