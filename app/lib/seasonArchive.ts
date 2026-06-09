import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export async function archiveSeason(
  seasonId: number,
  rows: Array<{
    uid?: string;
    username?: string;
    points?: number;
    rank?: number;
  }>
) {
  if (!rows.length) return;

  const ref = doc(collection(db, "seasonArchive"), String(seasonId));

  await setDoc(ref, {
    seasonId,
    endedAt: serverTimestamp(),
    leaderboard: rows.map(r => ({
      uid: r.uid ?? null,
      username: r.username ?? "Unknown",
      points: r.points ?? 0,
      rank: r.rank ?? null,
    })),
  });
}

