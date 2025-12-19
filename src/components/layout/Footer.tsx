import { useState } from "react";
import { Github, MessageSquare } from "lucide-react";

import { Modal } from "@/components/ui/Modal";
import { FeedbackForm } from "@/components/FeedbackForm";

type FooterProps = {
  displayRepoLink?: boolean;
  layout?: 'standard' | 'wide';
  fullWidth?: boolean;
  priorityLinksOnly?: boolean;
};

export const Footer = ({
  displayRepoLink = true,
  layout = 'standard',
  fullWidth = true,
  priorityLinksOnly = true,
}: FooterProps) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

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
            href="/privacy"
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Privacy Policy
          </a>
          <span className="hidden sm:inline">|</span>
          <a
            href="/terms"
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Terms
          </a>
          <span className="hidden sm:inline">|</span>
          <a
            href="/changelog"
            className="underline underline-offset-2 hover:text-slate-900 dark:hover:text-white"
          >
            Changelog
          </a>
        </div>

        <div
          className={`${
            fullWidth ? ' lg:w-auto lg:flex-nowrap' : ''
          } flex w-full flex-wrap items-center justify-center gap-2`}
        >
          <button
            type="button"
            onClick={() => setIsFeedbackOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:text-brand-700 dark:border-white/15 dark:bg-white/10 dark:text-white dark:hover:border-brand-300/60"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Send feedback
          </button>

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
