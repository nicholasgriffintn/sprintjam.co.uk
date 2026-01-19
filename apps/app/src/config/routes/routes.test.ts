/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  parsePath,
  getPathFromScreen,
  navigateTo,
  setReturnUrl,
  getReturnUrl,
  clearReturnUrl,
  getScreenFromPath,
} from '@/config/routes/navigation';
import {
  getRouteConfig,
  getBackgroundVariant,
  getHeaderVariant,
  getMarketingVariant,
  getMetaConfig,
  getWorkspaceNavItems,
  getAdminSidebarItems,
  getScreensInGroup,
} from '@/config/routes/derived';
import { ROUTES, type AppScreen } from '@/config/routes/registry';

describe('navigation', () => {
  describe('parsePath', () => {
    it('parses root path correctly', () => {
      const result = parsePath('/');
      expect(result).toEqual({ screen: 'welcome' });
    });

    it('parses empty string correctly', () => {
      const result = parsePath('');
      expect(result).toEqual({ screen: 'welcome' });
    });

    it('parses static marketing routes', () => {
      expect(parsePath('/privacy')).toEqual({ screen: 'privacy' });
      expect(parsePath('/terms')).toEqual({ screen: 'terms' });
      expect(parsePath('/changelog')).toEqual({ screen: 'changelog' });
      expect(parsePath('/faq')).toEqual({ screen: 'faq' });
    });

    it('parses auth routes', () => {
      expect(parsePath('/auth/login')).toEqual({ screen: 'login' });
    });

    it('parses flow routes', () => {
      expect(parsePath('/create')).toEqual({ screen: 'create' });
      expect(parsePath('/join')).toEqual({ screen: 'join' });
    });

    it('parses workspace routes', () => {
      expect(parsePath('/workspace')).toEqual({ screen: 'workspace' });
      expect(parsePath('/workspace/sessions')).toEqual({
        screen: 'workspaceSessions',
      });
      expect(parsePath('/workspace/admin')).toEqual({
        screen: 'workspaceAdmin',
      });
      expect(parsePath('/workspace/admin/teams')).toEqual({
        screen: 'workspaceAdminTeams',
      });
    });

    it('parses room route with room key', () => {
      const result = parsePath('/room/ABC123');
      expect(result.screen).toBe('room');
      expect(result.roomKey).toBe('ABC123');
    });

    it('normalizes lowercase room keys to uppercase', () => {
      const result = parsePath('/room/abc123');
      expect(result.screen).toBe('room');
      expect(result.roomKey).toBe('ABC123');
    });

    it('returns 404 for room without key', () => {
      const result = parsePath('/room');
      expect(result).toEqual({ screen: '404' });
    });

    it('handles trailing slashes correctly', () => {
      expect(parsePath('/create/')).toEqual({ screen: 'create' });
      expect(parsePath('/workspace/')).toEqual({ screen: 'workspace' });
    });

    it('removes query parameters before parsing', () => {
      expect(parsePath('/create?param=value')).toEqual({ screen: 'create' });
      expect(parsePath('/room/ABC123?foo=bar')).toEqual({
        screen: 'room',
        roomKey: 'ABC123',
      });
    });

    it('returns 404 for unknown routes', () => {
      expect(parsePath('/unknown-route')).toEqual({ screen: '404' });
      expect(parsePath('/completely/fake/path')).toEqual({ screen: '404' });
    });

    it('parses integration routes', () => {
      expect(parsePath('/integrations')).toEqual({ screen: 'integrations' });
      expect(parsePath('/integrations/jira')).toEqual({
        screen: 'integrationsJira',
      });
      expect(parsePath('/integrations/linear')).toEqual({
        screen: 'integrationsLinear',
      });
      expect(parsePath('/integrations/github')).toEqual({
        screen: 'integrationsGithub',
      });
    });

    it('parses guide routes', () => {
      expect(parsePath('/guides')).toEqual({ screen: 'guides' });
      expect(parsePath('/guides/planning-poker')).toEqual({
        screen: 'guidesPlanningPoker',
      });
      expect(parsePath('/guides/fibonacci-scale')).toEqual({
        screen: 'guidesFibonacciScale',
      });
      expect(parsePath('/guides/story-points')).toEqual({
        screen: 'guidesStoryPoints',
      });
    });
  });

  describe('getPathFromScreen', () => {
    it('returns correct paths for static routes', () => {
      expect(getPathFromScreen('welcome')).toBe('/');
      expect(getPathFromScreen('create')).toBe('/create');
      expect(getPathFromScreen('join')).toBe('/join');
      expect(getPathFromScreen('privacy')).toBe('/privacy');
    });

    it('generates room path with room key', () => {
      expect(getPathFromScreen('room', 'ABC123')).toBe('/room/ABC123');
    });

    it('generates room path without room key', () => {
      expect(getPathFromScreen('room')).toBe('/room');
    });

    it('returns 404 for unknown screen', () => {
      expect(getPathFromScreen('unknown' as AppScreen)).toBe('/404');
    });
  });

  describe('navigateTo', () => {
    let pushStateSpy: ReturnType<typeof vi.spyOn>;
    let scrollToSpy: ReturnType<typeof vi.spyOn>;
    let rafSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      pushStateSpy = vi.spyOn(window.history, 'pushState');
      scrollToSpy = vi.spyOn(window, 'scrollTo');
      rafSpy = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation((cb) => {
          cb(0);
          return 0;
        });
    });

    afterEach(() => {
      pushStateSpy.mockRestore();
      scrollToSpy.mockRestore();
      rafSpy.mockRestore();
    });

    it('navigates to screen using pushState', () => {
      navigateTo('create');
      expect(pushStateSpy).toHaveBeenCalledWith(
        { screen: 'create', roomKey: undefined },
        '',
        '/create',
      );
    });

    it('navigates to room with room key', () => {
      navigateTo('room', 'ABC123');
      expect(pushStateSpy).toHaveBeenCalledWith(
        { screen: 'room', roomKey: 'ABC123' },
        '',
        '/room/ABC123',
      );
    });

    it('scrolls to top on navigation', () => {
      navigateTo('create');
      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        left: 0,
        behavior: 'smooth',
      });
    });

    it('does not navigate if already on the same path', () => {
      window.history.replaceState(
        { screen: 'create', roomKey: undefined },
        '',
        '/create',
      );
      navigateTo('create');
      expect(pushStateSpy).not.toHaveBeenCalled();
    });
  });

  describe('return URL management', () => {
    afterEach(() => {
      sessionStorage.clear();
    });

    it('sets return URL in sessionStorage', () => {
      setReturnUrl('/workspace/sessions');
      expect(getReturnUrl()).toBe('/workspace/sessions');
    });

    it('gets return URL from sessionStorage', () => {
      setReturnUrl('/workspace/admin');
      expect(getReturnUrl()).toBe('/workspace/admin');
    });

    it('returns null when return URL is not set', () => {
      expect(getReturnUrl()).toBeNull();
    });

    it('clears return URL from sessionStorage', () => {
      setReturnUrl('/workspace');
      clearReturnUrl();
      expect(getReturnUrl()).toBeNull();
    });
  });

  describe('getScreenFromPath', () => {
    it('returns screen from path', () => {
      expect(getScreenFromPath('/create')).toBe('create');
      expect(getScreenFromPath('/room/ABC123')).toBe('room');
    });

    it('returns 404 for unknown paths', () => {
      expect(getScreenFromPath('/unknown')).toBe('404');
    });
  });
});

