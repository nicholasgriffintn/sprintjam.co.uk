import { PageBackground } from './PageBackground';
import { SurfaceCard } from '../ui/SurfaceCard';

export function ScreenLoader({
  title = 'Preparing your view',
  subtitle = 'Hang tight while we load everything.',
}) {
  return (
    <PageBackground maxWidth="sm">
      <div className="flex min-h-[60vh] items-center justify-center">
        <SurfaceCard className="flex w-full flex-col items-center gap-4 text-center sm:w-[420px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-brand-500/40 border-t-brand-500 animate-spin" />
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
    </PageBackground>
  );
}
