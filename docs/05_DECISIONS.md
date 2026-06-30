# Decisions

This document records important product and architecture decisions that should remain stable over time.

Its purpose is to prevent unnecessary re-litigation of decisions that have already been discussed and confirmed.

When future work introduces new ideas, they should be evaluated against these decisions before implementation begins.

---

## Decision 001 — This is not a traditional to-do app

Daily Routine Helper is not intended to be a generic task manager.

Its purpose is to help users transform long-term goals into realistic daily progress through adaptive planning.

---

## Decision 002 — The product optimizes for confidence in long-term growth

The primary goal of the product is not short-term productivity.

It is to help users regain confidence that consistent daily progress can lead to meaningful long-term outcomes.

---

## Decision 003 — The product should help users become better planners

The system should not create long-term dependence on AI.

Instead, it should gradually help users develop stronger planning skills and more realistic planning habits.

---

## Decision 004 — Planning logic is centered around the planning engine

The planning engine is the core of the system.

The user interface, persistence layer, and supporting modules exist to support planning decisions, not to define them.

---

## Decision 005 — Planning context is more important than raw data

The system should preserve only the information needed to generate better future plans.

It should focus on planning context, not on collecting unnecessary user data.

---

## Decision 006 — The MVP should stay small and usable

Phase 1 should validate the core planning loop:

Long-term Goals
→ Daily Planning
→ Execution
→ Review
→ Next-Day Planning

Features outside this loop should not be added to the MVP.

---

## Decision 007 — The roadmap is capability-driven, not feature-driven

Future phases should describe how the product becomes smarter, more helpful, and more integrated with daily life.

They should not be treated as a list of random features.

---

## Decision 008 — AI models are replaceable

The system should not depend on any specific model provider.

The architecture should allow the planning engine to keep working even if the underlying model changes.

---

## Decision 009 — Reflection is part of planning

Daily reflection is not a separate activity from planning.

It is part of the learning loop that improves tomorrow's plan.

---

## Decision 010 — External integrations are future enhancements, not MVP requirements

Calendar, reminders, external tools, and knowledge base integrations are valuable only if they improve planning quality.

They should not be added before the core planning loop is validated.

---

## Decision 011 — Features must support the core planning loop

A new feature should only be added if it clearly improves one of the following:

- the quality of daily planning
- the quality of reflection
- the ability to learn from execution
- the user's confidence in long-term progress

If it does not strengthen the core loop, it should remain out of scope.