import type {
  Request as CfRequest,
  Response as CfResponse,
} from "@cloudflare/workers-types";

export function handleTeamsManifest(request: CfRequest): CfResponse {
  const url = new URL(request.url);
  const origin = url.origin;
  const domain = url.hostname;
  const manifest = {
    $schema:
      "https://developer.microsoft.com/json-schemas/teams/v1.25/MicrosoftTeams.schema.json",
    manifestVersion: "1.25",
    version: "1.0.0",
    id: "f61809ab-9a12-4b0b-bd60-52888ccb38fe",
    developer: {
      name: "SprintJam",
      websiteUrl: origin,
      privacyUrl: `${origin}/privacy`,
      termsOfUseUrl: `${origin}/terms`,
    },
    name: {
      short: "SprintJam",
      full: "SprintJam",
    },
    description: {
      short: "Launch SprintJam planning rooms from Teams.",
      full: "SprintJam lets a Teams chat, channel, or meeting launch a shared sprint planning room from the same tab context.",
    },
    icons: {
      color: "logo-192.png",
      outline: "favicon-32x32.png",
    },
    accentColor: "#4f46e5",
    staticTabs: [
      {
        entityId: "sprintjam-launch",
        name: "SprintJam",
        contentUrl: `${origin}/teams/launch`,
        websiteUrl: `${origin}/teams/launch`,
        scopes: ["personal", "groupChat", "team"],
        context: [
          "personalTab",
          "channelTab",
          "privateChatTab",
          "meetingChatTab",
          "meetingDetailsTab",
          "meetingSidePanel",
          "meetingStage",
        ],
      },
    ],
    supportedChannelTypes: ["sharedChannels", "privateChannels"],
    supportsChannelFeatures: "tier1",
    authorization: {
      permissions: {
        resourceSpecific: [
          {
            name: "MeetingStage.Write.Chat",
            type: "Delegated",
          },
        ],
      },
    },
    validDomains: [domain],
  };

  // @ts-expect-error - types are weird
  return new Response(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
