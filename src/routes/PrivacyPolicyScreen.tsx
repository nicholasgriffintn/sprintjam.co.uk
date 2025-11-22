import { motion } from 'framer-motion';

import { PageBackground } from '../components/layout/PageBackground';
import { Logo } from '../components/Logo';
import { usePageMeta } from '../hooks/usePageMeta';
import { META_CONFIGS } from '../config/meta';

const PrivacyPolicyScreen = () => {
  usePageMeta(META_CONFIGS.privacy);

  return (
    <PageBackground maxWidth="xl" variant="compact">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-14 lg:space-y-16"
      >
        <div className="flex justify-center">
          <a href="/" aria-label="SprintJam home" className="hover:opacity-80">
            <Logo size="lg" />
          </a>
        </div>
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                Privacy Policy
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                SprintJam keeps your rooms lightweight: no ads, no marketing
                pixels, and minimal storage. Below is exactly what lives in your
                browser, what the server retains, and how to keep it private
                when you self-host.
              </p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                What lives in your browser
              </h2>
              <ul className="mt-3 space-y-2 text-base text-slate-700 dark:text-slate-200 text-left">
                <li className="flex gap-3 rounded-xl bg-slate-50/80 px-3 py-2 text-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10">
                  <span>
                    Your display name and theme preference are stored in{' '}
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-semibold text-slate-800 dark:bg-white/10 dark:text-white">
                      localStorage
                    </code>{' '}
                    so you do not need to re-enter them.
                  </span>
                </li>
                <li className="flex gap-3 rounded-xl bg-slate-50/80 px-3 py-2 text-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10">
                  <span>
                    No cookies or cross-site tracking pixels are used.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                What the server keeps
              </h2>
              <ul className="mt-3 space-y-2 text-base text-slate-700 dark:text-slate-200 text-left">
                <li className="flex gap-3 rounded-xl bg-slate-50/80 px-3 py-2 text-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10">
                  <span>
                    Room state stored inside a Cloudflare Durable Object bound
                    to your account: room key, moderator, hashed passcode,
                    participant names/avatars, connection status, votes (incl.
                    structured votes), and ticket queue metadata.
                  </span>
                </li>
                <li className="flex gap-3 rounded-xl bg-slate-50/80 px-3 py-2 text-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10">
                  <span>
                    Optional room music stores the generated Strudel code and
                    playback state alongside the room.
                  </span>
                </li>
                <li className="flex gap-3 rounded-xl bg-slate-50/80 px-3 py-2 text-sm ring-1 ring-slate-100 dark:bg-white/5 dark:ring-white/10">
                  <span>
                    Data is not shared with third-party analytics; traffic stays
                    within your Cloudflare zone unless you enable an
                    integration.
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h2 className="text-xl font-semibold">Optional integrations</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-100">
                <li className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                  <strong className="text-white">Jira (optional):</strong> Only
                  used if you set{' '}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-semibold">
                    JIRA_OAUTH_CLIENT_ID
                  </code>
                  ,{' '}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-semibold">
                    JIRA_OAUTH_CLIENT_SECRET
                  </code>
                  , and{' '}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-semibold">
                    JIRA_OAUTH_REDIRECT_URI
                  </code>
                  . When enabled, per-room OAuth tokens and ticket metadata are
                  stored inside the Durable Object.
                </li>
                <li className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                  <strong className="text-white">
                    Strudel music (optional):
                  </strong>{' '}
                  Requires{' '}
                  <code className="rounded bg-white/10 px-1.5 py-0.5 font-semibold">
                    POLYCHAT_API_TOKEN
                  </code>
                  . When set, a short prompt (no room names or user identifiers)
                  is sent to api.polychat.app to generate code snippets.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-sm shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Privacy configuration for self-hosting
              </h2>
              <ul className="mt-3 space-y-2 text-base text-slate-700 dark:text-slate-200">
                <li>
                  Logging/observability: invocation logs are off by default, but
                  request sampling is on. Set sampling to{' '}
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-semibold text-slate-800 dark:bg-white/10 dark:text-white">
                    0
                  </code>{' '}
                  (or disable the block) if you need zero log retention in
                  Cloudflare:
                </li>
              </ul>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-900 p-4 text-sm text-slate-100 shadow-sm dark:border-white/10">
                <pre className="whitespace-pre-wrap font-mono text-xs sm:text-sm text-left">{`{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 0,
    "logs": { "enabled": false, "head_sampling_rate": 0 }
  }
}`}</pre>
              </div>
              <div className="mt-3 rounded-xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
                Adjust this in{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-semibold text-slate-800 dark:bg-white/10 dark:text-white">
                  wrangler.jsonc
                </code>{' '}
                before deploying to match your policy.
              </div>
              <ul className="mt-3 space-y-2 text-base text-slate-700 dark:text-slate-200">
                <li>
                  Serve the site over HTTPS with your own Cloudflare domain and
                  keep any WAF/Zero Trust rules aligned with your team's privacy
                  requirements.
                </li>
              </ul>
            </div>
          </div>

          <footer className="flex items-center justify-between rounded-2xl border border-dashed border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
            <span>
              Need something clarified? Open an issue on the GitHub repo.
            </span>
            <a
              href="https://github.com/nicholasgriffintn/sprintjam"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white dark:text-slate-900"
            >
              View repository
            </a>
          </footer>
        </div>
      </motion.div>
    </PageBackground>
  );
};

export default PrivacyPolicyScreen;
