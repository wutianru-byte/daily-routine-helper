// provider.interface.ts
//
// Contract that any AI model adapter must satisfy. The Planning Engine
// depends only on this interface (Decision 008: AI models are replaceable).
//
// M1 scope: a single method that sends a prompt and returns the raw text
// response. Structured DailyPlan parsing is deferred to Milestone 3.

export interface ModelCallInput {
  prompt: string;
}

export interface ModelCallResult {
  rawText: string;
}

export interface AIProvider {
  callModel(input: ModelCallInput): Promise<ModelCallResult>;
}
