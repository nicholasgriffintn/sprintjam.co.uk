## Disagreement is the point

When votes spread across the scale, it can feel like failure. It is not. Planning Poker is designed to surface different assumptions before a sprint starts. That saves you from surprises later.

A wide spread means someone sees hidden complexity, missing scope, or a dependency others missed. That is exactly the signal you want.

## Understanding vote spread

Not all spreads are equal. The pattern tells you what is going on:

| Spread                 | What it means            | Action                                     |
| ---------------------- | ------------------------ | ------------------------------------------ |
| Tight (3, 3, 5, 3)     | Shared understanding     | Accept the majority or average             |
| One step (5, 5, 8, 5)  | Minor disagreement       | Brief discussion, then accept either value |
| Two steps (3, 5, 8, 5) | Different assumptions    | Discuss, clarify, re-vote                  |
| Wide (3, 5, 13, 8)     | Fundamental misalignment | Deep discussion or split the story         |
| Bimodal (3, 3, 13, 13) | Two interpretations      | Clarify scope before proceeding            |

## The outlier discussion protocol

When votes diverge, hear from the outliers first. It keeps the discussion grounded.

1. **Identify the outliers** - "We have a 3 from Alex and a 13 from Jordan. Everyone else is 5 to 8."
2. **Low voter speaks** - "Alex, what are you seeing?" Example: "I assumed we can reuse the component."
3. **High voter speaks** - "Jordan, what is driving the 13?" Example: "That component does not support the new data model."
4. **Group discusses** - Now the real question is visible.
5. **Re-vote** - With shared context, votes usually converge.

Neither person was wrong. They were working from different assumptions.

## When to keep discussing vs move on

Not every disagreement needs a full debate. Use these heuristics.

### Keep discussing when:

- The spread is 3+ steps (3 vs 13, 5 vs 21)
- Votes are bimodal
- The story is high priority for this sprint
- The team has not worked in this area recently
- Someone says "Wait, are we including X?"

### Move on when:

- The spread is 1 to 2 adjacent values (5 vs 8)
- Discussion is circling without new information
- The story is low priority or far out
- You have hit the timebox
- {{SITE_NAME}}'s Judge suggests a value everyone accepts

## Using The Judge effectively

The Judge proposes a consensus value based on the distribution. It helps when:

- **Breaking ties** - Split between 5 and 8? The Judge suggests one.
- **Starting discussion** - "The Judge suggests 8. Strong objections?"
- **Ending debate** - If you cannot converge, accept it and move on.

It is a starting point, not an authority. Override it when the team has a good reason.

## Techniques for stubborn disagreement

1. **Split the story** - Separate backend from frontend, or break it into thin slices.
2. **Make assumptions explicit** - "Estimate assuming we can reuse the component."
3. **Default to the higher value** - When uncertain, the cautious estimate is safer.
4. **Take it offline** - A short spike can beat a long debate.
5. **Accept the uncertainty** - "We will learn once we start; call it an 8."

## Psychological safety matters

Consensus only works if people feel safe to disagree. Watch for these signs:

- **Anchoring to the first voice** - Estimates cluster around whoever speaks first.
- **Silent participants** - Some people never explain their votes.
- **Quick capitulation** - "Oh, you said 5? I guess I agree."
- **Seniority bias** - Junior developers defer to seniors.

### Building safety

- **Celebrate outliers** - "Good catch, I had not thought of that."
- **Ask quiet voices first** - Give them space before louder voices dominate.
- **Model vulnerability** - Leaders should admit when they do not know.
- **Separate estimate from identity** - Critique the estimate, not the person.

## The goal is shared understanding

Consensus does not mean everyone agrees. It means differences were aired and the team can move forward with a shared estimate. That is enough. The estimate will evolve as you learn more.
