import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../../firebase";
import { safeFirestoreCall } from "../utils/firestoreSafe";
import { awardLadderXP } from "../../app/lib/ladderBridge";

/**
 * Single source of truth for ALL leaderboard writes
 * - Daily   -> leaderboard (period: "daily", dailyId)
 * - Normal  -> leaderboard (period: "season", seasonId)
 * - Ladder XP is awarded ONLY for non-daily wins
 */

const SEASON_LENGTH_DAYS = 28;
const SEASON_START = new Date("2025-01-01").getTime();

function getCurrentSeasonId() {
  const diffDays = Math.floor((Date.now() - SEASON_START) / 86400000);
  return Math.floor(diffDays / SEASON_LENGTH_DAYS);
}

export async function saveWin(
  username: string,
  difficulty: string,
  time: number,
  errors: number = 0,
  isDaily: boolean = false
) {
  const uid = auth.currentUser?.uid ?? null;
  if (!uid) return;

  const todayId = new Date().toISOString().slice(0, 10);
  const seasonId = getCurrentSeasonId();

  // 🔓 Always clear dailyPlayed first (re-locked only after success)
  await AsyncStorage.removeItem("dailyPlayed");

  const points = Math.max(0, 1000 - time - errors * 50);

  const winData = {
    uid,
    username,
    difficulty,
    time,
    errors,
    points,
    period: isDaily ? "daily" : "season",
    seasonId: isDaily ? null : seasonId,
    dailyId: isDaily ? todayId : null,
    createdAt: serverTimestamp(),
  };

  await safeFirestoreCall(async () => {
    try {
      // 1️⃣ Clear legacy pending wins
      await AsyncStorage.removeItem("pendingWins");

      // 2️⃣ Write leaderboard entry
      await addDoc(collection(db, "leaderboard"), winData);

      // 3️⃣ Lock Daily ONLY after successful write
      if (isDaily) {
        await AsyncStorage.setItem("dailyPlayed", todayId);
      }

      // 4️⃣ Award ladder XP ONLY for non-daily wins
      if (!isDaily) {
        await awardLadderXP(points);
      }

      // 5️⃣ Update user profile streak / win counters (not ladder logic)
      if (username) {
       const userRef = doc(db, "users", uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          const data = snap.data();

          const nextStreak =
            data.streakDate === todayId
              ? data.streakCount
              : (data.streakCount || 0) + 1;

          await setDoc(
            userRef,
            {
              winCount: (data.winCount || 0) + 1,
              streakCount: nextStreak,
              streakDate: todayId,
            },
            { merge: true }
          );
        } else {
          await setDoc(
            userRef,
            {
              winCount: 1,
              streakCount: 1,
              streakDate: todayId,
            },
            { merge: true }
          );
        }
      }

      console.log(isDaily ? "✅ Daily win saved" : "✅ Win saved");
    } catch (error) {
      console.error("🔴 saveWin FAILED (guarded)", error);

      // Queue win for offline retry
      try {
        const existing = (await AsyncStorage.getItem("pendingWins")) || "[]";
        const updated = JSON.parse(existing);
        updated.push(winData);
        await AsyncStorage.setItem("pendingWins", JSON.stringify(updated));
      } catch (err) {
        console.error("❌ Failed to queue win:", err);
      }
    }
  }, null);
}
