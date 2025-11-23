import { useEffect } from 'react';
import { useTeamsContext, useTeamsUsername } from '@/hooks/useTeamsContext';
import { useSession } from '@/context/SessionContext';

/**
 * Personal tab home screen for SprintJam in Teams
 * Shows quick actions for creating/joining rooms
 */
export default function TeamsHomeScreen() {
  const teamsContext = useTeamsContext();
  const teamsUsername = useTeamsUsername();
  const { setName, startCreateFlow, startJoinFlow } = useSession();

  // Set user name from Teams context
  useEffect(() => {
    if (teamsUsername) {
      setName(teamsUsername);
    }
  }, [teamsUsername, setName]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-slate-900 dark:text-white">
            Welcome to SprintJam
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400">
            Collaborative Planning Poker for Agile Teams
          </p>
          {teamsContext.user?.displayName && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">
              Signed in as {teamsContext.user.displayName}
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-12 grid gap-6 md:grid-cols-2">
          <button
            onClick={startCreateFlow}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 p-8 text-left shadow-lg transition-transform hover:scale-[1.02] hover:shadow-xl"
          >
            <div className="absolute right-0 top-0 h-40 w-40 translate-x-8 -translate-y-8 rounded-full bg-white/10" />
            <div className="relative">
              <div className="mb-4 inline-flex rounded-lg bg-white/20 p-3">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">
                Create Room
              </h3>
              <p className="text-blue-100">
                Start a new planning poker session and invite your team
              </p>
            </div>
          </button>

          <button
            onClick={startJoinFlow}
            className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 p-8 text-left shadow-lg transition-transform hover:scale-[1.02] hover:shadow-xl dark:from-slate-600 dark:to-slate-700"
          >
            <div className="absolute right-0 top-0 h-40 w-40 translate-x-8 -translate-y-8 rounded-full bg-white/10" />
            <div className="relative">
              <div className="mb-4 inline-flex rounded-lg bg-white/20 p-3">
                <svg
                  className="h-6 w-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-2xl font-bold text-white">Join Room</h3>
              <p className="text-slate-200">
                Enter a room key to join an existing session
              </p>
            </div>
          </button>
        </div>

        {/* Features */}
        <div className="rounded-xl bg-white p-8 shadow-sm dark:bg-slate-800">
          <h2 className="mb-6 text-xl font-bold text-slate-900 dark:text-white">
            Features
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <svg
                  className="h-5 w-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  Real-time Voting
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Live updates as team members cast their votes
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <svg
                  className="h-5 w-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  Smart Consensus
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  AI-powered judge recommends final estimates
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <svg
                  className="h-5 w-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  Jira & Linear Integration
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Auto-update story points in your project management tools
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
                <svg
                  className="h-5 w-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  Privacy-Focused
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No ads, no tracking, open source
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          <p>
            Learn more at{' '}
            <a
              href="https://sprintjam.co.uk"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              sprintjam.co.uk
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
