import { PageSection } from "./PageBackground";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { Spinner } from "@/components/ui/Spinner";

export function ScreenLoader({
  title = "Preparing your view",
  subtitle = "Hang tight while we load everything.",
}) {
  return (
    <PageSection maxWidth="sm">
      <div className="flex min-h-[60vh] items-center justify-center">
        <SurfaceCard className="flex w-full flex-col items-center gap-4 text-center sm:w-[420px]">
          <Spinner size="lg" className="text-brand-500" />
          <div className="space-y-1">
            <p className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {subtitle}
            </p>
          </div>
        </SurfaceCard>
      </div>
    </PageSection>
  );
}
