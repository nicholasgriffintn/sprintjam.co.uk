## Why Fibonacci?

The Fibonacci sequence (1, 2, 3, 5, 8, 13, 21, 34...) is the default scale for agile estimation. Each number is roughly the sum of the two before it, so the gaps get larger as the numbers grow. That mirrors how estimation actually works: the bigger the work, the fuzzier the difference.

For small tasks, you can tell the difference between one hour and two. For larger work, arguing about 13 vs 15 points is just noise. The gaps force you to make meaningful choices.

## The problem with linear scales

Linear scales (1 to 10) create two problems:

- **False precision** - A 20-minute debate about 6 vs 7 adds no real value.
- **Hours by the back door** - Linear scales invite time conversion, which defeats relative sizing.

Fibonacci keeps the focus on "small, medium, large" rather than fake accuracy.

## The modified Fibonacci scale

Most teams use a modified sequence rather than pure Fibonacci:

| Card | Typical meaning |
| --- | --- |
| **0** | Trivial or already done. No effort needed. |
| **1** | Smallest meaningful unit of work. |
| **2** | Small task, well understood. |
| **3** | Moderate complexity, few unknowns. |
| **5** | Medium effort, some complexity. |
| **8** | Large story, likely needs decomposition. |
| **13** | Very large, significant unknowns. |
| **21** | Epic-sized. Should almost certainly be split. |

Notice there is no "4". That is deliberate. It forces a choice between "small" and "medium" and keeps the scale clean.

## Establishing a baseline

Numbers are meaningless without a reference story. Before your first session, agree on a mid-range example:

> "Remember when we added the password reset flow? That was a 3. Compare everything to that."

A good reference story is:

- Recent enough that everyone remembers it
- Representative of typical work
- Mid-range on your scale (3 or 5 works well)
- Completed without surprises

Over time, you build a shared library of references. "This feels like the auth refactor (8)" becomes quick shorthand.

## When votes cluster on boundaries

If your team regularly splits between adjacent values (5 vs 8, 8 vs 13), try this:

- **Accept the ambiguity** - Pick one and move on.
- **Ask the threshold question** - "What would make this an 8?" If that is likely, go higher.
- **Split the story** - If you cannot agree, the story is probably too big.

The real warning sign is a spread of two steps or more. That means the team sees different realities.

## Alternatives to Fibonacci

Other scales work in different contexts:

- **T-shirt sizes (XS, S, M, L, XL)** - Useful for early roadmapping, weaker for velocity.
- **Powers of 2 (1, 2, 4, 8, 16)** - Even bigger gaps, some teams prefer the clarity.
- **Linear (1 to 5)** - Works for very uniform work.
- **No estimates** - Track throughput instead of points when sizing is stable.

## Explore other card decks

If you want a different feel or level of precision, try:

- [Fibonacci short scale](/guides/fibonacci-short)
- [Doubling scale cards](/guides/doubling-scale)
- [T-shirt sizing cards](/guides/tshirt-sizing)
- [Planet scale cards](/guides/planet-scale)
- [Yes/No cards](/guides/yes-no)
- [Simple 1-8 cards](/guides/simple-scale)
- [Hours cards](/guides/hours-estimates)

## Common mistakes

- **Converting to hours** - "A 3 is six hours" kills the benefits.
- **Using huge numbers** - If you often use 21 or 34, split the work first.
- **Arguing about small gaps** - Timebox and move on.
- **Changing the scale mid-project** - Velocity becomes meaningless.

## The bottom line

Fibonacci works because it respects uncertainty. Small differences matter when the work is small. Large differences blur when the work is large. Pick a reference story, use the scale consistently, and let velocity do the rest.
