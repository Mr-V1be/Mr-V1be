/** Activity level as GitHub buckets it: 0 means no contributions, 4 is the busiest quartile. */
export type ContributionLevel = 0 | 1 | 2 | 3 | 4;

export const CONTRIBUTION_LEVELS = 5;

export interface ContributionDay {
  readonly date: string;
  readonly count: number;
  readonly level: ContributionLevel;
}

export interface ContributionCalendar {
  readonly total: number;
  /** Weeks from oldest to newest; each week lists its days from Sunday. */
  readonly weeks: readonly (readonly ContributionDay[])[];
}