describe('derived', () => {
  describe('getRouteConfig', () => {
    it('returns route config for known screens', () => {
      const config = getRouteConfig('welcome');
      expect(config).toBeDefined();
      expect(config?.screen).toBe('welcome');
    });

    it('returns undefined for unknown screens', () => {
      const config = getRouteConfig('unknown' as AppScreen);
      expect(config).toBeUndefined();
    });

    it('includes all expected properties in route config', () => {
      const config = getRouteConfig('create');
      expect(config).toHaveProperty('screen');
      expect(config).toHaveProperty('path');
      expect(config).toHaveProperty('group');
      expect(config).toHaveProperty('component');
      expect(config).toHaveProperty('meta');
    });
  });

  describe('getBackgroundVariant', () => {
    it('returns group-based background for routes without custom layout', () => {
      expect(getBackgroundVariant('welcome')).toBe('compact');
      expect(getBackgroundVariant('workspace')).toBe('plain');
      expect(getBackgroundVariant('room')).toBe('room');
      expect(getBackgroundVariant('login')).toBe('compact');
      expect(getBackgroundVariant('create')).toBe('compact');
    });

    it('returns custom background when specified in layout', () => {
      expect(getBackgroundVariant('welcome')).toBe('compact');
    });

    it('returns compact as fallback for unknown screens', () => {
      expect(getBackgroundVariant('unknown' as AppScreen)).toBe('compact');
    });
  });

  describe('getHeaderVariant', () => {
    it('returns group-based header for routes without custom layout', () => {
      expect(getHeaderVariant('welcome')).toBe('marketing');
      expect(getHeaderVariant('workspace')).toBe('workspace');
      expect(getHeaderVariant('room')).toBe('room');
      expect(getHeaderVariant('login')).toBe('marketing');
      expect(getHeaderVariant('create')).toBe('marketing');
    });

    it('returns marketing as fallback for unknown screens', () => {
      expect(getHeaderVariant('unknown' as AppScreen)).toBe('marketing');
    });
  });

  describe('getMarketingVariant', () => {
    it('returns custom marketing variant when specified', () => {
      expect(getMarketingVariant('welcome')).toBe('hero');
    });

    it('returns compact as default for screens without custom variant', () => {
      expect(getMarketingVariant('create')).toBe('compact');
    });

    it('returns compact as fallback for unknown screens', () => {
      expect(getMarketingVariant('unknown' as AppScreen)).toBe('compact');
    });
  });

  describe('getMetaConfig', () => {
    it('returns meta config for known screens', () => {
      const meta = getMetaConfig('welcome');
      expect(meta).toBeDefined();
      expect(meta).toHaveProperty('title');
      expect(meta).toHaveProperty('description');
      expect(meta).toHaveProperty('keywords');
      expect(meta).toHaveProperty('ogImage');
    });

    it('returns undefined for unknown screens', () => {
      const meta = getMetaConfig('unknown' as AppScreen);
      expect(meta).toBeUndefined();
    });

    it('includes SITE_NAME in titles', () => {
      const meta = getMetaConfig('welcome');
      expect(meta?.title).toContain('SprintJam');
    });
  });

  describe('getWorkspaceNavItems', () => {
    it('returns workspace navigation items', () => {
      const items = getWorkspaceNavItems();
      expect(items).toBeDefined();
      expect(Array.isArray(items)).toBe(true);
    });

    it('excludes items with parent property', () => {
      const items = getWorkspaceNavItems();
      const screens = items.map((item) => item.screen);
      expect(screens).not.toContain('workspaceAdminTeams');
    });

    it('sorts items by nav order', () => {
      const items = getWorkspaceNavItems();
      if (items.length > 1) {
        for (let i = 1; i < items.length; i++) {
          const prevRoute = getRouteConfig(items[i - 1].screen);
          const currRoute = getRouteConfig(items[i].screen);
          const prevOrder = prevRoute?.nav?.order ?? 99;
          const currOrder = currRoute?.nav?.order ?? 99;
          expect(prevOrder).toBeLessThanOrEqual(currOrder);
        }
      }
    });

    it('includes only workspace group items with nav config', () => {
      const items = getWorkspaceNavItems();
      for (const item of items) {
        const route = getRouteConfig(item.screen);
        expect(route?.group).toBe('workspace');
        expect(route?.nav).toBeDefined();
      }
    });

    it('includes label and icon for each item', () => {
      const items = getWorkspaceNavItems();
      for (const item of items) {
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('screen');
        expect(item).toHaveProperty('activeForScreens');
      }
    });
  });

  describe('getAdminSidebarItems', () => {
    it('returns admin sidebar items', () => {
      const items = getAdminSidebarItems();
      expect(items).toBeDefined();
      expect(Array.isArray(items)).toBe(true);
    });

    it('includes workspaceAdmin and its children', () => {
      const items = getAdminSidebarItems();
      const screens = items.map((item) => item.screen);
      expect(screens).toContain('workspaceAdmin');
      expect(screens).toContain('workspaceAdminTeams');
    });

    it('excludes workspace nav items that are not admin', () => {
      const items = getAdminSidebarItems();
      const screens = items.map((item) => item.screen);
      expect(screens).not.toContain('workspace');
      expect(screens).not.toContain('workspaceSessions');
    });

    it('sorts items by nav order', () => {
      const items = getAdminSidebarItems();
      if (items.length > 1) {
        for (let i = 1; i < items.length; i++) {
          const prevRoute = getRouteConfig(items[i - 1].screen);
          const currRoute = getRouteConfig(items[i].screen);
          const prevOrder = prevRoute?.nav?.order ?? 99;
          const currOrder = currRoute?.nav?.order ?? 99;
          expect(prevOrder).toBeLessThanOrEqual(currOrder);
        }
      }
    });

    it('includes label and icon for each item', () => {
      const items = getAdminSidebarItems();
      for (const item of items) {
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('screen');
      }
    });
  });

  describe('getScreensInGroup', () => {
    it('returns all screens in marketing group', () => {
      const screens = getScreensInGroup('marketing');
      expect(screens).toContain('welcome');
      expect(screens).toContain('privacy');
      expect(screens).toContain('terms');
      expect(screens).toContain('faq');
      expect(screens).toContain('changelog');
    });

    it('returns all screens in workspace group', () => {
      const screens = getScreensInGroup('workspace');
      expect(screens).toContain('workspace');
      expect(screens).toContain('workspaceSessions');
      expect(screens).toContain('workspaceAdmin');
      expect(screens).toContain('workspaceAdminTeams');
    });

    it('returns all screens in auth group', () => {
      const screens = getScreensInGroup('auth');
      expect(screens).toContain('login');
    });

    it('returns all screens in flow group', () => {
      const screens = getScreensInGroup('flow');
      expect(screens).toContain('create');
      expect(screens).toContain('join');
    });

    it('returns all screens in room group', () => {
      const screens = getScreensInGroup('room');
      expect(screens).toContain('room');
    });

    it('excludes screens from other groups', () => {
      const marketingScreens = getScreensInGroup('marketing');
      const workspaceScreens = getScreensInGroup('workspace');
      const intersection = marketingScreens.filter((s) =>
        workspaceScreens.includes(s),
      );
      expect(intersection).toHaveLength(0);
    });
  });
});

