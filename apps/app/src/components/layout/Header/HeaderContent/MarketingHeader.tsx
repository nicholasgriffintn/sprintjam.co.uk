import type { FC } from "react";

import { HeaderLogo } from "../HeaderLogo";
import type { MarketingHeaderProps } from "../types";

export const MarketingHeader: FC<MarketingHeaderProps> = ({
  variant,
  onNavigateHome,
}) => {
  const logoSize = variant === "hero" ? "lg" : "md";

  return (
    <HeaderLogo
      size={logoSize}
      showText
      onClick={onNavigateHome}
      layoutId="header-logo"
      className={variant === "hero" ? "scale-95 sm:scale-100" : ""}
    />
  );
};
