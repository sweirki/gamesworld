import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import * as Linking from "expo-linking";
import * as Sharing from "expo-sharing";

/**
 * Create a referral link for the current user.
 */
export const createInviteLink = async (uid: string) => {
  // Simple dynamic link style â€” can be upgraded later to Firebase Dynamic Links
  const baseUrl = "https://gamesworld.page.link";
  const link = `${baseUrl}/?ref=${uid}`;
  return link;
};

/**
 * Share the invite link using native share dialog.
 */
export const shareInvite = async () => {
  if (!auth.currentUser) return;
  const uid = auth.currentUser.uid;
  const link = await createInviteLink(uid);
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Linking.openURL(`mailto:?subject=Invite%20to%20Sudoku&body=${encodeURIComponent(`Play Sudoku with me! 🎉 Click here: ${link}`)}`);
  } else {
    await Linking.openURL(link);
  }
};

/**
 * Handle referral when a new user opens the app with ?ref=...
 */
export const handleReferral = async (refUid: string, myUid: string) => {
  if (!refUid || !myUid || refUid === myUid) return;

  const now = new Date().toISOString();

  // Add referral record under inviter
  await setDoc(doc(db, "referrals", refUid, "list", myUid), {
    date: now,
    claimed: false,
  });

  // Reward logic â†’ can expand (e.g., +1 hint pack)
  await setDoc(
    doc(db, "users", refUid, "rewards", myUid),
    { type: "referral", bonus: "hint", date: now },
    { merge: true }
  );
  await setDoc(
    doc(db, "users", myUid, "rewards", refUid),
    { type: "referral", bonus: "hint", date: now },
    { merge: true }
  );
};

