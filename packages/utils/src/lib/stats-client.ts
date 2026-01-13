import type { Fetcher } from '@cloudflare/workers-types';
import type { JudgeMetadata } from '@sprintjam/types';

export interface RoundStatsPayload {
  roomKey: string;
  roundId: string;
  ticketId?: string;
  votes: {
    userName: string;
    vote: string;
    structuredVote?: object;
    votedAt: number;
  }[];
  judgeScore?: string;
  judgeMetadata?: JudgeMetadata;
  roundEndedAt: number;
}

export async function postRoundStats(
  statsWorker: Fetcher,
  token: string | undefined,
  data: RoundStatsPayload
): Promise<void> {
  if (!token) {
    console.warn('[stats-client] No STATS_INGEST_TOKEN configured, skipping');
    return;
  }

  try {
    const response = await statsWorker.fetch(
      'https://stats-worker/ingest/round',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error(
        `[stats-client] Failed to post stats: ${response.status} ${text}`
      );
    }
  } catch (error) {
    console.error('[stats-client] Error posting stats:', error);
  }
}
