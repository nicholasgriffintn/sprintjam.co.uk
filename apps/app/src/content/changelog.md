## V2.3

- Added an in-room help panel with contextual guidance tied to voting state, including card meanings and structured voting notes.
- Added progressive onboarding hints in rooms with a single opt-in prompt for facilitation guidance.
- Added moderation prompts that surface facilitation tips when enabled.
- Added a new Complete Session modal that can be opened at the end of a session, this displays a summary of the session including the tickets that are still pending and the completed tickets with their assigned story points.
  - A save button displays here so that users can save the session data to their workspace for future reference. (In the future, once workspaces are out of beta, this will just happen when you complete a session, rather than requiring two actions).
- Updated the workspaces interface to display insights once multiple sessions are completed in a team and hooked up completed status tracking.
- Created a new stats recording service that will keep a log of how voting rounds went in your rooms. This will be used to provide insights into your sessions and a history of how your team has been estimating over time in the future.
- Added new guides for running sprint planning sessions with InnerSource principles as well as guides on how to use SprintJam effectively.
- Made structured voting compatible with extra voting options.
- Updated the judge to consider extra votes.
- Adjusted the structured voting UI slightly

## V2.2

- Improved the rendering of the header and the layout so that it adapts better between navigation for a more unified experience.
- Added animations to the header elements for a smoother experience.
- Removed the back to home button on some pages to reduce clutter, favouring the logo as a home link.
- Added a new user menu to the header for easier access to login, workspaces and logout actions.
- Fixed some issues with light mode styles (although dark mode remains the primary focus).

## V2.1

- Added a new FAQ page to help answer questions about SprintJam and to provide some guidance on how to conduct sprint planning sessions effectively.
- Added new integrations pages to describe the available integrations with Jira, Linear and GitHub Issues.

## V2

- Migrated to a new monorepo structure that isolates utilities, libraries, and components into separate packages for better maintainability and scalability. This includes a set of new workers that are linked together through the main app with Cloudflare Service Bindings.
- Added a new authentication worker that handles signing in as a user with codes that will be sent via an email. This also includes managing user sessions and storing user preferences.
- Created a new Workspaces feature that allows for users to create their own workspace, create teams within that workspace and save their rooms to a team for easy access later.
  - Note: Workspaces are currently in beta, they are also designed to work without requiring any invites. Users who share the same email domain will be automatically added to the same workspace.
  - Only pre-approved domains will also be allowed to create Workspaces, this is to prevent abuse while we test the feature.
- Fixed some issues with the handling of tokens that caused the room to load with an error.

## V1.7

- Added a new spectator mode so that users can join a room and view the voting without participating. This is useful for stakeholders or observers who want to see the voting process without influencing it
- Updated the database to add an `is_spectator` field to the participants table to track which users are spectators, this might cause issues with existing rooms so please let us know if you encounter any problems

## V1.6

This release brings in a number of new features for queueing tickets and pointing against those tickets directly from SprintJam. This is currently in beta but it ready for you to check out if you'd like to.

- Defaulted the setting to show the new ticket queuing system for new rooms
- Extended the backend services to support importing tickets and searching for them from the already configured providers: Jira, Linear and GitHub Issues
- Added the ability to list tickets from various boards and sprints
- Updated the user interface to make use of the new backend services and made it easier to import tickets

We hope you enjoy using the new ticket queuing system and we look forward to your feedback!

## V1.5

A number of enhancements have been made in this version to improve the user experience and add new features that expand the capabilities of SprintJam and making it easier to use.

- Improved the results hidden state display so it's clear what to do next and is based on the individual's votes not the room's.
- Improved the create room flow. Now it's just a two step process. You can either create an instant room with the default settings or you can use the advanced settings to configure the room as you want before you create it. After creating, you'll just need to select your avatar and then you're ready to go.
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

(Note: we skipped V1-V1.5 on production, previous versions tested on staging first and we're now deploying as one update)

## V1

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
