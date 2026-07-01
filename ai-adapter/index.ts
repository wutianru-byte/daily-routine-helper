// ai-adapter/index.ts
//
// Composition root for the AI provider. This is the ONLY file that should
// decide which concrete AIProvider implementation is active. Every other
// module (core/planning-engine, and anything else that needs to call a
// model) should import `activeProvider` from here and use it through the
// AIProvider interface — never import a concrete adapter (claude-adapter,
// openai-adapter) directly.
//
// This mirrors storage/index.ts's pattern and is the concrete mechanism
// behind Decision 008 (AI models are replaceable): switching providers
// means changing the one line below, not touching planning-engine, route,
// UI, or storage.
//
// Current default: OpenAI (gpt-5-mini). claude-adapter.ts is kept in the
// codebase as a legacy provider and can be re-enabled by changing the
// import/export below.

import { AIProvider } from "./provider.interface";
import { openaiAdapter } from "./openai-adapter";

export const activeProvider: AIProvider = openaiAdapter;
