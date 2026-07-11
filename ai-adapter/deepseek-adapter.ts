// deepseek-adapter.ts
//
// Concrete AIProvider implementation for DeepSeek's OpenAI-compatible Chat
// Completions API. Server-side only: reads DEEPSEEK_API_KEY from environment
// and calls the DeepSeek API directly. Like openai-adapter.ts and
// claude-adapter.ts, this module does NOT call any Next.js route handler —
// it is invoked by ai-adapter/index.ts (the provider composition root),
// which is in turn invoked by core/planning-engine.
//
// Call direction: app/api/planning/route.ts -> core/planning-engine
//   -> ai-adapter/index.ts (activeProvider) -> ai-adapter/deepseek-adapter.ts
//   -> DeepSeek Chat Completions API
//
// Response shape note (do not "fix" this to match openai-adapter.ts):
// DeepSeek exposes an OpenAI-compatible **Chat Completions** endpoint
// (`choices[0].message.content`), NOT the OpenAI **Responses API** shape
// used by openai-adapter.ts (`output[].content[].output_text`). The two
// shapes are structurally different — reusing the Responses-API parsing
// here would silently produce an empty rawText (HTTP 200, no error) instead
// of a visible failure.
//
// Proxy note: unlike openai-adapter.ts (Decision 016), this adapter does
// NOT read HTTPS_PROXY/HTTP_PROXY/ALL_PROXY or construct an undici
// ProxyAgent by default. The OpenAI adapter's proxy workaround exists
// specifically because that provider is often unreachable without one in
// some dev environments; DeepSeek has not been shown to have the same
// problem. Verify with a direct connection first. If a specific environment
// genuinely cannot reach DeepSeek directly, add an explicit, opt-in proxy
// branch here rather than copying the OpenAI adapter's always-on detection
// wholesale — see docs/05_DECISIONS.md before doing so.

import { AIProvider, ModelCallInput, ModelCallResult } from "./provider.interface";
import { logInfo, logError } from "@/core/shared/logger";

const DEEPSEEK_CHAT_COMPLETIONS_URL = "https://api.deepseek.com/chat/completions";

// Default model per product decision. Do not change without explicit
// confirmation — see project decisions log.
const DEEPSEEK_MODEL = "deepseek-chat";

interface DeepSeekChoiceMessage {
  role: string;
  content?: string;
}

interface DeepSeekChoice {
  message?: DeepSeekChoiceMessage;
}

interface DeepSeekChatCompletionsResult {
  choices?: DeepSeekChoice[];
}

export const deepseekAdapter: AIProvider = {
  async callModel(input: ModelCallInput): Promise<ModelCallResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY;

    logInfo("deepseek-adapter", "Preparing call", {
      model: DEEPSEEK_MODEL,
      apiKeyPresent: Boolean(apiKey),
      promptLength: input.prompt.length,
    });

    if (!apiKey) {
      const error = new Error(
        "DEEPSEEK_API_KEY is not set. Add it to .env.local (server-side only)."
      );
      logError("deepseek-adapter", "Missing DEEPSEEK_API_KEY — request not sent", error);
      throw error;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    const requestBody = JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [{ role: "user", content: input.prompt }],
    });

    // Plain global fetch, direct connection — no dispatcher/proxy option.
    // See the proxy note at the top of this file before adding one.
    let response: Awaited<ReturnType<typeof fetch>>;
    try {
      response = await fetch(DEEPSEEK_CHAT_COMPLETIONS_URL, {
        method: "POST",
        headers,
        body: requestBody,
      });
    } catch (networkError) {
      // fetch() itself threw: DNS/network failure, not a DeepSeek error response.
      logError("deepseek-adapter", "Network-level failure calling DeepSeek (fetch threw)", networkError);
      throw networkError;
    }

    if (!response.ok) {
      const errorText = await response.text();
      logError("deepseek-adapter", `DeepSeek responded with non-OK status ${response.status}`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`DeepSeek API request failed (${response.status}): ${errorText}`);
    }

    let data: DeepSeekChatCompletionsResult;
    try {
      data = (await response.json()) as DeepSeekChatCompletionsResult;
    } catch (parseError) {
      logError("deepseek-adapter", "Failed to parse DeepSeek response as JSON", parseError);
      throw parseError;
    }

    logInfo("deepseek-adapter", "Raw DeepSeek response received", data);

    // Chat Completions shape: choices[0].message.content — deliberately NOT
    // the Responses API shape (output[].content[].output_text) used by
    // openai-adapter.ts. See the response shape note at the top of this file.
    const rawText = data.choices?.[0]?.message?.content ?? "";

    if (!rawText) {
      // Not necessarily an error (e.g. refusal or empty output), but worth
      // surfacing loudly since the UI will just show an empty box otherwise.
      logError(
        "deepseek-adapter",
        "DeepSeek response parsed but produced no message content — check response.choices shape",
        data
      );
    } else {
      logInfo("deepseek-adapter", "Call succeeded", { rawTextLength: rawText.length });
    }

    return { rawText };
  },
};
