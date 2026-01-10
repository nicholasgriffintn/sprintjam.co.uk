import type { AppScreen } from '@/context/SessionContext';
import { type PageBackgroundVariant } from '@/components/layout/PageBackground';
import {
  HeaderVariant,
  MarketingVariant,
} from '@/components/layout/Header/types';

export const getBackgroundVariant = (
  screen: AppScreen
): PageBackgroundVariant => {
  if (screen === 'room') {
    return 'room';
  }

  if (screen === 'workspace') {
    return 'plain';
  }

  return getMarketingVariant(screen);
};

export const getHeaderVariant = (screen: AppScreen): HeaderVariant => {
  if (screen === 'room') {
    return 'room';
  }

  if (screen === 'workspace') {
    return 'workspace';
  }

  return 'marketing';
};

export const getMarketingVariant = (screen: AppScreen): MarketingVariant => {
  return screen === 'welcome' ? 'hero' : 'compact';
};
