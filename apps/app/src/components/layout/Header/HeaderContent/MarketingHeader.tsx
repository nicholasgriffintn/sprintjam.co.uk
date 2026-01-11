import type { FC } from "react";

import { HeaderLogo } from "../HeaderLogo";
import type { MarketingHeaderProps } from "../types";
import { useSessionActions } from '@/context/SessionContext';
import { HeaderUserMenu } from '../HeaderUserMenu';

export const MarketingHeader: FC<MarketingHeaderProps> = ({ variant }) => {
  const { goHome } = useSessionActions();

  const logoSize = variant === 'hero' ? 'lg' : 'md';

  return (
    <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center px-4">
      <div />
      <HeaderLogo
        size={logoSize}
        showText
        onClick={goHome}
        className={variant === 'hero' ? 'scale-95 sm:scale-100' : ''}
        layoutId="marketing-header-logo"
      />
      <div className="flex justify-end">
        <HeaderUserMenu />
      </div>
    </div>
  );
};
