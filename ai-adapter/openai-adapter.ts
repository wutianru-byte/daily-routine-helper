// openai-adapter.ts
//
// Concrete AIProvider implementation for the OpenAI Responses API.
// Server-side only: reads OPENAI_API_KEY from environment and calls the
// OpenAI API directly. Like claude-adapter.ts, this module does NOT call
// any Next.js route handler — it is invoked by ai-adapter/index.ts
// (the provider composition root), which is in turn invoked by
// core/planning-engine.
//
// Call direction: app/api/planning/route.ts -> core/planning-engine
//   -> ai-adapter/index.ts (activeProvider) -> ai-adapter/openai-adapter.ts
//   -> OpenAI Responses API
//
// Debugging note (Decision 015): this adapter logs the basic call
// conditions (model name, whether OPENAI_API_KEY is present, success/
// failure) and logs the full error/response body on failure, distinguishing
// "request never reached OpenAI" vs "OpenAI returned a non-OK response" vs
// "response parsing failed", so a 500 from /api/planning can be traced to
// its real cause instead of a generic message.
//
// Proxy note (Decision 016): in this dev environment, Node's global fetch
// does not pick up local proxies (e.g. Clash) the way curl or a browser
// does, which causes UND_ERR_CONNECT_TIMEOUT even though the network path
// is otherwise fine. This module reads a proxy URL from the standard
// HTTPS_PROXY/HTTP_PROXY env vars (if set) and, when present, explicitly
// passes an undici ProxyAgent as fetch's `dispatcher`.
//
// Important: the `dispatcher` option only works when paired with the same
// `fetch` implementation that produced it. Node's built-in global `fetch`
// bundles its own internal undici, which is a different module instance
// (and can be a different version) from the `undici` package installed in
// node_modules. Passing a Dispatcher from the npm package into the global
// fetch causes `UND_ERR_INVALID_ARG: invalid onRequestStart method` even
// though the request object looks structurally correct. To avoid this, this
// adapter imports `fetch` from the `undici` package itself (not the global
// one) so `fetch` and `ProxyAgent` always come from the same module
// instance. The dispatcher is resolved once per process and cached at
// module scope.

import { AIProvider, ModelCallInput, ModelCallResult } from "./provider.interface";
import { logInfo, logError } from "@/core/shared/logger";
import { ProxyAgent, fetch as undiciFetch, type Dispatcher } from "undici";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

// Default model per product decision. Do not change without explicit
// confirmation — see project decisions log.
const OPENAI_MODEL = "gpt-5-mini";

// Resolved once and cached for the lifetime of the process. `undefined`
// means "no proxy configured" (direct connection); this is distinct from
// "not yet resolved" because resolution happens synchronously at import
// time below.
let cachedDispatcher: Dispatcher | undefined;
let proxyUrlForLogging: string | undefined;

function resolveProxyUrl(): string | undefined {
  return (
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy ||
    undefined
  );
}

function getDispatcher(): Dispatcher | undefined {
  if (cachedDispatcher !== undefined) {
    return cachedDispatcher;
  }

  const proxyUrl = resolveProxyUrl();
  if (!proxyUrl) {
    return undefined;
  }

  cachedDispatcher = new ProxyAgent(proxyUrl);
  proxyUrlForLogging = proxyUrl;
  return cachedDispatcher;
}

function getProxyScheme(): string | undefined {
  if (!proxyUrlForLogging) return undefined;
  try {
    return new URL(proxyUrlForLogging).protocol.replace(":", "");
  } catch {
    return "unknown";
  }
}

interface OpenAIResponseOutputContent {
  type: string;
  text?: string;
}

interface OpenAIResponseOutputItem {
  type: string;
  content?: OpenAIResponseOutputContent[];
}

interface OpenAIResponsesResult {
  output?: OpenAIResponseOutputItem[];
}

export const openaiAdapter: AIProvider = {
  async callModel(input: ModelCallInput): Promise<ModelCallResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    const dispatcher = getDispatcher();

    logInfo("openai-adapter", "Preparing call", {
      model: OPENAI_MODEL,
      apiKeyPresent: Boolean(apiKey),
      promptLength: input.prompt.length,
      proxyPresent: Boolean(dispatcher),
      proxyScheme: getProxyScheme(),
    });

    if (!apiKey) {
      const error = new Error(
        "OPENAI_API_KEY is not set. Add it to .env.local (server-side only)."
      );
      logError("openai-adapter", "Missing OPENAI_API_KEY — request not sent", error);
      throw error;
    }

    // Built as explicit, named variables (rather than inlined into the
    // fetch() call) so headers and the dispatcher option can't accidentally
    // get nested inside one another during manual edits/merges.
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };

    const requestBody = JSON.stringify({
      model: OPENAI_MODEL,
      input: input.prompt,
    });

    // `dispatcher` is an undici-specific fetch option, not a standard
    // RequestInit field — hence the explicit type union. It must stay a
    // sibling of `headers`/`body`/`method`, never a property inside
    // `headers`. Using undici's own RequestInit (implied by undiciFetch's
    // signature) rather than the DOM lib's RequestInit, since dispatcher is
    // only valid with undici's fetch.
    const requestInit: Parameters<typeof undiciFetch>[1] & { dispatcher?: Dispatcher } = {
      method: "POST",
      headers,
      body: requestBody,
    };

    if (dispatcher) {
      requestInit.dispatcher = dispatcher;
    }

    let response: Awaited<ReturnType<typeof undiciFetch>>;
    try {
      // Using undici's fetch (not Node's global fetch) so it shares the
      // same module instance as ProxyAgent/Dispatcher above — see the
      // Decision 016 note at the top of this file for why that matters.
      response = await undiciFetch(OPENAI_RESPONSES_URL, requestInit);
    } catch (networkError) {
      // fetch() itself threw: DNS/network failure, not an OpenAI error response.
      logError("openai-adapter", "Network-level failure calling OpenAI (fetch threw)", networkError);
      throw networkError;
    }

    if (!response.ok) {
      const errorText = await response.text();
      logError("openai-adapter", `OpenAI responded with non-OK status ${response.status}`, {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`OpenAI API request failed (${response.status}): ${errorText}`);
    }

    let data: OpenAIResponsesResult;
    try {
      data = (await response.json()) as OpenAIResponsesResult;
    } catch (parseError) {
      logError("openai-adapter", "Failed to parse OpenAI response as JSON", parseError);
      throw parseError;
    }

    logInfo("openai-adapter", "Raw OpenAI response received", data);

    const rawText = (data.output ?? [])
      .filter((item) => item.type === "message")
      .flatMap((item) => item.content ?? [])
      .filter((content) => content.type === "output_text")
      .map((content) => content.text ?? "")
      .join("\n");

    if (!rawText) {
      // Not necessarily an error (e.g. refusal or empty output), but worth
      // surfacing loudly since the UI will just show an empty box otherwise.
      logError(
        "openai-adapter",
        "OpenAI response parsed but produced no output_text — check response.output shape",
        data
      );
    } else {
      logInfo("openai-adapter", "Call succeeded", { rawTextLength: rawText.length });
    }

    return { rawText };
  },
};
