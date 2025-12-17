import { Github } from "lucide-react";

export const Footer = ({ displayRepoLink = true, fullWidth = true }) => {
  return (
    <footer
      className={`${fullWidth ? "max-w-full" : "max-w-2xl"} mx-auto mt-8 flex flex-col items-center gap-4 text-sm text-slate-700 dark:text-slate-400 sm:flex-row ${displayRepoLink ? "justify-between" : "justify-center"}`}
    >
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center sm:text-left">
        <span>
          Built by{" "}
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
      </div>

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
    </footer>
  );
};
