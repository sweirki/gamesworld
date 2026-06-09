// scoreEngine.ts (HARD MODE – FULL REWRITE)

import { scoreConfig, seasonXP } from "./scoreConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAchievementsStore } from "../../app/stores/useAchievementsStore";
import { db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { safeFirestoreCall } from "../../src/utils/firestoreSafe";
export type Difficulty = keyof typeof scoreConfig.base;
type PlayDifficulty = Difficulty | "classic" | "hyper" | "killer" | "x" | "daily" | string;
const normalizeDifficulty = (difficulty: PlayDifficulty): Difficulty => {
  return difficulty === "easy" || difficulty === "medium" || difficulty === "hard" ? difficulty : "medium";
};

/* -------------------------------------------------
   SCORE CALCULATOR (classic gameplay score)
------------------------------------------------- */
export function calculateScore({
  difficulty,
  time,
  timeSeconds,
  hints,
  undos,
  errors,
  wrongs,
  streak,
}: {
  difficulty: PlayDifficulty;
  time?: number;
  timeSeconds?: number;
  hints?: number;
  undos?: number;
  errors?: number;
  wrongs?: number;
  streak?: number;
}): number {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const safeTime = time ?? timeSeconds ?? 0;
  const safeHints = hints ?? 0;
  const safeUndos = undos ?? 0;
  const safeErrors = errors ?? wrongs ?? 0;
  const safeStreak = streak ?? 0;

  const base = scoreConfig.base[normalizedDifficulty] || 0;
  const timeBonus = Math.max(0, scoreConfig.timeFactor[normalizedDifficulty] - safeTime);
  const hintPenalty = safeHints * scoreConfig.hintPenalty;
  const undoPenalty = safeUndos * scoreConfig.undoPenalty;
  const errorPenalty = safeErrors * scoreConfig.errorPenalty;
  const streakBonus = safeStreak * scoreConfig.streakBonus;

  const fastBonus =
    safeTime <= scoreConfig.fastSolveBonus[normalizedDifficulty]
      ? scoreConfig.fastSolveBonus[normalizedDifficulty]
      : 0;

  return Math.max(
    0,
    base +
      timeBonus +
      fastBonus +
      streakBonus -
      hintPenalty -
      undoPenalty -
      errorPenalty
  );
}

/* -------------------------------------------------
   LADDER XP CALCULATOR (WORKS FINE)
------------------------------------------------- */
export function calculateXpForLadder({
  mode,
  difficulty,
  time,
  errors,
}: {
  mode: string;
  difficulty: PlayDifficulty;
  time: number;
  errors: number;
}): number {
  const baseXPMap: Record<string, number> = {
    classic: 50,
    hyper: 70,
    x: 80,
    killer: 90,
    daily: 100,
  };

  const baseXP = baseXPMap[mode] || 40;

  const difficultyBonusMap: Record<string, number> = {
    easy: 0,
    medium: 20,
    hard: 40,
  };

  const difficultyBonus = difficultyBonusMap[normalizeDifficulty(difficulty)] || 0;
  const speedBonus = Math.max(0, 200 - time);
  const penalty = errors * 5;

  const xp = baseXP + difficultyBonus + speedBonus - penalty;

  return Math.max(5, Math.floor(xp));
}

/* -------------------------------------------------
   HARD MODE LADDER RANK SYSTEM — A+++
------------------------------------------------- */
export function getLadderRank(xp: number): string {
  if (xp >= 100000) return "Grandmaster";
  if (xp >= 50000) return "Master";
  if (xp >= 25000) return "Diamond";
  if (xp >= 12000) return "Platinum";
  if (xp >= 5000) return "Gold";
  if (xp >= 2000) return "Silver";
  return "Bronze";
}

/* -------------------------------------------------
   ACHIEVEMENTS
------------------------------------------------- */
const achievementMap: Record<string, string> = {
  "First Win": "first_win",
  "10 Wins": "points_collector",
  "50 Wins": "points_collector",
  "100 Wins": "points_collector",
  "Speed Demon": "speed_demon",
  "Streak Master": "streak_keeper",
};

export async function getCurrentStreak(user: string): Promise<number> {
  try {
    const data = await AsyncStorage.getItem("leaderboard");
    if (!data) return 0;

    const games = JSON.parse(data).filter((g: any) => g.user === user);
    const dates = [...new Set<string>(games.map((g: any) => String(g.date).split("T")[0]))].sort();

    if (dates.length === 0) return 0;

    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff =
        (curr.getTime() - prev.getTime()) / (1000 * 3600 * 24);

      streak = diff === 1 ? streak + 1 : 1;
    }
    return streak;
  } catch {
    return 0;
  }
}

