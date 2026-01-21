import type { ReactNode } from 'react';
import { Compass, Link2, Sparkles } from 'lucide-react';

import { SITE_NAME } from '@/constants';

export type FAQItem = {
  question: string;
  answer: ReactNode;
  plainText: string;
};

export const quickStart = [
  {
    title: 'Kick off a room in seconds',
    description: `Open ${SITE_NAME}, type a room key or generate one instantly, and pick Classic or Structured voting before anyone joins.`,
    icon: Compass,
  },
  {
    title: 'Share the invite however you like',
    description:
      'Copy the room link, display the QR code, or just read the room key aloud. Add a passcode if you want extra control.',
    icon: Link2,
  },
  {
    title: 'Guide the reveal and decision',
    description:
      'Reveal together, see the spread, then let The Judge recommend a consensus when votes differ.',
    icon: Sparkles,
  },
];

export const basicsFaqs: FAQItem[] = [
  {
    question: 'What is Planning Poker and why does it work?',
    answer: (
      <>
        <p>
          Planning Poker (also called Scrum Poker or Pointing Poker) is a
          consensus-driven way for teams to size work. Everyone votes at the
          same time, which cuts anchoring bias and surfaces different
          assumptions before a sprint begins.
        </p>
        <p>
          It keeps estimates relative instead of time-based, so the team
          calibrates around effort, risk, and uncertainty rather than a specific
          hour count.
        </p>
      </>
    ),
    plainText:
      'Planning Poker (also called Scrum Poker or Pointing Poker) is a consensus-driven way for teams to size work. Everyone votes at the same time, which cuts anchoring bias and surfaces different assumptions before a sprint begins. It keeps estimates relative instead of time-based, so the team calibrates around effort, risk, and uncertainty rather than a specific hour count.',
  },
  {
    question: 'Who is in the room?',
    answer: (
      <>
        <p>
          The delivery team votes (devs, QA, design, anyone doing the work).
          Product Owners clarify scope and priority but do not set the number.
          Scrum Masters facilitate, keep timeboxes, and guard against pressure
          for optimistic estimates.
        </p>
      </>
    ),
    plainText:
      'The delivery team votes (devs, QA, design, anyone doing the work). Product Owners clarify scope and priority but do not set the number. Scrum Masters facilitate, keep timeboxes, and guard against pressure for optimistic estimates.',
  },
  {
    question: 'How do we run a round?',
    answer: (
      <>
        <ol className="list-decimal list-inside space-y-1">
          <li>Present the story and acceptance criteria.</li>
          <li>Everyone votes privately.</li>
          <li>Reveal together to avoid anchoring.</li>
          <li>Let the high and low explain their thinking.</li>
          <li>Revote after clarifications until you have a consensus size.</li>
        </ol>
      </>
    ),
    plainText:
      '1. Present the story and acceptance criteria. 2. Everyone votes privately. 3. Reveal together to avoid anchoring. 4. Let the high and low explain their thinking. 5. Revote after clarifications until you have a consensus size.',
  },
];

export const sprintjamFaqs: FAQItem[] = [
  {
    question: `How do I start a ${SITE_NAME} session fast?`,
    answer: (
      <>
        <p>
          Use the home page for a one-click room, or open the Create flow if you
          want to set a passcode or switch voting styles before anyone joins.
        </p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Enter your name.</li>
          <li>Choose Classic (Fibonacci cards) or Structured voting.</li>
          <li>Share the link or key - no accounts required for guests.</li>
        </ol>
      </>
    ),
    plainText: `Use the home page for a one-click room, or open the Create flow if you want to set a passcode or switch voting styles before anyone joins. 1. Enter your name. 2. Choose Classic (Fibonacci cards) or Structured voting. 3. Share the link or key - no accounts required for guests.`,
  },
  {
    question: 'Do teammates need accounts?',
    answer: (
      <>
        <p>
          Guests can join and vote without signing in. Logging in unlocks
          workspace features, lets moderators keep provider connections, and
          makes it easier to revisit recent rooms.
        </p>
      </>
    ),
    plainText:
      'Guests can join and vote without signing in. Logging in unlocks workspace features, lets moderators keep provider connections, and makes it easier to revisit recent rooms.',
  },
  {
    question: "What's the best way to invite people?",
    answer: (
      <>
        <p>
          Inside any room you can copy the invite link, surface a QR code for
          quick scans, or just share the room key. Add a passcode if you need to
          keep the room private to invited teammates.
        </p>
      </>
    ),
    plainText:
      'Inside any room you can copy the invite link, surface a QR code for quick scans, or just share the room key. Add a passcode if you need to keep the room private to invited teammates.',
  },
  {
    question: 'Which estimation modes are available?',
    answer: (
      <>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>Classic Planning Poker</strong>: Fibonacci-inspired values
            (plus "?") for quick sizing.
          </li>
          <li>
            <strong>Structured Voting</strong>: score Complexity (35%),
            Confidence (25%), Volume (25%), and Unknowns (15%) with automatic
            weighted results.
          </li>
        </ul>
        <p>
          Moderators can swap modes between items if a story needs more nuance.
        </p>
      </>
    ),
    plainText:
      'Classic Planning Poker: Fibonacci-inspired values (plus ?) for quick sizing. Structured Voting: score Complexity (35%), Confidence (25%), Volume (25%), and Unknowns (15%) with automatic weighted results. Moderators can swap modes between items if a story needs more nuance.',
  },
  {
    question: `How does ${SITE_NAME} handle reveals and disagreements?`,
    answer: (
      <>
        <p>
          Votes stay hidden until you reveal. If the spread is wide, The Judge
          proposes a consensus score so you can decide to lock it in or re-vote.
          When people converge, reveal and keep moving.
        </p>
      </>
    ),
    plainText: `Votes stay hidden until you reveal. If the spread is wide, The Judge proposes a consensus score so you can decide to lock it in or re-vote. When people converge, reveal and keep moving.`,
  },
  {
    question: 'Can I pull work from Jira, Linear, or GitHub?',
    answer: (
      <>
        <p>
          Yes. Sign in, connect the provider for your room, and import issues to
          estimate. Story point results can be synced back, and tokens stay
          scoped to the room connection.
        </p>
      </>
    ),
    plainText:
      'Yes. Sign in, connect the provider for your room, and import issues to estimate. Story point results can be synced back, and tokens stay scoped to the room connection.',
  },
];

