import type { RetroData } from "@sprintjam/types";
import { Download } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface RetroRecapPanelProps {
  retro: RetroData;
  onExportText: () => void;
  onExportCsv: () => void;
}

export function RetroRecapPanel({
  retro,
  onExportText,
  onExportCsv,
}: RetroRecapPanelProps) {
  const voteCount = retro.cards.reduce(
    (total, card) => total + card.votes.length,
    0,
  );

  return (
    <div className="rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
      <h2 className="font-bold text-slate-950 dark:text-white">Recap</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="info">{retro.cards.length} cards</Badge>
        <Badge variant="info">{voteCount} votes</Badge>
        <Badge variant="info">{retro.actionItems.length} actions</Badge>
      </div>
      <div className="mt-4 grid gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<Download className="h-4 w-4" />}
          onClick={onExportText}
        >
          Export recap
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          icon={<Download className="h-4 w-4" />}
          onClick={onExportCsv}
        >
          Export CSV
        </Button>
      </div>
    </div>
  );
}
