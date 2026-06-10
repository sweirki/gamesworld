import { GameResult } from "./gameResult";
import { getAnalytics, recordGameResult } from "../analytics/playerAnalytics";
import { useAchievementsStore } from "../../app/stores/useAchievementsStore";
import { saveGameHistoryCloud } from "../history/saveGameHistoryCloud";
import { auth } from "../../firebase";

export async function onGameFinished(result: GameResult) {
  console.log("ðŸ”¥ onGameFinished called", result);

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

