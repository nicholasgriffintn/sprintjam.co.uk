import { useState } from "react";
import { Gamepad2, Github, MessageSquare } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { FeedbackForm } from "@/components/FeedbackForm";
import { Button } from "@/components/ui/Button";
import { navigateTo, type AppScreen } from '@/config/routes';
import { useSessionActions } from '@/context/SessionContext';

type FooterProps = {
  displayRepoLink?: boolean;
  layout?: "standard" | "wide";
  fullWidth?: boolean;
  priorityLinksOnly?: boolean;
  onOpenGames?: () => void;
};

export const Footer = ({
  displayRepoLink = true,
  layout = "standard",
  fullWidth = true,
  priorityLinksOnly = true,
  onOpenGames,
}: FooterProps) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  const { setScreen } = useSessionActions();

  const handleNavigate = (screen: AppScreen) => {
    setScreen(screen);
    navigateTo(screen);
  };

  return (
    <>
      <footer
        className={`${fullWidth ? 'max-w-full' : 'max-w-2xl'} ${
          layout === 'wide'
            ? 'lg:grid-cols-[1fr_auto] text-center lg:justify-start lg:text-left'
            : 'grid-cols-1 text-center'
        } mx-auto mt-8 grid items-center gap-4 text-sm text-slate-700 dark:text-slate-400`}
      >
        <div
          className={`${
            layout === 'wide' ? 'lg:justify-start lg:text-left' : ''
          } flex flex-wrap items-center justify-center gap-x-4 gap-y-2`}
        >
          {!priorityLinksOnly && (
            <>
              <span>
                Built by{' '}
                <a
                  href="https://nicholasgriffin.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
                >
                  Nicholas Griffin
                </a>
              </span>
              <span className="hidden sm:inline">|</span>
            </>
          )}
          <a
            href="https://bitwobbly.com/status/sprintjam"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Status
          </a>
          <span className="hidden sm:inline">|</span>
          <button
            type="button"
            onClick={() => handleNavigate('privacy')}
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Privacy Policy
          </button>
          <span className="hidden sm:inline">|</span>
          <button
            type="button"
            onClick={() => handleNavigate('terms')}
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Terms
          </button>
          <span className="hidden sm:inline">|</span>
          <button
            type="button"
            onClick={() => handleNavigate('integrations')}
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Integrations
          </button>
          <span className="hidden sm:inline">|</span>
          <button
            type="button"
            onClick={() => handleNavigate('faq')}
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            FAQ
          </button>
          <span className="hidden sm:inline">|</span>
          <button
            type="button"
            onClick={() => handleNavigate('guides')}
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Guides
          </button>
          <span className="hidden sm:inline">|</span>
          <button
            type="button"
            onClick={() => handleNavigate('changelog')}
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Changelog
          </button>
        </div>

        <div
          className={`${
            fullWidth ? ' lg:w-auto lg:flex-nowrap' : ''
          } flex w-full flex-wrap items-center justify-center gap-2 mt-4`}
        >
          {onOpenGames ? (
            <Button
              type="button"
              variant="unstyled"
              onClick={onOpenGames}
              className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 shadow-sm transition hover:-translate-y-0.5 dark:border-brand-300/30 dark:bg-brand-400/10 dark:text-brand-100"
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              Party games
            </Button>
          ) : null}

          <Button
            type="button"
            variant="unstyled"
            onClick={() => setIsFeedbackOpen(true)}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-brand-300/60"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Send feedback
          </Button>

          {displayRepoLink ? (
            <a
              href="https://github.com/nicholasgriffintn/sprintjam.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white dark:text-slate-900"
            >
              <Github className="h-3.5 w-3.5" />
              View repository
            </a>
          ) : null}
        </div>
      </footer>

      <Modal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        title="Send feedback"
        size="lg"
      >
        <FeedbackForm />
      </Modal>
    </>
  );
};
