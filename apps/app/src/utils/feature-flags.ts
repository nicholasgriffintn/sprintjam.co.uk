import { WORKSPACES_STORAGE_KEY } from '@/constants';

export function isWorkspacesEnabled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const currentHost = window.location?.host || '';

  if (
    currentHost.includes('localhost') ||
    currentHost.includes('127.0.0.1') ||
    currentHost.includes('staging.sprintjam.co.uk')
  ) {
    return true;
  }

  return localStorage.getItem(WORKSPACES_STORAGE_KEY) === 'true';
}
