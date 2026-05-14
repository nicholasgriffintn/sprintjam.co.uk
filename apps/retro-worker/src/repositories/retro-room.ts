import type { DurableObjectStorage } from "@cloudflare/workers-types";
import type { RetroStateData } from "@sprintjam/types";
import { isSessionTokenValid } from "@sprintjam/utils";

const RETRO_STATE_KEY = "retro";

export class RetroRoomRepository {
  constructor(private readonly storage: DurableObjectStorage) {}

  getRetroData(): Promise<RetroStateData | undefined> {
    return this.storage.get<RetroStateData>(RETRO_STATE_KEY);
  }

  async replaceRetroData(data: RetroStateData): Promise<void> {
    await this.storage.put(RETRO_STATE_KEY, data);
  }

  async updateRetroData(
    updater: (data: RetroStateData) => RetroStateData,
  ): Promise<RetroStateData | undefined> {
    const current = await this.getRetroData();
    if (!current) {
      return undefined;
    }

    const updated = updater(current);
    await this.replaceRetroData(updated);
    return updated;
  }

  validateSessionToken(userName: string, token: string): Promise<boolean> {
    return this.getRetroData().then((data) => {
      const canonicalName = this.findCanonicalUserNameInData(data, userName);
      const stored = canonicalName
        ? data?.sessionTokens?.[canonicalName]
        : undefined;
      return isSessionTokenValid({
        storedToken: stored?.token,
        providedToken: token,
        createdAt: stored?.createdAt,
      });
    });
  }

  async setSessionToken(userName: string, token: string): Promise<void> {
    await this.updateRetroData((data) => ({
      ...data,
      sessionTokens: {
        ...(data.sessionTokens ?? {}),
        [userName]: { token, createdAt: Date.now() },
      },
    }));
  }

  async setUserConnection(userName: string, connected: boolean): Promise<void> {
    await this.updateRetroData((data) => ({
      ...data,
      connectedUsers: {
        ...data.connectedUsers,
        [userName]: connected,
      },
    }));
  }

  async setWorkspaceUserId(
    userName: string,
    workspaceUserId: number,
  ): Promise<void> {
    await this.updateRetroData((data) => ({
      ...data,
      workspaceUserIds: {
        ...(data.workspaceUserIds ?? {}),
        [userName]: workspaceUserId,
      },
    }));
  }

  findCanonicalUserNameInData(
    data: RetroStateData | undefined,
    userName: string,
  ): string | undefined {
    return data?.users.find(
      (user) => user.toLowerCase() === userName.trim().toLowerCase(),
    );
  }

  findUserNameByWorkspaceId(
    data: RetroStateData | undefined,
    workspaceUserId: number,
  ): string | undefined {
    const entries = Object.entries(data?.workspaceUserIds ?? {});
    return entries.find(([, id]) => id === workspaceUserId)?.[0];
  }
}
