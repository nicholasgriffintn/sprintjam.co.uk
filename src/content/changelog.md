## 2025

### Coming Next

- Added a new Feedback button to the footer for users to submit their feedback directly from the app. This feedback is filed as issues in a GitHub repository for easy tracking and management.
- Added a setting to restrict voting updates after the votes have been revealed and defaulted to enabled for new rooms
- Added a setting to auto reveal the votes once all participants have voted
- Added a setting to have votes always revealed to all users
- Added new voting option presets:
  - Fibonacci - Classic sequence for broader estimation ranges
  - Fibonacci short - A shorter version of the Fibonacci sequence, the default preset
  - Doubling - For fast-growing complexity
  - T-shirt sizes - Simple relative sizing'
  - Planet sizes - Fun relative sizing based on planet sizes
  - Yes / No - Binary go/no-go decisions
  - Simple - Straight 1-8 scale
  - Hours - Time-based estimates
  - Custom - Define your own voting options
- Added new extra voting options that are always available:
  - Unknown ❓
  - Coffee break ☕
  - Cannot complete ♾️

### December 2025

- Added this changelog page to document changes
- Some codebase refactoring and improvements
- Various security improvements
- Made a number of fixes for the linear service integration
- Integrated GitHub Issues into the ticket queueing system, allowing tickets to be pulled directly from GitHub Issues into SprintJam rooms using OAuth connections. This is currently in beta and being tested
- Made some minor enhancements to the Privacy Policy page
- Improved the security of stored oauth tokens and passcodes
- Improved API performance by not waiting for as long
- Converted the codebase to use Drizzle instead of directly using the Cloudflare SQL API

### November 2025

- Minor wording changes and style fixes
- Improved the size of the frontend build to improve performance
- Added the ability to pick an emoji avatar rather than a fixed icon
- In beta: Added a background music player with automatically curated music from AI, generated with the Strudel live coding language
- Improved the display of the settings modal
- Fixed an issue with the connection status not displaying correctly
- Refactored the frontend and backend code to be easier to maintain
- Improved the chunking of the frontend packages to improve load times
- Migrated Durable Objects to use the SQL API rather than KV
- Fixed an issue that caused white flashes
- Fixed an issue where votes and mod assignment could be handled incorrectly
- Improved our e2e and a11y testing
- Inverted the confidence setting for structured voting to be clearer
- In beta: Started work to implement a new ticket queue system for managing tickets and assigning story points directly to them from SprintJam.
- Improved the colour contrast across the app to improve accessibility
- Hardened security across the app to improve safety
- Improved performance of the Strudel player by preventing it from loading before it played.
- Added volume controls to the Strudel player
- Implemented ticket syncing with Jira, allowing tickets to be pulled directly from Jira into SprintJam rooms using OAuth connections. This is currently in beta and being tested
- Also added ticket syncing with Linear using a similar system
- Moved more APIs to be requested via React Query for better caching and performance
- Added a session token to improve security of API requests
- Added SEO metadata
- Added privacy policy and terms and conditions pages with a link in the footer
- Improved a11y
- Improved the loading performance of the frontend by changing how we lazy load items
- Fully implemented the timer so that it now syncs correctly across clients. Also added quick presets for the timer and an audio notification when the timer ends
- Improved how the judge displays recommendations

### October 2025

- Improved performance by integrating Tanstack libraries for calling APIs.
- Refactored the codebase to source all settings from the backend ensuring that settings remain in sync across clients.
- Added some observability at the HTTP request level to help diagnose issues.
- Adjusted the structured voting algorithm to improve the way criteria are weighted.
- Added support for passcode protected rooms.
- Improved the documentation in the repo
- Improved the the design across the board to be more consistent.
- Added a dark mode
- Added a favicon
- Improved the header
- Added the ability to set an avatar for participants, this can be chosen when a user creates or joins a room.

### September 2025

- Made the settings modal scroll
- Improved the display of results to provide more detail include the top votes and a better distribution chart.
- Added the option to use structured voting, a method of voting with multiple criteria rather than a single score. This criteria is then transformed into a single score using a weighted algorithm.

### May 2025

- Some minor style updates
- Added a judge algorithm that can be enabled in rooms to automatically calculate the story point that should be applied depending on the votes from the room participants. Alongside this, the judge will provided recommendations based on the spread of user votes, recommending dicussion if there is a wide spread of votes.
- Fixed some issues with the display of participants on mobile and other issues.
- Added some animations.
- Started hacking around with integrating Jira syncing.

### April 2025

- SprintJam was first designed on a train back from Manchester, I was traveling back from team sessions that used third party sprint planning software and I was fed up. With the help of AI, I built sprint jam over the next few weeks.
- The initial launch was already a Cloudflare Worker that used Durable Objects to sync votes and settings across clients. The software also had to ability to configure and share rooms.
