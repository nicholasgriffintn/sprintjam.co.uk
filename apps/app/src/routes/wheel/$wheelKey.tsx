import { useParams } from "react-router";

import { WheelSetup } from "@/components/wheel/WheelSetup";
import { createMeta } from "@/utils/route-meta";
import { NOINDEX_ROBOTS } from "@/utils/meta";

export const meta = createMeta("wheel", ({ params }) =>
  params.wheelKey ? { robots: NOINDEX_ROBOTS } : {},
);

export default function WheelKeyRoute() {
  const { wheelKey } = useParams<{ wheelKey: string }>();

  return <WheelSetup initialWheelKey={wheelKey} />;
}
