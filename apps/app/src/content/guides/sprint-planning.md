## Where estimation fits in Scrum

Estimation is not a standalone activity. It is spread across the Scrum cycle. When you put estimation in the right place, sprint planning gets much lighter.

### Backlog refinement (grooming)

Most estimation should happen here, not in sprint planning. Refinement is when you:

- Break epics into stories
- Clarify acceptance criteria
- Identify dependencies
- Estimate stories likely to land in upcoming sprints

Aim to keep 1 to 2 sprints worth of refined, estimated work ready at all times.

### Sprint planning

With a refined backlog, sprint planning is straightforward:

1. Review the sprint goal
2. Select stories up to capacity
3. Sanity check estimates
4. Break stories into tasks (optional)

If you are doing heavy estimation during planning, your refinement process needs work.

## Preparing your backlog

Good estimation starts with good stories. Before refinement:

- **Write clear acceptance criteria** - "As a user, I can reset my password" beats "Password reset."
- **Attach context** - Designs, technical notes, and links to related work.
- **Pre-answer obvious questions** - If you know the team will ask, add it to the ticket.
- **Split oversized stories** - Anything that feels like a 13+ should be broken down first.

## Balancing refinement and planning

Keep the ceremonies distinct:

| Refinement                  | Sprint planning               |
| --------------------------- | ----------------------------- |
| Focus on understanding      | Focus on commitment           |
| Estimate new stories        | Select from estimated stories |
| Weeks ahead                 | This sprint                   |
| Deep discussion is fine     | Keep it tight                 |
| PO presents, team estimates | Team commits, PO confirms     |

A common pattern is a weekly one-hour refinement and a one-hour planning session at the start of each sprint. Adjust to your cadence.

## Capacity planning

Velocity tells you what you typically finish, but every sprint is different:

- **Account for absences** - Holidays, sick leave, conferences.
- **Factor in known disruptions** - Releases, on-call rotations, company events.
- **Leave buffer for unplanned work** - Bugs and urgent requests happen.

If your velocity is 25 points and you have a major deploy mid-sprint, plan for 18 to 20 points, not 25.

## Commitment vs forecast

Be explicit about how your team treats sprint scope:

### Hard commitment

- Team commits to completing selected stories
- Scope changes are exceptional
- Good for teams that need predictability
- Risk: pressure to cut corners when behind

### Forecast

- Team forecasts what they expect to finish
- Scope can flex as discoveries happen
- Good for uncertain domains
- Risk: can feel loose without discipline

Most teams land somewhere in between.

## Re-estimation during planning

Stories were estimated in refinement. Do you re-estimate in planning?

- **Quick sanity check** - "This was a 5 last week. Still true?"
- **Re-estimate if context changed** - New information or scope shifts.
- **Do not re-estimate everything** - Trust your earlier work.

## When estimates are wrong

They will be. What matters is how you respond:

- **Track actuals** - Learn how points map to real work.
- **Retrospect on big misses** - If a 3 became a 13, ask why.
- **Do not re-estimate mid-sprint** - Velocity will reflect reality.
- **Adjust capacity, not estimates** - Plan fewer points if you are consistently over-committing.

## Anti-patterns to avoid

- **Estimating during planning** - Move it to refinement.
- **Padding estimates** - "I think it is a 5 but I will say 8." Avoid it.
- **Negotiating estimates down** - Estimates reflect reality, not wishes.
- **Ignoring velocity** - Committing to 35 points with a 25-point velocity is a setup for failure.
- **No buffer** - It leaves no room for reality.

## A typical sprint planning flow

1. **Review sprint goal (5 min)** - What are we trying to achieve?
2. **Check capacity (5 min)** - Absences, disruptions, buffer.
3. **Select stories (20 min)** - Pull from the refined backlog.
4. **Sanity check estimates (10 min)** - Confirm nothing has changed.
5. **Task breakdown (optional, 20 min)** - Break stories into tasks if you do this.
6. **Confirm commitment (5 min)** - "Are we confident we can finish this scope?"

Total: about one hour. If it runs longer, you are likely doing refinement during planning.
