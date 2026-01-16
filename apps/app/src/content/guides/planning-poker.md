## What is Planning Poker?

Planning Poker (also called Scrum Poker) is a team estimation technique. Everyone picks a card at the same time, then you talk about the spread and vote again. The goal is not a perfect number. It is a shared understanding before the sprint starts.

It was first described by James Grenning in 2002 and popularised by Mike Cohn in *Agile Estimating and Planning*. The format mixes expert opinion, comparison, and debate in a repeatable way.

## Why simultaneous voting matters

The point of the hidden vote is to avoid anchoring. When the most senior person says "this is a 3" first, the rest of the room drifts towards it. Hidden voting forces everyone to commit to their own view first.

A tight cluster means the team already sees the work similarly. A wide spread means someone knows something you do not. That is the useful part.

## How a session works

A typical round looks like this:

1. **Present the item** - The Product Owner or facilitator explains the story and acceptance criteria.
2. **Ask clarifying questions** - Make sure the team understands scope and constraints.
3. **Vote privately** - Everyone picks a card. In {{SITE_NAME}}, this is a single click.
4. **Reveal together** - Show all votes at once.
5. **Discuss outliers** - Highest and lowest voters explain their reasoning.
6. **Re-vote if needed** - Repeat until the team can move on.

## The psychology behind it

Planning Poker works because it leans on a few simple ideas:

- **Wisdom of crowds** - Independent estimates are often better than one expert guess.
- **Social accountability** - If you voted high or low, you will explain why.
- **Structured debate** - Differences are surfaced early, before work starts.
- **Relative sizing** - Comparing to a known story is easier than guessing hours.

## Common estimation scales

Most teams use a modified Fibonacci sequence: 0, 1, 2, 3, 5, 8, 13, 21. The gaps get larger because precision drops as work gets bigger. Debating 13 vs 21 is not the same as debating 1 vs 2.

Some teams add special cards:

- **?** - "I do not have enough information."
- **Infinity** - "This is too big; it needs splitting."
- **Break** - "I need a break."

## When to use Planning Poker

It works best during backlog refinement and sprint planning, especially for:

- New teams still calibrating velocity
- Stories with hidden dependencies
- Work that crosses disciplines
- Items where people have different assumptions

For highly repetitive work or mature teams with stable throughput, you may not need it every time.

## Tips for better sessions

- **Timebox discussion** - Set a limit, then move on.
- **Let quiet voices speak first** - It reduces seniority bias.
- **Use a reference story** - Agree what a "3" looks like.
- **Do not chase precision** - 5 vs 8 is often good enough.
- **Track velocity, not accuracy** - Estimation is for planning, not prediction.

## Planning Poker in {{SITE_NAME}}

{{SITE_NAME}} gives you real-time voting, instant reveals, and consensus suggestions via The Judge when votes diverge. For tricky items you can switch to Structured Voting to score complexity, confidence, volume, and unknowns.
