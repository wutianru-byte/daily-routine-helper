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

---

## Decision 012 — Provider API key management

AI Provider API keys are stored only in a local `.env.local` file and are never committed to the repository (excluded via `.gitignore`). This applies to any current or future provider (e.g. `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`), not to one provider specifically — the decision is bound to "AI Provider," not to a brand.

The browser frontend never holds or calls a provider API key directly. All calls to an AI provider are made server-side, through a Next.js Route Handler (`app/api/planning/route.ts`) that delegates to the Planning Engine, which in turn delegates to the active AI Adapter (see Decision 014 for how the active adapter is selected).

Call direction is one-way: Route Handler → Planning Engine → AI Adapter → Provider API. An AI Adapter never calls back into a Route Handler.

---

## Decision 013 — Context assembly happens client-side in Phase 1 (temporary, local-first constraint)

Because Phase 1 storage is local-first and lives in the browser (IndexedDB), the Planning Engine cannot read storage directly from the server. As a result, in M1:

- `core/context` (`assembleContext()`) is called from the client, where IndexedDB is available.
- The assembled `PlanningContextSnapshot` is sent as part of the request body to `/api/planning`.
- `/api/planning` only validates the shape of the incoming context and forwards it to `core/planning-engine`. It does not assemble context itself and does not read storage.
- `core/planning-engine` receives the context as input and calls `ai-adapter` with it; it has no knowledge of where the context came from.

This is a direct consequence of the local-first storage decision, not a deviation from the layered architecture: the Route Handler remains the sole entry point to the AI Adapter, and the Planning Engine remains the sole caller of the AI Adapter.

This decision should be revisited if Phase 1 storage ever moves server-side (e.g. a real backend database) — at that point, context assembly could move behind the Route Handler instead of being assembled client-side. Until then, future milestones (especially M5 — Planning Context and Persistence) should follow this same client-assembles-context, server-validates-and-forwards pattern rather than introducing a second, inconsistent pattern.

---

## Decision 014 — Default AI provider is OpenAI; provider selection goes through a composition root

The default AI provider for Phase 1 is OpenAI, via the Responses API, using model `gpt-5-mini`. Anthropic/Claude is no longer the default provider, but `ai-adapter/claude-adapter.ts` is kept in the codebase as a legacy provider rather than deleted, in case it needs to be re-enabled or compared against later.

Provider selection is centralized in `ai-adapter/index.ts`, which exports a single `activeProvider` constant typed as `AIProvider`. `core/planning-engine` depends only on this composition root, never on a concrete adapter (`openai-adapter.ts` or `claude-adapter.ts`) directly. This mirrors the existing `storage/index.ts` composition-root pattern used for the storage layer.

Switching the default provider in the future means changing the one export in `ai-adapter/index.ts`. It should not require changes to `core/planning-engine`, `app/api/planning/route.ts`, the UI, or `storage/*`. This is the concrete mechanism behind Decision 008 (AI models are replaceable).

If a higher-quality model is needed later, the documented upgrade path is `gpt-5-mini` → `gpt-5`, decided explicitly rather than implicitly.

---

## Decision 015 — Diagnostic logging across the planning call chain (debugging aid, not new architecture)

To make failures in the route → planning-engine → ai-adapter chain debuggable, each layer logs to the server terminal with a layer-tagged prefix (`[route]`, `[planning-engine]`, `[openai-adapter]`) and, where available, a `requestId` generated once per request in `app/api/planning/route.ts`.

This addition is diagnostic only:

- `core/shared/logger.ts` is a minimal formatting helper (two functions: `logInfo`, `logError`), not a logging framework, and is not meant to evolve into one without a separate decision.
- `requestId` is generated in the Route Handler and passed as an optional third argument to `generatePlan()`. It does not flow into `AIProvider.callModel()` — the provider interface is unchanged.
- The OpenAI Adapter logs the model name, whether `OPENAI_API_KEY` is present, and distinguishes network failure, non-OK HTTP response, and response-parsing failure as three separate logged cases.
- `/api/planning` error responses now include `error` (a short machine-readable code), `message` (human-readable detail), and `requestId`, in addition to the existing HTTP status code. This is an additive change to the error response shape; the success response shape (`{ rawText }`) is unchanged.

This decision exists so future milestones don't need to re-litigate whether console logging is acceptable here — it is, as long as it stays this minimal and stays diagnostic (not used for analytics, not persisted, not user-facing beyond the existing error message in the UI).

---

## Decision 016 — Explicit proxy dispatcher in the OpenAI adapter (local dev environment workaround)

