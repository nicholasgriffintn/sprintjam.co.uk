import { MotionConfig } from "framer-motion";
import { Outlet } from "react-router";

import { Header } from "@/components/layout/Header";
import { PageBackground } from "@/components/layout/PageBackground";
import { RoomHeaderProvider } from "@/context/RoomHeaderContext";
import { ServerDefaultsProvider } from "@/context/ServerDefaultsContext";
import { StandupHeaderProvider } from "@/context/StandupHeaderContext";
import { RoomProvider } from "@/context/RoomContext";
import { WheelHeaderProvider } from "@/context/WheelHeaderContext";
import { getBackgroundVariant } from "@/config/routes/derived";
import type { AppScreen } from "@/config/routes/definitions";
import type { ServerDefaults } from "@/types";

export function AppShell({
  serverDefaults,
  screen,
}: {
  serverDefaults: ServerDefaults;
  screen: AppScreen;
}) {
  return (
    <ServerDefaultsProvider defaults={serverDefaults}>
      <RoomProvider>
        <RoomHeaderProvider>
          <WheelHeaderProvider>
            <StandupHeaderProvider>
              <PageBackground variant={getBackgroundVariant(screen)}>
                <Header />
                <MotionConfig reducedMotion="user">
                  <main className="flex-1">
                    <Outlet />
                  </main>
                </MotionConfig>
              </PageBackground>
            </StandupHeaderProvider>
          </WheelHeaderProvider>
        </RoomHeaderProvider>
      </RoomProvider>
    </ServerDefaultsProvider>
  );
}
