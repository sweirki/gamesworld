import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases from "react-native-purchases";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  EmailAuthProvider,
  deleteUser,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import RequireAuth from "./RequireAuth";
import { auth, db } from "../firebase";
import { useRevenueCat } from "../src/hooks/useRevenueCat";

const bg = require("../assets/branding/home-background.png");
const accountIcon = require("../assets/branding/settings/account-shield.png");
const premiumIcon = require("../assets/branding/profile/premium-card.png");

type DeleteStage = "idle" | "confirm" | "password" | "deleting";

const LOCAL_ACCOUNT_KEYS = [
  "uid",
  "email",
  "username",
  "avatarUri",
  "lastSeasonRank",
  "leaderboard",
  "weeklyLeaderboard",
  "dailyPlayedDate",
  "dailyCompletedDate",
];

async function deleteOwnedDocs(collectionName: string, uid: string) {
  const snap = await getDocs(query(collection(db, collectionName), where("uid", "==", uid)));
  await Promise.all(snap.docs.map((entry) => deleteDoc(doc(db, collectionName, entry.id))));
}

async function removeFromDailyLeaderboards(uid: string) {
  const snap = await getDocs(collection(db, "dailyLeaderboard"));
  await Promise.all(
    snap.docs.map(async (entry) => {
      const data = entry.data();
      const scores = Array.isArray(data.scores) ? data.scores : [];
      const filtered = scores.filter((score: any) => score?.uid !== uid);
      if (filtered.length !== scores.length) {
        await setDoc(doc(db, "dailyLeaderboard", entry.id), { scores: filtered }, { merge: true });
      }
    })
  );
}