describe('ROUTES registry', () => {
  it('has all required properties on each route', () => {
    for (const route of ROUTES) {
      expect(route).toHaveProperty('screen');
      expect(route).toHaveProperty('path');
      expect(route).toHaveProperty('group');
      expect(route).toHaveProperty('component');
      expect(route).toHaveProperty('meta');
    }
  });

  it('has unique screen names', () => {
    const screens = ROUTES.map((r) => r.screen);
    const uniqueScreens = new Set(screens);
    expect(screens.length).toBe(uniqueScreens.size);
  });

  it('has valid route groups', () => {
    const validGroups = ['marketing', 'workspace', 'room', 'auth', 'flow'];
    for (const route of ROUTES) {
      expect(validGroups).toContain(route.group);
    }
  });

  it('has meta config with required fields', () => {
    for (const route of ROUTES) {
      expect(route.meta).toHaveProperty('title');
      expect(route.meta).toHaveProperty('description');
      expect(route.meta).toHaveProperty('keywords');
      expect(route.meta).toHaveProperty('ogImage');
    }
  });

  it('has paths that are either strings or functions', () => {
    for (const route of ROUTES) {
      const isString = typeof route.path === 'string';
      const isFunction = typeof route.path === 'function';
      expect(isString || isFunction).toBe(true);
    }
  });

  it('has pathPattern for dynamic routes', () => {
    const dynamicRoutes = ROUTES.filter((r) => typeof r.path === 'function');
    for (const route of dynamicRoutes) {
      expect(route.pathPattern).toBeDefined();
      expect(route.pathPattern).toBeInstanceOf(RegExp);
    }
  });

  it('has consistent pathPattern and path function for room route', () => {
    const roomRoute = ROUTES.find((r) => r.screen === 'room');
    expect(roomRoute?.pathPattern).toBeDefined();
    expect(typeof roomRoute?.path).toBe('function');
  });

  it('has nav config for workspace routes with nav property', () => {
    const workspaceNavRoutes = ROUTES.filter(
      (r) => r.group === 'workspace' && r.nav !== undefined,
    );
    for (const route of workspaceNavRoutes) {
      // @ts-ignore - test
      const nav = route.nav;
      if (nav) {
        expect(nav).toHaveProperty('label');
        expect(nav).toHaveProperty('order');
      }
    }
  });
});