export const scrumFaqs: FAQItem[] = [
  {
    question: 'When should we run estimation?',
    answer: (
      <>
        <p>
          Keep estimation lightweight by doing it during backlog refinement or
          just ahead of sprint planning. Arrive with clear acceptance criteria
          so the team can focus on sizing, not discovery.
        </p>
      </>
    ),
    plainText:
      'Keep estimation lightweight by doing it during backlog refinement or just ahead of sprint planning. Arrive with clear acceptance criteria so the team can focus on sizing, not discovery.',
  },
  {
    question: 'How do story points relate to hours?',
    answer: (
      <>
        <p>
          Points are a relative measure, not a time guarantee. Track your
          velocity for a few sprints to see how many points you typically finish
          in two weeks, then plan capacity from that trend, not a fixed
          hours-to-points conversion.
        </p>
      </>
    ),
    plainText:
      'Points are a relative measure, not a time guarantee. Track your velocity for a few sprints to see how many points you typically finish in two weeks, then plan capacity from that trend, not a fixed hours-to-points conversion.',
  },
  {
    question: 'Which scale should we start with?',
    answer: (
      <>
        <p>
          Fibonacci cards work well for most teams because gaps widen as work
          grows. Use "?" for unclear stories, or switch to Structured voting
          when you need to weigh complexity versus uncertainty explicitly.
        </p>
      </>
    ),
    plainText:
      'Fibonacci cards work well for most teams because gaps widen as work grows. Use ? for unclear stories, or switch to Structured voting when you need to weigh complexity versus uncertainty explicitly.',
  },
  {
    question: 'How do we keep discussions focused?',
    answer: (
      <>
        <ul className="list-disc list-inside space-y-1">
          <li>Timebox the conversation and capture follow-up tasks.</li>
          <li>
            Ask the highest and lowest voters to share their reasoning first.
          </li>
          <li>
            Re-vote quickly after clarifications instead of chasing perfect
            precision.
          </li>
        </ul>
      </>
    ),
    plainText:
      'Timebox the conversation and capture follow-up tasks. Ask the highest and lowest voters to share their reasoning first. Re-vote quickly after clarifications instead of chasing perfect precision.',
  },
  {
    question: 'What should we do when votes stay far apart?',
    answer: (
      <>
        <p>
          Check scope first - did assumptions change between voters? If yes,
          trim or split the story. If not, use The Judge's suggested consensus
          as a starting point, or run a second reveal after agreeing on
          constraints.
        </p>
      </>
    ),
    plainText:
      "Check scope first - did assumptions change between voters? If yes, trim or split the story. If not, use The Judge's suggested consensus as a starting point, or run a second reveal after agreeing on constraints.",
  },
];

