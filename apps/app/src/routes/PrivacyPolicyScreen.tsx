import { motion } from "framer-motion";
import {
  CalendarCheck,
  Database,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import { PageSection } from "@/components/layout/PageBackground";
import { Footer } from "@/components/layout/Footer";
import { usePageMeta } from "@/hooks/usePageMeta";
import { META_CONFIGS } from "@/config/meta";
import { SITE_NAME } from '@/constants';

const LAST_UPDATED = '5th January 2026';

const highlightCards = [
  {
    title: 'Minimal data footprint',
    description:
      'Only the information required to synchronise your room is persisted. No tracking pixels.',
    icon: ShieldCheck,
  },
  {
    title: 'Transparency first',
    description:
      'Every storage location is documented on this page. Only essential cookies for authentication.',
    icon: Database,
  },
  {
    title: 'Self-host friendly',
    description: `${SITE_NAME} is Apache 2.0 licensed, ready to be deployed on your own account.`,
    icon: SlidersHorizontal,
  },
];

const browserStorage = [
  {
    label: 'Essential authentication cookies',
    detail:
      'Workspace session tokens are stored in secure, httpOnly cookies to protect against XSS attacks. These cookies are never shared with third parties.',
  },
  {
    label: 'Local preferences',
    detail:
      'Display name, avatar emoji, settings, and most-recently room join code are stored in localStorage.',
  },
  {
    label: 'No tracking or marketing cookies',
    detail: `${SITE_NAME} does not set marketing or advertising cookies, nor does it embed remote analytics or third-party trackers.`,
  },
];

const serverStorage = [
  {
    label: 'Room state in Durable Objects',
    detail:
      'Room key, moderators, encrypted passcodes, participant metadata, votes, ticket queue, connection diagnostics and similar details about your room.',
  },
  {
    label: 'Optional Strudel music data',
    detail:
      'When music is enabled we store the generated Strudel code alongside the room.',
  },
  {
    label: 'No third parties by default',
    detail:
      'Traffic remains inside our Cloudflare zone unless you explicitly configure an integration.',
  },
];

const integrationOptions = [
  {
    name: 'Jira, Linear and GitHub (optional)',
    detail: `Moderators can link their external accounts to sync data to and from ${SITE_NAME}, tokens are only held as long as they are needed and are encrypted.`,
  },
  {
    name: 'Strudel music (optional)',
    detail:
      'We send generated Strudel prompt text only (no participant identifiers) to api.polychat.app to generate snippets.',
  },
];

const PrivacyPolicyScreen = () => {
  usePageMeta(META_CONFIGS.privacy);

  return (
    <PageSection maxWidth="xl">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="space-y-14 lg:space-y-16"
      >
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                Privacy policy
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                By using {SITE_NAME}, you agree to these terms. We keep things
                simple and focused on providing a great estimation tool.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-200 mt-6">
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                Updated {LAST_UPDATED}
              </div>
            </div>
          </div>
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {highlightCards.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white/70 p-5 text-center shadow-sm ring-1 ring-slate-100 dark:border-white/10 dark:bg-white/5 dark:ring-white/10"
                >
                  <Icon
                    className="h-6 w-6 text-slate-900 dark:text-white"
                    aria-hidden="true"
                  />
                  <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-center shadow-sm shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h2 className="flex items-center justify-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
                <Lock className="h-5 w-5" aria-hidden="true" />
                What lives in your browser
              </h2>
              <ul className="mt-4 space-y-3 text-center">
                {browserStorage.map(({ label, detail }) => (
                  <li
                    key={label}
                    className="rounded-2xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10"
                  >
                    <p className="font-medium">{label}</p>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      {detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 text-center shadow-sm shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h2 className="flex items-center justify-center gap-2 text-xl font-semibold text-slate-900 dark:text-white">
                <Database className="h-5 w-5" aria-hidden="true" />
                What the server keeps
              </h2>
              <ul className="mt-4 space-y-3 text-center">
                {serverStorage.map(({ label, detail }) => (
                  <li
                    key={label}
                    className="rounded-2xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10"
                  >
                    <p className="font-medium">{label}</p>
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      {detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 shadow-sm shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <div className="border-b border-white/10 px-6 py-5">
                <h2 className="text-xl font-semibold">Optional integrations</h2>
                <p className="mt-1 text-sm text-slate-300">
                  Nothing leaves our Cloudflare zone unless you configure these.
                </p>
              </div>
              <ul className="divide-y divide-white/10 text-sm">
                {integrationOptions.map(({ name, detail }) => (
                  <li key={name} className="px-6 py-4">
                    <p className="font-semibold text-white">{name}</p>
                    <p className="mt-1 text-slate-200">{detail}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:shadow-none">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                Privacy configuration for self-hosting
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Keep your Wrangler config aligned with the privacy posture your
                team expects before deploying.
              </p>
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-900 p-4 text-xs text-slate-100 shadow-sm dark:border-white/10">
                <pre className="whitespace-pre-wrap font-mono text-left">{`{
  "observability": {
    "enabled": true,
    "head_sampling_rate": 0,
    "logs": { "enabled": false, "head_sampling_rate": 0 }
  }
}`}</pre>
              </div>
              <p className="mt-3 rounded-2xl bg-slate-50/80 px-4 py-3 text-sm text-slate-700 ring-1 ring-slate-100 dark:bg-white/5 dark:text-slate-200 dark:ring-white/10">
                Adjust{' '}
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-800 dark:bg-white/10 dark:text-white">
                  wrangler.jsonc
                </code>{' '}
                before deploy if you require zero logging.
              </p>
              <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li>
                  Serve {SITE_NAME} behind your Cloudflare domain with TLS
                  enforced.
                </li>
                <li>
                  Align WAF and Workers rules with your privacy and residency
                  policies.
                </li>
              </ul>
            </div>
          </section>

          <Footer priorityLinksOnly={false} />
        </div>
      </motion.div>
    </PageSection>
  );
};

export default PrivacyPolicyScreen;
