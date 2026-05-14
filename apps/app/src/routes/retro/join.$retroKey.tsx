import { useParams } from "react-router";

import { RetroJoinScreen } from "@/components/retro/RetroJoinScreen";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("retroJoin");

export default function RetroJoinWithKeyRoute() {
  const { retroKey } = useParams();
  return <RetroJoinScreen initialRetroKey={retroKey ?? ""} />;
}
