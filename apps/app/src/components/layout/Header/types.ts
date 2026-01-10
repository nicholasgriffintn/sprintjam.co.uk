export type HeaderVariant = 'marketing' | 'room' | 'workspace';
export type MarketingVariant = 'hero' | 'compact';
export type LogoSize = 'xs' | 'sm' | 'md' | 'lg';

export interface HeaderLogoProps {
  size?: LogoSize;
  showText?: boolean;
  className?: string;
  onClick?: () => void;
  layoutId?: string;
}

export interface RoomHeaderProps {
  onNavigateHome: () => void;
}

export interface WorkspaceHeaderProps {
  onNewRoom: () => void;
  onLogout: () => void;
  onNavigateDashboard: () => void;
  onNavigateHome: () => void;
}

export interface MarketingHeaderProps {
  variant: MarketingVariant;
  onNavigateHome?: () => void;
}

export interface HeaderContainerProps {
  variant: HeaderVariant;
  children: React.ReactNode;
  className?: string;
}
