import { GameResult } from "./gameResult";
import { getAnalytics, recordGameResult } from "../analytics/playerAnalytics";
import { useAchievementsStore } from "../../app/stores/useAchievementsStore";
import { saveGameHistoryCloud } from "../history/saveGameHistoryCloud";
import { auth } from "../../firebase";
import { completePendingArenaRun } from "../arena/arenaEngine";
import { awardGameEconomy } from "../economy/economyEngine";

export async function onGameFinished(result: GameResult) {
  console.log("ðŸ”¥ onGameFinished called", result);

  // Arena resolution must not depend on cloud auth. Guest Arena sessions still need a result.
  try {
    if (result.mode === "classic") {
      await completePendingArenaRun({
        win: result.win,
        time: result.time,
        errors: result.errors,
        hintsUsed: result.hintsUsed ?? 0,
      });
    }
  } catch {
    // Arena persistence must never block the normal win flow.
  }

  try {
    await awardGameEconomy({ mode: result.mode, win: result.win, difficulty: result.difficulty });
  } catch {
    // Economy rewards must never block game completion.
  }

  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // 1ï¸âƒ£ Save to Cloud History
  await saveGameHistoryCloud({
    mode: result.mode,
    win: result.win,
    time: result.time,
    errors: result.errors,
    date: new Date().toISOString(),
  });

  // 2ï¸âƒ£ Record analytics + stats (authoritative)
  await recordGameResult({
    mode: result.mode,
    win: result.win,
    timeSec: result.time,
    errors: result.errors,
    hintsUsed: result.hintsUsed ?? 0,
  });

  // 3ï¸âƒ£ Award achievements from the same completed-game event.
  try {
    const analytics = await getAnalytics();
    await useAchievementsStore.getState().awardForGameResult({
      mode: result.mode,
      win: result.win,
      time: result.time,
      errors: result.errors,
      hintsUsed: result.hintsUsed ?? 0,
      difficulty: result.difficulty,
      score: result.score,
      totalPoints: result.totalPoints,
      dailyStreak: result.dailyStreak,
      activityStreak: result.activityStreak,
      analytics,
    });
  } catch {
    // Achievement failure must never block game completion.
  }

}

