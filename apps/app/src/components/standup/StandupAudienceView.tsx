import type { StandupData } from "@sprintjam/types";
import { Play } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { cn } from "@/lib/cn";

const THEME_CLASSES: Record<string, string> = {
  default: "",
  cosmic: "bg-indigo-950 text-white",
  forest: "bg-emerald-950 text-white",
  ocean: "bg-sky-950 text-white",
  sunset: "bg-orange-950 text-white",
};

const REACTION_EMOJIS = ["👏", "🎉", "💡", "❤️"] as const;

interface StandupAudienceViewProps {
  standupData: StandupData;
  currentUserName: string;
  onAddReaction: (responseUserName: string, emoji: string) => void;
  onRemoveReaction: (responseUserName: string, emoji: string) => void;
}

export function StandupAudienceView({
  standupData,
  currentUserName,
  onAddReaction,
  onRemoveReaction,
}: StandupAudienceViewProps) {
  const theme = standupData.presentationTheme ?? "default";
  const themeClass = THEME_CLASSES[theme] ?? "";
  const focusedUser = standupData.focusedUser;
  const userReactions = focusedUser
    ? standupData.reactions?.[focusedUser]
    : undefined;

  return (
    <div
      className={cn("space-y-6 rounded-2xl p-1 transition-colors", themeClass)}
    >
      <SurfaceCard
        className={cn(
          "space-y-5",
          themeClass &&
            "border-white/20 bg-white/10 backdrop-blur-sm dark:bg-white/5",
        )}
      >
        <div className="space-y-2">
          <Badge variant="default" className="gap-1">
            <Play className="h-3 w-3" />
            Presentation in progress
          </Badge>
          <h2
            className={cn(
              "text-2xl font-semibold tracking-tight",
              themeClass ? "text-white" : "text-slate-900 dark:text-white",
            )}
          >
            {focusedUser ? (
              <>
                Now presenting:{" "}
                <span className="text-brand-500">{focusedUser}</span>
              </>
            ) : (
              "Waiting for presentation to begin…"
            )}
          </h2>
        </div>

        {focusedUser ? (
          <div className="space-y-3">
            <p
              className={cn(
                "text-sm",
                themeClass
                  ? "text-white/60"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              React to their update
            </p>
            <div className="flex flex-wrap gap-3">
              {REACTION_EMOJIS.map((emoji) => {
                const reactors = userReactions?.[emoji] ?? [];
                const hasReacted = reactors.includes(currentUserName);
                return (
                  <button
                    key={emoji}
                    onClick={() =>
                      hasReacted
                        ? onRemoveReaction(focusedUser, emoji)
                        : onAddReaction(focusedUser, emoji)
                    }
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all",
                      hasReacted
                        ? "bg-brand-500 text-white"
                        : themeClass
                          ? "bg-white/10 text-white hover:bg-white/20"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20",
                    )}
                  >
                    <span>{emoji}</span>
                    {reactors.length > 0 && (
                      <span className="tabular-nums">{reactors.length}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </SurfaceCard>
    </div>
  );
}