function AccountInner() {
  const router = useRouter();
  const { isPremium, refresh } = useRevenueCat();
  const user = auth.currentUser;
  const [message, setMessage] = useState<{ title: string; text: string } | null>(null);
  const [stage, setStage] = useState<DeleteStage>("idle");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const email = user?.email ?? "No email found";
  const createdAt = useMemo(() => {
    const raw = user?.metadata?.creationTime;
    if (!raw) return "Unavailable";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "Unavailable";
    return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }, [user?.metadata?.creationTime]);

  const restorePurchases = async () => {
    try {
      const result = await Purchases.restorePurchases();
      await refresh();
      setMessage({
        title: "Restore Purchases",
        text: result?.entitlements?.active?.premium
          ? "Premium restored successfully."
          : "No previous purchases were found for this account.",
      });
    } catch {
      setMessage({ title: "Restore Failed", text: "Restore is unavailable right now. Please try again later." });
    }
  };

  const resetPassword = async () => {
    if (!user?.email) {
      setMessage({ title: "Password Reset", text: "No email address is attached to this account." });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage({ title: "Password Reset Sent", text: "Check your email for a password reset link." });
    } catch {
      setMessage({ title: "Password Reset Failed", text: "Please try again later." });
    }
  };

  const logout = async () => {
    try { await Purchases.logOut(); } catch {}
    await AsyncStorage.multiRemove(LOCAL_ACCOUNT_KEYS);
    await signOut(auth);
    router.replace("/login");
  };

  const deleteAccount = async () => {
    if (!user || !user.email) {
      setError("No signed-in email account was found.");
      return;
    }
    if (!password.trim()) {
      setError("Enter your password to confirm account deletion.");
      return;
    }

    setStage("deleting");
    setError(null);

    try {
      const uid = user.uid;
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);

      await Promise.allSettled([
        deleteDoc(doc(db, "users", uid)),
        deleteDoc(doc(db, "ladderUsers", uid)),
        deleteOwnedDocs("leaderboard", uid),
        deleteOwnedDocs("weeklyLeaderboard", uid),
        deleteOwnedDocs("globalLeaderboard", uid),
        deleteOwnedDocs("seasonLeaderboard", uid),
        deleteOwnedDocs("seasonUsers", uid),
        removeFromDailyLeaderboards(uid),
      ]);

      try { await Purchases.logOut(); } catch {}
      await AsyncStorage.multiRemove(LOCAL_ACCOUNT_KEYS);
      await deleteUser(user);
      router.replace("/signup");
    } catch (err: any) {
      const code = err?.code ?? "";
      if (code.includes("wrong-password") || code.includes("invalid-credential")) {
        setError("That password is incorrect. Please try again.");
      } else if (code.includes("requires-recent-login")) {
        setError("For security, please log out, log back in, then delete the account again.");
      } else {
        setError("Account deletion failed. Please try again.");
      }
      setStage("password");
    }
  };

  return (
    <ImageBackground source={bg} style={styles.bg} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.kicker}>SECURE PROFILE</Text>
            <Text style={styles.screenTitle}>Manage Account</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={["rgba(255,255,255,0.98)", "rgba(231,247,255,0.96)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroCopy}>
            <Text style={styles.heroEyebrow}>Account Control</Text>
            <Text style={styles.heroTitle}>Your Sweirki account</Text>
            <Text style={styles.heroSubtitle}>Security, purchases, and permanent account deletion.</Text>
          </View>
          <Image source={accountIcon} style={styles.heroIcon} resizeMode="contain" />
        </LinearGradient>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Account</Text>
          <InfoRow icon="mail-outline" title="Email" value={email} />
          <InfoRow icon="calendar-outline" title="Created" value={createdAt} />
          <InfoRow icon="diamond-outline" title="Status" value={isPremium ? "Premium Player" : "Standard Player"} isLast />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Security</Text>
          <ActionRow icon="key-outline" title="Change Password" subtitle="Send a reset link to your email" onPress={resetPassword} />
          <ActionRow icon="log-out-outline" title="Sign Out" subtitle="Leave this device safely" onPress={logout} isLast danger />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Purchases</Text>
          <View style={styles.premiumRow}>
            <Image source={premiumIcon} style={styles.premiumIcon} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{isPremium ? "Premium Active" : "Standard Access"}</Text>
              <Text style={styles.rowSubtitle}>{isPremium ? "Premium variants and leaderboards are unlocked." : "Restore if you already purchased Premium."}</Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.86} style={styles.restoreButton} onPress={restorePurchases}>
            <Ionicons name="refresh" size={18} color="#157FE6" />
            <Text style={styles.restoreText}>Restore Purchases</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionCard, styles.dangerCard]}>
          <Text style={styles.dangerTitle}>Danger Zone</Text>
          <Text style={styles.dangerCopy}>Permanently delete your account and cloud profile data. This cannot be undone.</Text>
          <TouchableOpacity activeOpacity={0.86} style={styles.deleteButton} onPress={() => setStage("confirm")}>
            <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
            <Text style={styles.deleteText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <MessageModal message={message} onClose={() => setMessage(null)} />
      <DeleteModal
        stage={stage}
        password={password}
        error={error}
        onPasswordChange={setPassword}
        onCancel={() => { setStage("idle"); setPassword(""); setError(null); }}
        onContinue={() => setStage("password")}
        onDelete={deleteAccount}
      />
    </ImageBackground>
  );
}

function InfoRow({ icon, title, value, isLast }: { icon: keyof typeof Ionicons.glyphMap; title: string; value: string; isLast?: boolean }) {
  return (
    <View style={[styles.infoRow, isLast && styles.lastRow]}>
      <View style={styles.rowIconBubble}><Ionicons name={icon} size={19} color="#168FDB" /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({ icon, title, subtitle, onPress, danger, isLast }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string; onPress: () => void; danger?: boolean; isLast?: boolean }) {
  return (
    <TouchableOpacity activeOpacity={0.86} style={[styles.infoRow, isLast && styles.lastRow]} onPress={onPress}>
      <View style={[styles.rowIconBubble, danger && styles.dangerBubble]}><Ionicons name={icon} size={19} color={danger ? "#E55364" : "#168FDB"} /></View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && styles.dangerRowTitle]}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#8AA9C1" />
    </TouchableOpacity>
  );
}

