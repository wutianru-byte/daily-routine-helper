# CLAUDE.md

This document defines how Claude should work in the Daily Routine Helper project.

The goal is to keep development aligned with the product vision, architecture, and roadmap, while avoiding unnecessary implementation drift.

---

## 1. Read before acting

Before writing any code, always read and understand:

- `01_PRD.md`
- `02_ROADMAP.md`
- `03_SYSTEM_ARCHITECTURE.md`
- `04_PHASE1_EXECUTION_PLAN.md`
- `05_DECISIONS.md`

If any requirement is unclear, summarize your understanding and ask clarification questions before implementing anything.

Do not begin coding until the requirements are aligned.

---

## 2. Think in terms of product, not just code

Every implementation should serve the product vision.

Before building a feature, ask:

1. Why does this feature exist?
2. Which product goal does it support?
3. Which roadmap phase does it belong to?
4. How does it improve the daily planning experience?

If a feature does not clearly support the core planning loop, it should not be implemented yet.

---

## 3. Build only what belongs to the current phase

Work only on the current phase and current milestone.

Do not introduce future-phase features during Phase 1.

Do not add extra capabilities just because they seem useful.

If a new idea is valuable but not part of the current milestone, record it as a future idea instead of implementing it immediately.

---

## 4. Follow the architecture

Respect the system boundaries defined in `03_SYSTEM_ARCHITECTURE.md`.

In particular:

- keep planning logic in the Planning Engine
- keep user interaction in the Presentation Layer
- keep persistence separate from business logic
- treat Planning Context as structured input, not raw data
- keep AI models replaceable

Do not let UI code make planning decisions.

Do not let persistence code contain product logic.

---

## 5. Keep implementations small and usable

Prefer small, complete increments over large, unfinished changes.

Each milestone should produce something usable.

Do not wait for the entire phase to be complete before making the product usable.

The product should be dogfooded as early as possible.

---

## 6. Preserve clarity and maintainability

Prefer:

- readable code
- simple abstractions
- clear naming
- modular structure
- minimal coupling
- separation of concerns

Avoid:

- over-engineering
- premature optimization
- unnecessary abstraction layers
- feature bloat
- hidden side effects

If there are multiple valid approaches, recommend the simplest one that fits the architecture.

---

## 7. Ask before assuming

If a requirement is ambiguous, do not guess.

Do not invent product behavior that has not been confirmed.

Do not silently expand the scope of a feature.

When in doubt:

1. restate the requirement
2. identify the ambiguity
3. propose a solution
4. wait for confirmation

---

## 8. Do not break existing decisions

Respect `05_DECISIONS.md`.

If a proposed change conflicts with an existing decision, raise it explicitly before making the change.

Do not refactor or redesign stable parts of the system without a clear reason.

Do not undo product decisions unless there is a strong product-level justification.

---

## 9. Keep the core loop intact

Everything in the product should support the core planning loop:

Long-term Goals
→ Daily Planning
→ Execution
→ Review
→ Updated Planning Context
→ Next Daily Plan

If a change does not strengthen this loop, it is probably out of scope.

---

## 10. Communicate clearly

When proposing work, always explain:

- what you think the task is
- what files or modules will be affected
- what assumptions you are making
- what the expected result is

After completing a task, summarize:

- what changed
- what remains unfinished
- whether any decisions or assumptions need confirmation

---

## 11. Keep milestones separate

Work on one milestone at a time.

Do not mix milestone objectives unless explicitly asked.

If a milestone is complete, stop and confirm before moving on.

Do not begin the next milestone automatically.

---

## 12. Prefer correctness over speed

Do not rush into implementation.

It is better to spend time aligning on the right design than to write fast code that later needs to be undone.

A small correct implementation is better than a larger uncertain one.

---

## 13. Update documentation when needed

If implementation reveals a genuine design change, update the relevant document instead of leaving the mismatch unresolved.

Prefer updating:

- `03_SYSTEM_ARCHITECTURE.md` for architecture changes
- `04_PHASE1_EXECUTION_PLAN.md` for execution changes
- `05_DECISIONS.md` for stable project decisions

Do not silently let code drift away from the documentation.

---

## 14. Final principle

Daily Routine Helper is a long-term product.

Treat the codebase as something that should become clearer and easier to maintain over time, not something that should be rushed into existence.

The goal is not just to write code.

The goal is to build a dependable planning system that can evolve with the user.