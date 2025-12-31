import { type FormEvent, useMemo, useState } from 'react';
import { Send } from 'lucide-react';

import { submitFeedback } from '@/lib/feedback-service';
import type { GithubIssue } from '@/types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

const LABEL_OPTIONS = [
  {
    value: 'feedback',
    title: 'General feedback',
    description: 'Ideas, rough edges, or kudos.',
  },
  {
    value: 'bug',
    title: 'Bug report',
    description: 'Something broke or doesn’t work as expected.',
  },
  {
    value: 'enhancement',
    title: 'Feature request',
    description: 'Missing capability that would help your team.',
  },
  {
    value: 'ui-ux',
    title: 'UI / UX',
    description: 'Design, clarity, or accessibility issues.',
  },
];

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error';

export function FeedbackForm() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState<string>('feedback');
  const [status, setStatus] = useState<SubmissionState>('idle');
  const [error, setError] = useState<string>('');
  const [issue, setIssue] = useState<GithubIssue | null>(null);

  const isSubmitDisabled = useMemo(() => {
    return (
      status === 'submitting' || !title.trim() || !description.trim() || !label
    );
  }, [description, label, status, title]);

  const issueLink = useMemo(() => {
    if (!issue) return null;
    if (issue.url) return issue.url;
    if (issue.repository && issue.number) {
      return `https://github.com/${issue.repository}/issues/${issue.number}`;
    }
    return null;
  }, [issue]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitDisabled) return;

    setStatus('submitting');
    setError('');
    setIssue(null);

    try {
      const createdIssue = await submitFeedback({
        title: title.trim(),
        description: description.trim(),
        labels: [label],
        email: email.trim() || undefined,
        pageUrl:
          typeof window !== 'undefined' ? window.location.href : undefined,
      });

      setIssue(createdIssue);
      setStatus('success');
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to send feedback. Please try again.';
      setError(message);
      setStatus('error');
    }
  };

  return (
    <form className="space-y-4 text-left" onSubmit={handleSubmit}>
      {status === 'success' && issue ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 shadow-sm dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-100">
          <div>
            <p className="font-semibold">
              Thank you for your feedback! You can track the issue here:
            </p>
            {issueLink ? (
              <a
                href={issueLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline underline-offset-2 hover:text-emerald-600 dark:text-emerald-200"
                aria-label={`View issue ${issue.key || `#${issue.number}`}`}
              >
                {issue.key || `#${issue.number}`}
              </a>
            ) : null}
          </div>
        </div>
      ) : (
        <>
          <Input
            label="Title"
            placeholder="Short summary"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            fullWidth
          />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Feedback type
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {LABEL_OPTIONS.map((option) => {
                const isActive = label === option.value;
                return (
                  <Button
                    key={option.value}
                    type="button"
                    variant="unstyled"
                    onClick={() => setLabel(option.value)}
                    className={`w-full rounded-2xl border px-3 py-2 text-sm font-semibold ${
                      isActive
                        ? 'border-brand-400/70 bg-brand-50 text-brand-700 shadow-sm dark:border-brand-300/60 dark:bg-brand-500/10 dark:text-brand-100'
                        : 'border-white/60 bg-white text-slate-700 hover:border-brand-200 hover:text-brand-700 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:hover:border-brand-300/60'
                    }`}
                    aria-pressed={isActive}
                  >
                    {option.title}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label
              htmlFor="feedback-description"
              className="text-sm font-semibold text-slate-700 dark:text-slate-200"
            >
              Details
            </label>
            <textarea
              id="feedback-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-[140px] rounded-2xl border border-white/60 bg-white/90 px-4 py-3 text-base text-slate-900 shadow-sm transition focus:border-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:border-white/10 dark:bg-slate-900/60 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-900"
              placeholder="Share steps to reproduce, expected behavior, and any context."
              required
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This is sent directly to GitHub. Please avoid any sensitive
              information.
            </p>
          </div>

          <Input
            label="Contact (optional)"
            placeholder="GitHub handle (this will be made public)"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            fullWidth
          />

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-100">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Creates a labeled issue in our repo.
            </p>
            <Button
              type="submit"
              icon={<Send className="h-4 w-4" />}
              disabled={isSubmitDisabled}
            >
              {status === 'submitting' ? 'Submitting...' : 'Send feedback'}
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
