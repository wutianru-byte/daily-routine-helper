// core/review-manager
//
// Responsible for collecting daily reflections (Decision 009: reflection is
// part of planning). Full implementation is scoped to Milestone 4.
//
// M1 scope: interface only, so the contract is visible and the Review page
// has a clear extension point. No storage calls happen yet.

import { DailyReview } from "@/types/review";

export interface ReviewManager {
  createReview(input: Omit<DailyReview, "id" | "createdAt">): Promise<DailyReview>;
  listReviews(): Promise<DailyReview[]>;
}

// Not implemented in M1. Intentionally left as a stub; throwing keeps usage
// honest instead of silently returning fake data.
export const reviewManager: ReviewManager = {
  async createReview() {
    throw new Error("Review Manager is not implemented yet (planned for Milestone 4).");
  },
  async listReviews() {
    throw new Error("Review Manager is not implemented yet (planned for Milestone 4).");
  },
};
