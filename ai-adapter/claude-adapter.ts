// claude-adapter.ts
//
// Concrete AIProvider implementation for the Claude API.
// Server-side only: reads ANTHROPIC_API_KEY from environment and calls the
// Claude API directly. This module does NOT call any Next.js route handler —
// it is invoked by core/planning-engine, never the other way around.
//
// Call direction (per Decision, confirmed): app/api/planning/route.ts
//   -> core/planning-engine -> ai-adapter/claude-adapter.ts -> Claude API

import { AIProvider, ModelCallInput, ModelCallResult } from "./provider.interface";

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-6";

export const claudeAdapter: AIProvider = {
  async callModel(input: ModelCallInput): Promise<ModelCallResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set. Add it to .env.local (server-side only)."
      );
    }

    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1000,
        messages: [{ role: "user", content: input.prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API request failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const rawText =
      data?.content
        ?.filter((block: { type: string }) => block.type === "text")
        ?.map((block: { text: string }) => block.text)
        ?.join("\n") ?? "";

    return { rawText };
  },
};
