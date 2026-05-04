import { useParams } from "react-router";

import { WheelSetup } from "@/components/wheel/WheelSetup";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("wheel");

export default function WheelKeyRoute() {
  const { wheelKey } = useParams<{ wheelKey: string }>();

  return <WheelSetup initialWheelKey={wheelKey} />;
}