export function checkAchievements(game: {
  difficulty: PlayDifficulty;

  time: number;
  totalGames: number;
  streak: number;
}): string[] {
  const achieved: string[] = [];

  if (game.totalGames >= scoreConfig.achievements.firstWin)
    achieved.push("First Win");
  if (game.totalGames >= scoreConfig.achievements.tenWins)
    achieved.push("10 Wins");
  if (game.totalGames >= scoreConfig.achievements.fiftyWins)
    achieved.push("50 Wins");
  if (game.totalGames >= scoreConfig.achievements.hundredWins)
    achieved.push("100 Wins");

  if (game.time <= scoreConfig.achievements.speedDemon[normalizeDifficulty(game.difficulty)])
    achieved.push("Speed Demon");

  if (game.streak >= scoreConfig.achievements.streakMaster)
    achieved.push("Streak Master");

  const unlock = useAchievementsStore.getState().unlock;
  achieved.forEach(name => {
    const id = achievementMap[name];
    if (id) unlock(id);
  });

  return achieved;
}

/* -------------------------------------------------
   SEASON XP + SEASON RANK (HARD MODE)
------------------------------------------------- */
export function calculateSeasonXP({
  difficulty,
  time,
  errors,
  streak,
  achievementLevel,
}: {difficulty: PlayDifficulty;
  time: number;
  errors: number;
  streak: number;
  achievementLevel: string;
}) {
  const normalizedDifficulty = normalizeDifficulty(difficulty);
  const base = seasonXP.base[normalizedDifficulty] || 40;
 const fast =
  time <= seasonXP.fastBonus[normalizedDifficulty]
    ? seasonXP.fastBonus[normalizedDifficulty]
    : 0;

  const clean = errors === 0 ? seasonXP.noErrorBonus : 0;
  const streakXP = streak * seasonXP.streakBonus;
  const tierMult = seasonXP.tierMultiplier[achievementLevel as keyof typeof seasonXP.tierMultiplier] || 1.0;

  return Math.floor((base + fast + clean + streakXP) * tierMult);
}

export function getSeasonRank(xp: number): string {
  if (xp >= 100000) return "Grandmaster";
  if (xp >= 50000) return "Master";
  if (xp >= 25000) return "Diamond";
  if (xp >= 12000) return "Platinum";
  if (xp >= 5000) return "Gold";
  if (xp >= 2000) return "Silver";
  return "Bronze";
}


/* -------------------------------------------------
   SEASON PROMOTION (THRESHOLDS)
------------------------------------------------- */

export const SEASON_PROMOTION_THRESHOLDS = {
  Bronze: { promote: 1200, demote: 0 },
  Silver: { promote: 3000, demote: 800 },
  Gold: { promote: 7000, demote: 2500 },
  Platinum: { promote: 14000, demote: 6000 },
  Diamond: { promote: Infinity, demote: 12000 },
};

export type SeasonOutcome = "promote" | "stay" | "demote";

export function getSeasonOutcome(
  seasonXP: number,
  currentRank: keyof typeof SEASON_PROMOTION_THRESHOLDS
): SeasonOutcome {
  const rule = SEASON_PROMOTION_THRESHOLDS[currentRank];

  if (!rule) return "stay";
  if (seasonXP >= rule.promote) return "promote";
  if (seasonXP < rule.demote) return "demote";
  return "stay";
}



/* -------------------------------------------------
   SEASONAL SCORE WRITER
------------------------------------------------- */
export async function writeSeasonalScore(
  uid: string,
  username: string,
  score: number,
  time: number,
  streak: number,
  difficulty: PlayDifficulty
)
 {
  try {
   const seasonRef = doc(db, "seasonMeta", "current");
const seasonSnap = await safeFirestoreCall(
  () => getDoc(seasonRef),
  null
);

if (!seasonSnap || !seasonSnap.exists()) return;

const { season } = seasonSnap.data();

const userRef = doc(db, "seasonUsers", `${season}_${uid}`);
const userSnap = await safeFirestoreCall(
  () => getDoc(userRef),
  null
);


    let games = 1;
    let wins = score > 0 ? 1 : 0;
    let previousXP = 0;

    if (userSnap && userSnap.exists()) {
      const data = userSnap.data();
      games = (data.games || 0) + 1;
      wins = (data.wins || 0) + (score > 0 ? 1 : 0);
      previousXP = data.xp || 0;
    }

    const achievementLevel = useAchievementsStore.getState().getLevel();

   const seasonXPForGame = calculateSeasonXP({
  difficulty,
  time,
  errors: 0,
  streak,
  achievementLevel,
});


    const finalXP = previousXP + seasonXPForGame;
    const rank = getSeasonRank(finalXP);

    await setDoc(
      userRef,
      {
        uid,
        username,
        games,
        wins,
        xp: finalXP,
        rank,
        lastPlayed: Date.now(),
        season,
      },
      { merge: true }
    );

    console.log("🔥 Seasonal score written for", username);
  } catch (err) {
    console.log("❌ Error writing seasonal score:", err);
  }
}


export function getRankBadge(rankOrXp: string | number): string {
  const rank = typeof rankOrXp === "number" ? getLadderRank(rankOrXp) : rankOrXp;
  const badges: Record<string, string> = {
    Bronze: "🥉",
    Silver: "🥈",
    Gold: "🥇",
    Platinum: "💠",
    Diamond: "💎",
    Master: "👑",
    Grandmaster: "🏆",
    Unranked: "🎮",
  };
  return badges[rank] ?? "🎮";
}
