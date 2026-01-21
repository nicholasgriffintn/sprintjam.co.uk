import type { FC } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

import { useSessionState } from "@/context/SessionContext";
import { HeaderContainer } from "@/components/layout/Header/HeaderContainer";
import { MarketingHeader } from "@/components/layout/Header/HeaderContent/MarketingHeader";
import { RoomHeader } from "@/components/layout/Header/HeaderContent/RoomHeader";
import { WorkspaceHeader } from "@/components/layout/Header/HeaderContent/WorkspaceHeader";
import { WheelHeader } from "@/components/layout/Header/HeaderContent/WheelHeader";
import { HEADER_TRANSITION } from "@/constants";
import { getHeaderVariant, getMarketingVariant } from "@/config/routes";

export const Header: FC = () => {
  const { screen } = useSessionState();

  const variant = getHeaderVariant(screen);

  const renderContent = () => {
    switch (variant) {
      case "room":
        return (
          <motion.div
            key="room"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={HEADER_TRANSITION}
            className="contents w-full"
          >
            <RoomHeader />
          </motion.div>
        );

      case "workspace":
        return (
          <motion.div
            key="workspace"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={HEADER_TRANSITION}
            className="contents w-full"
          >
            <WorkspaceHeader />
          </motion.div>
        );

      case "wheel":
        return (
          <motion.div
            key="wheel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={HEADER_TRANSITION}
            className="contents w-full"
          >
            <WheelHeader />
          </motion.div>
        );

      default:
        return (
          <motion.div
            key="marketing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={HEADER_TRANSITION}
            className="w-full"
          >
            <MarketingHeader variant={getMarketingVariant(screen)} />
          </motion.div>
        );
    }
  };

  return (
    <LayoutGroup>
      <HeaderContainer variant={variant}>
        <AnimatePresence mode="wait" initial={false}>
          {renderContent()}
        </AnimatePresence>
      </HeaderContainer>
    </LayoutGroup>
  );
};
