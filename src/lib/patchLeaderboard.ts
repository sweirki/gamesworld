import {
  collection,
  getDocs,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "../../firebase";

// ✅ Run this ONCE to patch old leaderboard entries
export async function patchAllOldLeaderboard() {
  try {
    const leaderboardSnap = await getDocs(collection(db, "leaderboard"));
    const usersSnap = await getDocs(collection(db, "users"));

    // Build username → uid map
    const userMap: Record<string, string> = {};
    usersSnap.docs.forEach((userDoc) => {
      const data = userDoc.data();
      if (data.username && userDoc.id) {
        userMap[data.username] = userDoc.id;
      }
    });

    const batch = writeBatch(db);
    leaderboardSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const name = data.username || data.user;
      const uid = data.uid;

      if ((!uid || uid === null) && name && userMap[name]) {
        batch.update(doc(db, "leaderboard", docSnap.id), {
          uid: userMap[name],
        });
      }
    });

    await batch.commit();
  } catch (err) {
    console.error("❌ Error patching leaderboard:", err);
  }
}

