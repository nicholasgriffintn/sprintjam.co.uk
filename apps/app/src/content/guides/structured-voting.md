## Beyond single-number estimates

Classic Planning Poker gives you one number. Sometimes that hides important nuance. A "5" could mean:

- Simple but lots of work (high volume, low complexity)
- Small but tricky (low volume, high complexity)
- Unknown scope (we are guessing)
- Well understood but risky (we know what to do but it might break things)

Structured Voting splits those dimensions so you can see what is really driving the estimate.

## How Structured Voting works in {{SITE_NAME}}

Instead of one card, each person scores four dimensions:

| Dimension      | Weight | What it measures                                                  |
| -------------- | ------ | ----------------------------------------------------------------- |
| **Complexity** | 35%    | How hard is the problem? Algorithms, integration, technical debt. |
| **Confidence** | 25%    | How clear is the approach? Requirements vs vague goals.           |
| **Volume**     | 25%    | How much work is there? Number of components, tests, touchpoints. |
| **Unknowns**   | 15%    | External dependencies, new tech, unclear contracts.               |

Each dimension is scored 1 to 5. {{SITE_NAME}} calculates a weighted composite score that maps to your story point scale.

## When to use Structured Voting

Classic Planning Poker works for most stories. Use Structured Voting when:

- **Votes keep splitting** - The team disagrees on why the work is big.
- **Risk matters** - You want uncertainty on the record.
- **New team members** - It makes the factors explicit.
- **Complex technical work** - Multiple systems or integrations.
- **Stakeholder visibility** - The breakdown adds context.

## The four dimensions explained

### Complexity (35%)

Complexity is difficulty, independent of raw effort.

| Score             | Meaning                                     |
| ----------------- | ------------------------------------------- |
| **1 - Trivial**   | Copy/paste, config change, familiar pattern |
| **2 - Low**       | Standard CRUD, clear path                   |
| **3 - Moderate**  | Edge cases, multiple components             |
| **4 - High**      | Algorithmic challenge, significant refactor |
| **5 - Very high** | Novel problem, architectural decisions      |

### Confidence (25%)

Confidence is how sure you are about the approach. Low confidence adds risk.

| Score             | Meaning                               |
| ----------------- | ------------------------------------- |
| **1 - Very low**  | Vague requirements, guessing at scope |
| **2 - Low**       | General direction, unclear details    |
| **3 - Moderate**  | Good understanding, some questions    |
| **4 - High**      | Clear requirements, known approach    |
| **5 - Very high** | We have done this before              |

Note: confidence is inverted for scoring. Low confidence contributes more to the total.

### Volume (25%)

Volume is the raw amount of work, regardless of difficulty.

| Score              | Meaning                                |
| ------------------ | -------------------------------------- |
| **1 - Minimal**    | Single file, quick change              |
| **2 - Small**      | A few files, one component             |
| **3 - Medium**     | Multiple components, integration tests |
| **4 - Large**      | Significant codebase changes           |
| **5 - Very large** | Major feature, cross-team coordination |

### Unknowns (15%)

Unknowns capture external risk and dependencies.

| Score         | Meaning                           |
| ------------- | --------------------------------- |
| **1 - None**  | Fully within team control         |
| **2 - Few**   | Minor external touchpoints        |
| **3 - Some**  | Depends on other teams or APIs    |
| **4 - Many**  | Significant external dependencies |
| **5 - Major** | Blocked by unknowns               |

## Interpreting the results

After voting, {{SITE_NAME}} shows the composite score and the breakdown. Look for patterns:

- **High complexity, low volume** - Small but tricky. Might need a spike.
- **Low complexity, high volume** - Grind work. Consider parallelising.
- **Low confidence** - Story needs refinement.
- **High unknowns** - External risk. Get commitments early.
- **All dimensions high** - Story is too big. Split it.

## Mixing modes

You do not have to use Structured Voting for everything. A common pattern:

- **Classic for routine stories** - Quick and familiar.
- **Structured for complex or uncertain stories** - When you need the extra insight.

In {{SITE_NAME}}, moderators can switch modes between stories. Start with Classic, switch to Structured when votes diverge or the story feels murky.

## Common mistakes

- **Overusing Structured Voting** - It adds overhead. Use it selectively.
- **Ignoring the breakdown** - The dimensions are more useful than the total.
- **Treating dimensions as independent** - They often move together.
- **Gaming the weights** - Estimate honestly; do not bias the score.

## The bottom line

Structured Voting is for when a single number is not enough. It shows _why_ the work feels big, so the team can address the real risk instead of arguing over a point value.
