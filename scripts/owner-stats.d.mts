// Types for owner-stats.mjs, which stays plain JavaScript so it runs with nothing but Node.
export interface OwnerStats {
  generated_at: string;
  first_day: string | null;
  totals: Record<string, number>;
  daily: { day: string; metric: string; count: number }[];
  stored_now: { events: number; responses: number; biggest_event: number; events_with_responses: number };
  feedback: { count: number; rated: number; avg_rating: number | null; by_type: Record<string, number> };
}

export function parseEnv(text: string): Record<string, string>;
export function summarize(stats: OwnerStats): {
  totals: Record<string, number>;
  responsesPerEvent: number | null;
  firstDay: string | null;
  days: number;
};
export function formatSummary(stats: OwnerStats): string;
export function buildHtml(stats: OwnerStats): string;
