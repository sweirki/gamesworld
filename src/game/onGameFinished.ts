import { GameResult } from "./gameResult";
import { recordGameResult } from "../analytics/playerAnalytics";
import { saveGameHistoryCloud } from "../history/saveGameHistoryCloud";
import { auth } from "../../firebase";

export async function onGameFinished(result: GameResult) {
  console.log("🔥 onGameFinished called", result);

  const uid = auth.currentUser?.uid;
  if (!uid) return;

  // 1️⃣ Save to Cloud History
  await saveGameHistoryCloud({
    mode: result.mode,
    win: result.win,
    time: result.time,
    errors: result.errors,
    date: new Date().toISOString(),
  });

  // 2️⃣ Record analytics + stats (authoritative)
  await recordGameResult({
    mode: result.mode,
    win: result.win,
    timeSec: result.time,
    errors: result.errors,
    hintsUsed: result.hintsUsed ?? 0,
  });
}
