import { scoreConfig } from "./scoreConfig";

export type Difficulty = "easy" | "medium" | "hard";

interface ScoreInput {
  difficulty: Difficulty | string;
  time: number;
  hints: number;
  undos: number;
  errors?: number;
  streak?: number;
}

export function calculateScore(input: ScoreInput): number {
  const { time, hints, undos, streak = 0 } = input;
  const difficulty: Difficulty = input.difficulty === "easy" || input.difficulty === "medium" || input.difficulty === "hard" ? input.difficulty : "medium";
  const base = scoreConfig.basePoints[difficulty];
  const timeBonus = Math.max(0, Math.floor((1000 - time) * scoreConfig.timeBonusFactor));
  const penalties = hints * scoreConfig.hintPenalty + undos * scoreConfig.undoPenalty;
  const streakBonus = streak * scoreConfig.streakBonus;

  return Math.max(0, base + timeBonus - penalties + streakBonus);
}

