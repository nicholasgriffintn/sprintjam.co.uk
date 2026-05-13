import { MotionConfig } from "framer-motion";
import { Outlet } from "react-router";

import { Header } from "@/components/layout/Header";
import { PageBackground } from "@/components/layout/PageBackground";
import { FidgetToyShelf } from "@/components/easter-eggs/FidgetToyShelf";
import { FidgetToyProvider } from "@/components/easter-eggs/FidgetToyContext";
import { RoomHeaderProvider } from "@/context/RoomHeaderContext";
import { ServerDefaultsProvider } from "@/context/ServerDefaultsContext";
import { StandupHeaderProvider } from "@/context/StandupHeaderContext";
import { RoomProvider } from "@/context/RoomContext";
import { WheelHeaderProvider } from "@/context/WheelHeaderContext";
import { RetroHeaderProvider } from "@/context/RetroHeaderContext";
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
              <RetroHeaderProvider>
                <FidgetToyProvider>
                  <PageBackground variant={getBackgroundVariant(screen)}>
                    <Header />
                    <MotionConfig reducedMotion="user">
                      <main className="flex-1">
                        <Outlet />
                      </main>
                      <FidgetToyShelf />
                    </MotionConfig>
                  </PageBackground>
                </FidgetToyProvider>
              </RetroHeaderProvider>
            </StandupHeaderProvider>
          </WheelHeaderProvider>
        </RoomHeaderProvider>
      </RoomProvider>
    </ServerDefaultsProvider>
  );
}
