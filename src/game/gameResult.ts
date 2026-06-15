export type GameResult = {
  mode: "classic" | "daily" | "weekly" | "hyper" | "x" | "killer";
  win: boolean;
  time: number;     // seconds
  errors: number;
  hintsUsed?: number;
  difficulty?: string;
  score?: number;
  totalPoints?: number;
  dailyStreak?: number;
  activityStreak?: number;
};


