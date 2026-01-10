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

export interface MarketingHeaderProps {
  variant: MarketingVariant;
}

export interface HeaderContainerProps {
  variant: HeaderVariant;
  children: React.ReactNode;
  className?: string;
}