In some local development environments, Node's `fetch` does not automatically use a local proxy (e.g. Clash) the way `curl` or a browser does, which can produce `UND_ERR_CONNECT_TIMEOUT` even though the network path itself is fine. To work around this, `ai-adapter/openai-adapter.ts` reads a proxy URL from the standard `HTTPS_PROXY` / `https_proxy` / `HTTP_PROXY` / `http_proxy` / `ALL_PROXY` / `all_proxy` environment variables (in that priority order) and, when one is present, constructs an `undici.ProxyAgent` and passes it as `fetch`'s `dispatcher` option.

A real pitfall was hit and fixed during this work: Node's built-in global `fetch` bundles its own internal copy of `undici`, which is a different module instance (and can be a different version) from the `undici` package installed in `node_modules`. Passing a `Dispatcher`/`ProxyAgent` created from the npm package into the *global* `fetch` fails with `UND_ERR_INVALID_ARG: invalid onRequestStart method`, even when the request object (headers, body, dispatcher) is structurally correct — the error looks like a malformed request but is actually a cross-version incompatibility. The fix is to import `fetch` from the `undici` package itself and use that, not the global one, so `fetch` and `ProxyAgent` always come from the same module instance.

Scope and constraints of this change:

- `undici` was added as a direct dependency (previously only available transitively through Next.js) specifically so `ProxyAgent` (and now `fetch`) can be imported from the same module instance.
- The dispatcher is resolved once and cached at module scope for the lifetime of the process; it is not re-created per request.
- `openai-adapter.ts` uses `undici`'s own `fetch`, not Node's global `fetch`, for all of its requests (not only when a proxy is configured) so behavior is consistent whether or not a proxy is set.
- This logic is local to `openai-adapter.ts` only. It is not a generic networking utility and is not used by any other module. If a second adapter (or a future provider) needs the same behavior, it should get its own proxy resolution rather than importing this one, to keep adapters independent — re-evaluate this if proxy logic needs to be shared across 3+ adapters.
- No proxy credentials or full proxy URLs are logged — only `proxyPresent` (boolean) and `proxyScheme` (e.g. `http`/`socks5`), consistent with Decision 015's diagnostic-logging-only intent.
- If `HTTPS_PROXY`/etc. are not set, behavior is functionally unchanged from before this decision: no dispatcher is passed and the request connects directly — only the underlying fetch implementation (undici's vs Node's global) differs, which is not expected to be user-visible.

This is treated as a local development environment accommodation, not a production networking requirement. It should be revisited if/when the project introduces a real deployment target where proxying is handled at the infrastructure level instead.

---

## Decision 017 — Default AI provider is now DeepSeek; OpenAI and Claude are both legacy

The default AI provider is now DeepSeek, via its OpenAI-compatible Chat Completions API, using model `deepseek-chat`. OpenAI is no longer the default provider — `ai-adapter/openai-adapter.ts` and `ai-adapter/claude-adapter.ts` are both kept in the codebase as legacy providers rather than deleted, in case either needs to be re-enabled or compared against later. This extends Decision 014's provider-selection mechanism; it does not change it.

Switching was done entirely through the existing composition root: `ai-adapter/index.ts`'s `activeProvider` now points at `deepseekAdapter` instead of `openaiAdapter`. `core/planning-engine`, `app/api/planning/route.ts`, the UI, and `storage/*` were not touched, confirming Decision 008/014's replaceability claim in practice for a second provider swap.

Response shape: DeepSeek's Chat Completions endpoint returns `choices[0].message.content`, structurally different from the OpenAI **Responses API** shape (`output[].content[].output_text`) that `openai-adapter.ts` parses. `deepseek-adapter.ts` has its own parsing logic; it does not and should not reuse `openai-adapter.ts`'s response parsing.

Environment variable: the new adapter reads `DEEPSEEK_API_KEY`, following the same "AI Provider key, not provider-specific policy" framing as Decision 012. `OPENAI_API_KEY` and `ANTHROPIC_API_KEY` are left in `.env.local` for now (unused by the active provider, not deleted) — removing unused legacy keys is a separate cleanup decision, not part of this switch.

Proxy: Decision 016's `undici`/`ProxyAgent` workaround is **not** copied into `deepseek-adapter.ts`. That workaround existed specifically because OpenAI was often unreachable without a proxy in some dev environments; DeepSeek has not been shown to have the same problem and was verified against a direct connection first, per Decision 016's own guidance that this logic is local to `openai-adapter.ts` and should not be shared preemptively. If a specific environment genuinely cannot reach DeepSeek directly, add an explicit, opt-in proxy branch to `deepseek-adapter.ts` rather than importing or duplicating `openai-adapter.ts`'s always-on detection.

Logging: `core/shared/logger.ts`'s `Layer` type gained a `"deepseek-adapter"` tag alongside the existing `"openai-adapter"` tag (kept because `openai-adapter.ts` remains in the codebase and must still type-check). This is consistent with Decision 015 — diagnostic logging only, no behavior change to the provider interface.