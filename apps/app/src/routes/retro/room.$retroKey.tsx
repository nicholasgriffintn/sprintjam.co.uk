import { useParams } from "react-router";

import { RetroRoomScreen } from "@/components/retro/RetroRoomScreen";
import { NOINDEX_ROBOTS } from "@/utils/meta";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("retroRoom", ({ params }) =>
  params.retroKey ? { robots: NOINDEX_ROBOTS } : {},
);

export default function RetroRoomRoute() {
  const { retroKey } = useParams();
  return <RetroRoomScreen retroKey={(retroKey ?? "").toUpperCase()} />;
}
