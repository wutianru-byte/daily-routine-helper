// DailyReview
// Captures what happened during a day's execution. Feeds future Planning Context.
// M1 scope: type definition only; full CRUD UI arrives in M4.

export interface DailyReview {
  id: string;
  date: string; // ISO date
  completedItems: string[];
  incompleteItems: string[];
  biggestBlocker: string;
  tomorrowFocus: string;
  reflectionNotes: string;
  createdAt: string; // ISO timestamp
}
