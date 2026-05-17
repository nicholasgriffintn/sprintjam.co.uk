import { useParams } from "react-router";

import { RetroJoinScreen } from "@/components/retro/RetroJoinScreen";
import { NOINDEX_ROBOTS } from "@/utils/meta";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("retroJoin", ({ params }) =>
  params.retroKey ? { robots: NOINDEX_ROBOTS } : {},
);

export default function RetroJoinWithKeyRoute() {
  const { retroKey } = useParams();
  return <RetroJoinScreen initialRetroKey={retroKey ?? ""} />;
}
