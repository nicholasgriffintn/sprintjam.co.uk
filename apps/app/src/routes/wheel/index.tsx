import { WheelSetup } from "@/components/wheel/WheelSetup";
import { createMeta } from "@/utils/route-meta";

export const meta = createMeta("wheel");

export default function WheelRoute() {
  return <WheelSetup />;
}