export const cardsFaqs: FAQItem[] = [
  {
    question: `Why does ${SITE_NAME} use Fibonacci-style cards?`,
    answer: (
      <>
        <p>
          Gaps grow as the numbers increase, which acknowledges higher
          uncertainty on larger work. When votes land far apart, it is a prompt
          to discuss scope or complexity instead of chasing false precision.
        </p>
      </>
    ),
    plainText: `Gaps grow as the numbers increase, which acknowledges higher uncertainty on larger work. When votes land far apart, it is a prompt to discuss scope or complexity instead of chasing false precision.`,
  },
  {
    question: 'What do special cards mean?',
    answer: (
      <>
        <ul className="list-disc list-inside space-y-1">
          <li>
            <strong>0</strong>: essentially no effort or already done.
          </li>
          <li>
            <strong>?</strong>: not enough clarity to size - discuss or split
            first.
          </li>
          <li>
            <strong>Break</strong>: step back and reset if the team is stuck.
          </li>
        </ul>
      </>
    ),
    plainText:
      '0: essentially no effort or already done. ?: not enough clarity to size - discuss or split first. Break: step back and reset if the team is stuck.',
  },
  {
    question: 'Should we convert points to hours?',
    answer: (
      <>
        <p>
          Avoid it. Points are relative; velocity over a few sprints will tell
          you how many points you usually finish. Converting to hours invites
          false accuracy and undermines the benefits of relative sizing.
        </p>
      </>
    ),
    plainText:
      'Avoid it. Points are relative; velocity over a few sprints will tell you how many points you usually finish. Converting to hours invites false accuracy and undermines the benefits of relative sizing.',
  },
];

export const facilitationFaqs: FAQItem[] = [
  {
    question: 'How long should a session take?',
    answer: (
      <>
        <p>
          Keep it timeboxed. Backlog grooming rounds often run 30-60 minutes,
          while full sprint planning might take 1-2 hours depending on the
          backlog size. If energy drops, pause and resume later.
        </p>
      </>
    ),
    plainText:
      'Keep it timeboxed. Backlog grooming rounds often run 30-60 minutes, while full sprint planning might take 1-2 hours depending on the backlog size. If energy drops, pause and resume later.',
  },
  {
    question: 'What if votes are far apart?',
    answer: (
      <>
        <p>
          Ask the highest and lowest voters to explain their reasoning. Clarify
          scope, risks, or hidden work, then vote again. If disagreement stays
          high, split the story or capture follow-ups before committing.
        </p>
      </>
    ),
    plainText:
      'Ask the highest and lowest voters to explain their reasoning. Clarify scope, risks, or hidden work, then vote again. If disagreement stays high, split the story or capture follow-ups before committing.',
  },
  {
    question: 'How do we keep everyone engaged?',
    answer: (
      <>
        <ul className="list-disc list-inside space-y-1">
          <li>Rotate who kicks off summaries to avoid the same voices.</li>
          <li>
            Use short timeboxes per item and capture tangents as follow-ups.
          </li>
          <li>
            Encourage quieter members first when explaining high/low votes.
          </li>
        </ul>
      </>
    ),
    plainText:
      'Rotate who kicks off summaries to avoid the same voices. Use short timeboxes per item and capture tangents as follow-ups. Encourage quieter members first when explaining high/low votes.',
  },
  {
    question: 'When is Planning Poker a bad fit?',
    answer: (
      <>
        <p>
          If work is highly repetitive, continuously flowing, or already
          well-benchmarked, formal rounds may add overhead. Use lighter
          techniques (like T-shirt sizing) or rely on historical cycle time
          instead.
        </p>
      </>
    ),
    plainText:
      'If work is highly repetitive, continuously flowing, or already well-benchmarked, formal rounds may add overhead. Use lighter techniques (like T-shirt sizing) or rely on historical cycle time instead.',
  },
];

export const alternativesFaqs: FAQItem[] = [
  {
    question: 'What are quick alternatives to Planning Poker?',
    answer: (
      <>
        <p>
          Try T-shirt sizing for rapid grouping, affinity/bucket estimation for
          sorting a big backlog, or a Wideband Delphi style when you need
          anonymous rounds. {SITE_NAME}'s Structured voting is great when you
          want to weigh confidence and unknowns explicitly.
        </p>
      </>
    ),
    plainText: `Try T-shirt sizing for rapid grouping, affinity/bucket estimation for sorting a big backlog, or a Wideband Delphi style when you need anonymous rounds. ${SITE_NAME}'s Structured voting is great when you want to weigh confidence and unknowns explicitly.`,
  },
  {
    question: 'When should we switch techniques?',
    answer: (
      <>
        <p>
          Use Planning Poker when a story needs shared understanding. Use
          T-shirt sizing early in discovery, then switch to cards as items get
          closer to ready. For distributed teams with async needs, collect votes
          ahead of the meeting and reveal together.
        </p>
      </>
    ),
    plainText:
      'Use Planning Poker when a story needs shared understanding. Use T-shirt sizing early in discovery, then switch to cards as items get closer to ready. For distributed teams with async needs, collect votes ahead of the meeting and reveal together.',
  },
];

export const allFaqs = [
  ...basicsFaqs,
  ...sprintjamFaqs,
  ...scrumFaqs,
  ...cardsFaqs,
  ...facilitationFaqs,
  ...alternativesFaqs,
];