function MessageModal({ message, onClose }: { message: { title: string; text: string } | null; onClose: () => void }) {
  return (
    <Modal transparent visible={!!message} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={["rgba(255,255,255,0.99)", "rgba(232,247,255,0.98)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalCard}
        >
          <View style={styles.modalIconBubble}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#168FDB" />
          </View>
          <Text style={styles.modalTitle}>{message?.title}</Text>
          <Text style={styles.modalText}>{message?.text}</Text>
          <Pressable style={styles.modalPrimary} onPress={onClose}>
            <Text style={styles.modalPrimaryText}>OK</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function DeleteModal({ stage, password, error, onPasswordChange, onCancel, onContinue, onDelete }: { stage: DeleteStage; password: string; error: string | null; onPasswordChange: (value: string) => void; onCancel: () => void; onContinue: () => void; onDelete: () => void }) {
  const visible = stage !== "idle";
  const deleting = stage === "deleting";
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={deleting ? undefined : onCancel}>
      <View style={styles.overlay}>
        <LinearGradient
          colors={["rgba(255,255,255,0.99)", "rgba(255,247,249,0.98)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.modalCard}
        >
          <View style={[styles.modalIconBubble, styles.modalDangerIconBubble]}>
            <Ionicons name="warning-outline" size={28} color="#E55364" />
          </View>
          <Text style={styles.modalTitle}>Delete account?</Text>
          {stage === "confirm" && (
            <>
              <Text style={styles.modalText}>This permanently removes your account access and saved cloud profile data. This action cannot be undone.</Text>
              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancel} onPress={onCancel}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
                <Pressable style={styles.modalDanger} onPress={onContinue}><Text style={styles.modalDangerText}>Continue</Text></Pressable>
              </View>
            </>
          )}
          {stage === "password" && (
            <>
              <Text style={styles.modalText}>Enter your password to confirm permanent deletion.</Text>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={onPasswordChange}
                placeholder="Password"
                placeholderTextColor="#93A9BA"
                secureTextEntry
              />
              {!!error && <Text style={styles.errorText}>{error}</Text>}
              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancel} onPress={onCancel}><Text style={styles.modalCancelText}>Cancel</Text></Pressable>
                <Pressable style={styles.modalDanger} onPress={onDelete}><Text style={styles.modalDangerText}>Delete</Text></Pressable>
              </View>
            </>
          )}
          {deleting && (
            <View style={styles.deletingWrap}>
              <ActivityIndicator color="#E55364" />
              <Text style={styles.modalText}>Deleting account...</Text>
            </View>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

export default function AccountScreen() {
  return <RequireAuth><AccountInner /></RequireAuth>;
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#EAF6FF" },
  scroll: { paddingTop: 54, paddingHorizontal: 20, paddingBottom: 32, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(149,205,237,0.46)", alignItems: "center", justifyContent: "center" },
  backText: { color: "#14385F", fontSize: 30, fontWeight: "900", lineHeight: 36, marginTop: -3 },
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 10 },
  headerSpacer: { width: 44 },
  kicker: { fontFamily: "BalooBold", fontSize: 12, letterSpacing: 1.5, color: "#168FDB" },
  screenTitle: { fontFamily: "BalooBold", fontSize: 24, lineHeight: 32, color: "#143D66" },
  heroCard: { minHeight: 128, borderRadius: 30, paddingVertical: 16, paddingLeft: 20, paddingRight: 8, flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "rgba(149,205,237,0.42)", shadowColor: "#5DAEE8", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  heroCopy: { flex: 1, paddingRight: 6 },
  heroEyebrow: { fontFamily: "BalooBold", color: "#2E9BD8", fontSize: 12, textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 4 },
  heroTitle: { fontFamily: "BalooBold", color: "#14385F", fontSize: 23, lineHeight: 29 },
  heroSubtitle: { fontFamily: "BalooRegular", color: "#5E7F9B", fontSize: 13, lineHeight: 18, marginTop: 5 },
  heroIcon: { width: 108, height: 108 },
  sectionCard: { borderRadius: 28, padding: 15, backgroundColor: "rgba(255,255,255,0.93)", borderWidth: 1, borderColor: "rgba(149,205,237,0.38)", shadowColor: "#72BFEF", shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  sectionTitle: { fontFamily: "BalooBold", color: "#14385F", fontSize: 16, marginBottom: 4 },
  infoRow: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 11, borderBottomWidth: 1, borderBottomColor: "rgba(196,225,244,0.76)", paddingVertical: 9 },
  lastRow: { borderBottomWidth: 0 },
  rowIconBubble: { width: 42, height: 42, borderRadius: 18, backgroundColor: "#EAF6FF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D1E9FA" },
  dangerBubble: { backgroundColor: "#FFF0F3", borderColor: "#FFD0DA" },
  rowTitle: { fontFamily: "BalooBold", color: "#14385F", fontSize: 14 },
  dangerRowTitle: { color: "#E55364" },
  rowSubtitle: { fontFamily: "BalooRegular", color: "#6F8EA6", fontSize: 12.5, lineHeight: 17, marginTop: 1 },
  premiumRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  premiumIcon: { width: 50, height: 50 },
  restoreButton: { height: 46, borderRadius: 18, borderWidth: 1.5, borderColor: "#5CAFFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, backgroundColor: "rgba(255,255,255,0.82)", marginTop: 8 },
  restoreText: { fontFamily: "BalooBold", color: "#157FE6", fontSize: 14 },
  dangerCard: { borderColor: "#FFD0DA", backgroundColor: "rgba(255,248,249,0.95)" },
  dangerTitle: { fontFamily: "BalooBold", color: "#E55364", fontSize: 17 },
  dangerCopy: { fontFamily: "BalooRegular", color: "#805563", fontSize: 13, lineHeight: 18, marginTop: 4 },
  deleteButton: { height: 46, borderRadius: 18, backgroundColor: "#E55364", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, marginTop: 12 },
  deleteText: { fontFamily: "BalooBold", color: "#FFFFFF", fontSize: 14 },
  overlay: { flex: 1, backgroundColor: "rgba(16,44,80,0.52)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: 30, padding: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: "#CBE9FB", shadowColor: "#4BADE9", shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  modalIconBubble: { width: 54, height: 54, borderRadius: 22, backgroundColor: "#EAF6FF", borderWidth: 1, borderColor: "#CBE9FB", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  modalDangerIconBubble: { backgroundColor: "#FFF0F3", borderColor: "#FFD0DA" },
  modalTitle: { fontFamily: "BalooBold", fontSize: 22, color: "#143D66" },
  modalText: { fontFamily: "BalooRegular", fontSize: 15, color: "#718CAC", marginVertical: 12, lineHeight: 21 },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  modalCancel: { flex: 1, height: 50, borderRadius: 18, backgroundColor: "#EDF6FF", alignItems: "center", justifyContent: "center" },
  modalPrimary: { height: 50, borderRadius: 18, backgroundColor: "#157FE6", alignItems: "center", justifyContent: "center", marginTop: 4 },
  modalDanger: { flex: 1, height: 50, borderRadius: 18, backgroundColor: "#E55364", alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontFamily: "BalooBold", color: "#143D66" },
  modalPrimaryText: { fontFamily: "BalooBold", color: "#fff" },
  modalDangerText: { fontFamily: "BalooBold", color: "#fff" },
  passwordInput: { height: 50, borderRadius: 17, borderWidth: 1, borderColor: "#CBE9FB", backgroundColor: "#F7FCFF", paddingHorizontal: 14, fontFamily: "BalooRegular", color: "#143D66", fontSize: 15, marginBottom: 8 },
  errorText: { fontFamily: "BalooBold", color: "#E55364", fontSize: 12.5, marginBottom: 8 },
  deletingWrap: { alignItems: "center", paddingTop: 8 },
});
