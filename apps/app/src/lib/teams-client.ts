const TEAMS_SDK_SRC =
  "https://res.cdn.office.net/teams-js/2.34.0/js/MicrosoftTeams.min.js";

type TeamsContext = {
  app?: {
    host?: {
      name?: string;
    };
    theme?: string;
  };
  channel?: {
    id?: string;
    displayName?: string;
  };
  chat?: {
    id?: string;
  };
  meeting?: {
    id?: string;
  };
  page?: {
    frameContext?: string;
  };
  team?: {
    groupId?: string;
    displayName?: string;
  };
  user?: {
    id?: string;
    tenant?: {
      id?: string;
    };
  };
};

type TeamsSdk = {
  app?: {
    initialize: () => Promise<void>;
    getContext: () => Promise<TeamsContext>;
  };
};

declare global {
  interface Window {
    microsoftTeams?: TeamsSdk;
  }
}

let sdkPromise: Promise<TeamsSdk | null> | null = null;

function loadTeamsScript(): Promise<TeamsSdk | null> {
  if (window.microsoftTeams) {
    return Promise.resolve(window.microsoftTeams);
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = TEAMS_SDK_SRC;
    script.async = true;
    script.onload = () => resolve(window.microsoftTeams ?? null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });

  return sdkPromise;
}

export async function getTeamsContext(): Promise<TeamsContext | null> {
  const sdk = await loadTeamsScript();
  if (!sdk?.app) {
    return null;
  }

  try {
    await sdk.app.initialize();
    return await sdk.app.getContext();
  } catch {
    return null;
  }
}
