import { useParams } from "react-router";

import { RetroRoomScreen } from "@/components/retro/RetroRoomScreen";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("retroRoom");

export default function RetroRoomRoute() {
  const { retroKey } = useParams();
  return <RetroRoomScreen retroKey={(retroKey ?? "").toUpperCase()} />;
}
