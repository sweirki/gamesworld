import React, { useEffect, useState } from "react";
import {
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
import * as ImagePicker from "expo-image-picker";
import Purchases from "react-native-purchases";
import { useRouter } from "expo-router";
import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from "firebase/firestore";
import RequireAuth from "./RequireAuth";
import { auth, db } from "../firebase";
import { useRevenueCat } from "../src/hooks/useRevenueCat";
import { ACHIEVEMENTS, useAchievementsStore } from "./stores/useAchievementsStore";
import { getLadderRank, getSeasonRank } from "../utils/ladder/scoreEngine";

const SEASON_LENGTH_DAYS = 28;
const SEASON_START = new Date("2025-01-01").getTime();

function getCurrentSeasonId() {
  const diffDays = Math.floor((Date.now() - SEASON_START) / 86400000);
  return Math.floor(diffDays / SEASON_LENGTH_DAYS);
}

type Stats = {
  ladderXP: number;
  ladderRank: string;
  seasonXP: number;
  seasonRank: string;
};

const bronzeAsset = require("../assets/branding/profile/badge-bronze.png");
const avatarAsset = require("../assets/branding/profile/profile-avatar.png");
const seasonAsset = require("../assets/branding/profile/season-sprint.png");
const ladderAsset = require("../assets/branding/profile/ladder-lock.png");
const progressAsset = require("../assets/branding/profile/progress-icon.png");
const historyAsset = require("../assets/branding/profile/history-icon.png");
const statsAsset = require("../assets/branding/profile/stats-icon.png");
const premiumAsset = require("../assets/branding/profile/premium-card.png");
const shieldAsset = require("../assets/branding/profile/account-shield.png");

function ProfileInner() {
  const { isPremium, refresh } = useRevenueCat();
  const router = useRouter();
  const unlocked = useAchievementsStore((s) => s.unlocked);
  const totalPoints = useAchievementsStore((s) => s.getTotalPoints());
  const achievementLevel = useAchievementsStore((s) => s.getLevel());
  const progress = useAchievementsStore((s) => s.getProgressPercent());

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [logoutVisible, setLogoutVisible] = useState(false);
  const [seasonChange, setSeasonChange] = useState<{ from: string; to: string; direction: "up" | "down" } | null>(null);
  const [stats, setStats] = useState<Stats>({ ladderXP: 0, ladderRank: "Bronze", seasonXP: 0, seasonRank: "Bronze" });

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;
      setEmail(user.email);

      const cachedName = await AsyncStorage.getItem("username");
      const cachedAvatar = await AsyncStorage.getItem("avatarUri");
      if (cachedName) setUsername(cachedName);
      if (cachedAvatar) setAvatarUri(cachedAvatar);

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const d = snap.data();
        if (d.username) {
          setUsername(d.username);
          await AsyncStorage.setItem("username", d.username);
        }
        if (d.avatarUri) {
          setAvatarUri(d.avatarUri);
          await AsyncStorage.setItem("avatarUri", d.avatarUri);
        }
      }

      let ladderXP = 0;
      let seasonXP = 0;
      try {
        const ladderSnap = await getDoc(doc(db, "ladderUsers", user.uid));
        ladderXP = ladderSnap.exists() ? ladderSnap.data().xp ?? 0 : 0;
      } catch {}
      try {
        const seasonId = getCurrentSeasonId();
        const seasonSnap = await getDoc(doc(db, "seasonUsers", `${seasonId}_${user.uid}`));
        seasonXP = seasonSnap.exists() ? seasonSnap.data().xp ?? 0 : 0;
      } catch {}

      const newSeasonRank = getSeasonRank(seasonXP);
      setStats({ ladderXP, ladderRank: getLadderRank(ladderXP), seasonXP, seasonRank: newSeasonRank });

      try {
        const lastSeasonRank = await AsyncStorage.getItem("lastSeasonRank");
        if (lastSeasonRank && lastSeasonRank !== newSeasonRank) {
          const tiers = ["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Grandmaster"];
          const fromIndex = tiers.indexOf(lastSeasonRank);
          const toIndex = tiers.indexOf(newSeasonRank);
          if (fromIndex !== -1 && toIndex !== -1) setSeasonChange({ from: lastSeasonRank, to: newSeasonRank, direction: toIndex > fromIndex ? "up" : "down" });
        }
        await AsyncStorage.setItem("lastSeasonRank", newSeasonRank);
      } catch {}
    };
    load();
  }, []);

  const saveProfile = async (name: string, avatar?: string | null) => {
    const user = auth.currentUser;
    if (!user) return;
    setUsername(name);
    await AsyncStorage.setItem("username", name);

    if (avatar !== undefined) {
      if (avatar) {
        setAvatarUri(avatar);
        await AsyncStorage.setItem("avatarUri", avatar);
      } else {
        setAvatarUri(null);
        await AsyncStorage.removeItem("avatarUri");
      }
    }

    await setDoc(doc(db, "users", user.uid), { username: name, avatarUri: avatar ?? "" }, { merge: true });

    const snap = await getDocs(collection(db, "leaderboard"));
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      if (d.data().uid === user.uid) batch.update(doc(db, "leaderboard", d.id), { username: name, avatarUri: avatar ?? "" });
    });
    await batch.commit();
  };

  const pickImage = async (camera = false) => {
    const res = camera
      ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1] });
    if (!res.canceled) saveProfile(username, res.assets[0].uri);
  };

  const confirmLogout = async () => {
    setLogoutVisible(false);
    try { await Purchases.logOut(); } catch {}
    await AsyncStorage.multiRemove(["uid", "email", "username", "avatarUri", "lastSeasonRank"]);
    await auth.signOut();
    router.replace("/login");
  };

  const seasonPercent = Math.max(4, Math.min(100, Math.round((stats.seasonXP / 1000) * 100)));
  const achievementPercent = Math.max(4, Math.min(100, Math.round(progress)));
  const displayName = username || "Player";

  return (
    <ImageBackground source={require("../assets/branding/home-background.png")} style={styles.bg} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable style={styles.circleButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color="#153D66" /></Pressable>
          <View style={styles.headerText}><Text style={styles.kicker}>PLAYER IDENTITY</Text><Text style={styles.title}>Your Profile</Text></View>
          <Pressable style={styles.circleButton} onPress={() => router.push("/settings")}><Ionicons name="settings-outline" size={24} color="#153D66" /></Pressable>
        </View>

        <View style={styles.identityCard}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => pickImage(false)} style={styles.avatarWrap}>
            <Image source={avatarUri ? { uri: avatarUri } : avatarAsset} style={styles.avatar} />
            <View style={styles.editBubble}><Ionicons name={avatarUri ? "pencil" : "add"} size={20} color="#fff" /></View>
          </TouchableOpacity>
          <View style={styles.identityInfo}>
            <TextInput style={styles.username} value={username} placeholder="Username" placeholderTextColor="#7C98B6" onChangeText={setUsername} onEndEditing={() => saveProfile(username, avatarUri)} />
            <Text style={styles.avatarHint}>Tap avatar to update your photo</Text>
            <View style={styles.statusPill}><Ionicons name="star" size={15} color="#328FEA" /><Text style={styles.statusText}>{isPremium ? "Premium Player" : "Standard Player"}</Text></View>
            {seasonChange && <Text style={styles.notice}>{seasonChange.direction === "up" ? "Promoted to" : "Demoted to"} {seasonChange.to}</Text>}
            <View style={styles.actionRow}>
              <ProfileAction icon="image" label="Gallery" onPress={() => pickImage(false)} />
              <ProfileAction icon="camera" label="Camera" onPress={() => pickImage(true)} />
              <ProfileAction icon="trash" label="Reset" danger onPress={() => saveProfile(username, null)} />
            </View>
          </View>
        </View>

        <View style={styles.seasonCard}>
          <View style={styles.seasonTop}>
            <View style={styles.seasonLeft}>
              <Image source={seasonAsset} style={styles.smallArt} />
              <View style={{ flex: 1 }}><Text style={styles.sectionLabel}>SEASON PROGRESS</Text><Text style={styles.cardTitle}>Summer Sprint</Text><Text style={styles.muted}>Season rank locked</Text></View>
            </View>
            <View style={styles.premiumTile}><Image source={premiumAsset} style={styles.premiumArt} /><View><Text style={styles.premiumTitle}>Premium</Text><Text style={styles.premiumSub}>Rewards</Text></View></View>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${seasonPercent}%` }]} /></View>
          <View style={styles.seasonFooter}><Text style={styles.muted}>{stats.seasonXP} XP</Text><Text style={styles.linkText}>Next reward ›</Text></View>
        </View>

        <View style={styles.twoCol}>
          <MiniLock title="Ladder" value={isPremium ? stats.ladderRank : "Locked"} subtitle={isPremium ? `${stats.ladderXP} XP` : "Premium feature"} />
          <MiniLock title="Season" value={isPremium ? stats.seasonRank : "Locked"} subtitle={isPremium ? `${stats.seasonXP} XP` : "Premium feature"} />
        </View>

        <View style={styles.achievementCard}>
          <Image source={bronzeAsset} style={styles.badgeArt} />
          <View style={{ flex: 1 }}><Text style={styles.sectionLabel}>ACHIEVEMENTS</Text><Text style={styles.bronzeTitle}>Level {achievementLevel}</Text><Text style={styles.muted}>{unlocked.length} unlocked achievements</Text><View style={styles.progressTrack}><View style={[styles.bronzeFill, { width: `${achievementPercent}%` }]} /></View></View>
          <View style={styles.pointsRing}><Text style={styles.pointsValue}>{totalPoints}</Text><Text style={styles.pointsLabel}>pts</Text></View>
        </View>

        <View style={styles.quickRow}>
          <QuickCard icon={progressAsset} title="Progress" subtitle="Your journey" onPress={() => router.push("/progress")} />
          <QuickCard icon={historyAsset} title="History" subtitle="Recent games" onPress={() => router.push("/history")} />
          <QuickCard icon={statsAsset} title="Stats" subtitle="Performance" onPress={() => router.push("/stats")} />
        </View>

        <View style={styles.accountCard}>
          <View style={styles.accountTop}><Image source={shieldAsset} style={styles.shield} /><View style={{ flex: 1 }}><Text style={styles.sectionLabel}>ACCOUNT</Text>{email && <Text style={styles.accountText}>{email}</Text>}<Text style={styles.accountText}>Status: <Text style={styles.accountStrong}>{isPremium ? "Premium" : "Standard"}</Text></Text></View></View>
          {!isPremium && <TouchableOpacity activeOpacity={0.85} style={styles.premiumLink} onPress={() => router.push("/upgrade")}><Ionicons name="diamond" size={16} color="#766AF6" /><Text style={styles.premiumLinkText}>View Premium options</Text><Ionicons name="chevron-forward" size={18} color="#766AF6" /></TouchableOpacity>}
          <View style={styles.accountButtons}><TouchableOpacity activeOpacity={0.85} style={styles.restoreBtn} onPress={async () => { try { const result = await Purchases.restorePurchases(); await refresh(); setRestoreMessage(result?.entitlements?.active?.premium ? "Premium restored successfully" : "No previous purchases found for this account"); } catch { setRestoreMessage("Restore unavailable on this app version"); } }}><Ionicons name="refresh" size={18} color="#157FE6" /><Text style={styles.restoreText}>Restore Purchases</Text></TouchableOpacity><TouchableOpacity activeOpacity={0.85} style={styles.logoutBtn} onPress={() => setLogoutVisible(true)}><Ionicons name="log-out-outline" size={18} color="#E55364" /><Text style={styles.logoutText}>Log out</Text></TouchableOpacity></View>
        </View>
      </ScrollView>

      <ConfirmModal visible={logoutVisible} title="Log out" text="Are you sure you want to log out?" onCancel={() => setLogoutVisible(false)} onConfirm={confirmLogout} />
      <InfoModal visible={!!restoreMessage} text={restoreMessage ?? ""} onClose={() => setRestoreMessage(null)} />
    </ImageBackground>
  );
}

function ProfileAction({ icon, label, danger, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; danger?: boolean; onPress: () => void }) {
  return <TouchableOpacity activeOpacity={0.85} style={[styles.iconAction, danger && styles.dangerAction]} onPress={onPress}><Ionicons name={icon} size={20} color={danger ? "#E55364" : "#157FE6"} /><Text style={[styles.iconActionText, danger && styles.dangerText]}>{label}</Text></TouchableOpacity>;
}
function MiniLock({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return <View style={styles.miniCard}><View><Text style={styles.sectionLabel}>{title.toUpperCase()}</Text><Text style={styles.miniValue}>{value}</Text><Text style={styles.muted}>{subtitle}</Text></View><Image source={ladderAsset} style={styles.lockArt} /></View>;
}
function QuickCard({ icon, title, subtitle, onPress }: { icon: any; title: string; subtitle: string; onPress: () => void }) {
  return <TouchableOpacity activeOpacity={0.86} style={styles.quickCard} onPress={onPress}><Image source={icon} style={styles.quickIcon} /><Text style={styles.quickTitle}>{title}</Text><Text style={styles.quickSub}>{subtitle}</Text></TouchableOpacity>;
}
function ConfirmModal({ visible, title, text, onCancel, onConfirm }: { visible: boolean; title: string; text: string; onCancel: () => void; onConfirm: () => void }) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}><View style={styles.modalOverlay}><View style={styles.modalCard}><Text style={styles.modalTitle}>{title}</Text><Text style={styles.modalText}>{text}</Text><View style={styles.modalActions}><TouchableOpacity style={styles.modalCancel} onPress={onCancel}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.modalConfirm} onPress={onConfirm}><Text style={styles.modalConfirmText}>Log out</Text></TouchableOpacity></View></View></View></Modal>;
}
function InfoModal({ visible, text, onClose }: { visible: boolean; text: string; onClose: () => void }) {
  return <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={styles.modalCard}><Text style={styles.modalTitle}>Restore Purchases</Text><Text style={styles.modalText}>{text}</Text><TouchableOpacity style={styles.modalSingleConfirm} onPress={onClose}><Text style={styles.modalConfirmText}>OK</Text></TouchableOpacity></View></View></Modal>;
}

export default function ProfileScreen() {
  return <RequireAuth><ProfileInner /></RequireAuth>;
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#EAF6FF" },
  scroll: { paddingTop: 48, paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  headerText: { flex: 1, marginHorizontal: 18 },
  circleButton: { width: 52, height: 52, borderRadius: 26, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(123,204,245,0.42)", alignItems: "center", justifyContent: "center", shadowColor: "#58BCEB", shadowOpacity: 0.14, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  kicker: { fontFamily: "BalooBold", fontSize: 14, letterSpacing: 2, color: "#168FDB" },
  title: { fontFamily: "BalooBold", fontSize: 32, lineHeight: 38, color: "#153D66" },
  identityCard: { minHeight: 144, borderRadius: 30, padding: 16, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(139,210,246,0.34)", flexDirection: "row", alignItems: "center", shadowColor: "#7ACCF2", shadowOpacity: 0.16, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  avatarWrap: { width: 96, height: 96, borderRadius: 48, backgroundColor: "#EAF7FF", alignItems: "center", justifyContent: "center", marginRight: 14 },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  editBubble: { position: "absolute", right: -1, bottom: -1, width: 32, height: 32, borderRadius: 16, backgroundColor: "#3D8DFF", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff" },
  identityInfo: { flex: 1, minWidth: 0 },
  username: { fontFamily: "BalooBold", fontSize: 25, color: "#123B64", paddingVertical: 0, marginBottom: -2 },
  avatarHint: { fontFamily: "BalooRegular", fontSize: 13, color: "#6C89A8", marginBottom: 5 },
  statusPill: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, backgroundColor: "#E7F2FF", borderWidth: 1, borderColor: "#C4E0FF" },
  statusText: { fontFamily: "BalooBold", color: "#2776CE", fontSize: 13 },
  notice: { marginTop: 6, color: "#38A56E", fontFamily: "BalooBold", fontSize: 12 },
  actionRow: { flexDirection: "row", gap: 7, marginTop: 8 },
  iconAction: { minWidth: 62, height: 38, paddingHorizontal: 8, borderRadius: 16, backgroundColor: "#EEF7FF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 4, borderWidth: 1, borderColor: "#D1E8FF" },
  dangerAction: { backgroundColor: "#FFF0F3", borderColor: "#FFD0DA" },
  iconActionText: { fontFamily: "BalooBold", fontSize: 10, color: "#157FE6" },
  dangerText: { color: "#E55364" },
  seasonCard: { borderRadius: 28, padding: 16, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(139,210,246,0.34)", overflow: "hidden", shadowColor: "#8ED7F2", shadowOpacity: 0.12, shadowRadius: 15, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  seasonTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  seasonLeft: { flex: 1, flexDirection: "row", alignItems: "center" },
  smallArt: { width: 52, height: 52, marginRight: 9 },
  sectionLabel: { fontFamily: "BalooBold", fontSize: 13, letterSpacing: 1.3, color: "#168FDB" },
  cardTitle: { fontFamily: "BalooBold", fontSize: 24, lineHeight: 28, color: "#143D66" },
  muted: { fontFamily: "BalooRegular", fontSize: 13.5, color: "#718CAC" },
  progressTrack: { height: 10, borderRadius: 8, backgroundColor: "#E4F0FA", overflow: "hidden", marginTop: 9 },
  progressFill: { height: "100%", borderRadius: 8, backgroundColor: "#8EBBFF" },
  bronzeFill: { height: "100%", borderRadius: 8, backgroundColor: "#C97840" },
  seasonFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 7 },
  linkText: { fontFamily: "BalooBold", color: "#143D66", fontSize: 15 },
  premiumTile: { width: 120, height: 70, borderRadius: 22, backgroundColor: "#FFF6DF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, borderWidth: 1, borderColor: "#FFE4A0" },
  premiumArt: { width: 34, height: 34 },
  premiumTitle: { fontFamily: "BalooBold", fontSize: 15, color: "#6D57D7" },
  premiumSub: { fontFamily: "BalooRegular", fontSize: 11, color: "#796FA7" },
  twoCol: { flexDirection: "row", gap: 12 },
  miniCard: { flex: 1, minHeight: 88, borderRadius: 23, padding: 14, backgroundColor: "rgba(255,255,255,0.88)", borderWidth: 1, borderColor: "rgba(139,210,246,0.3)", flexDirection: "row", justifyContent: "space-between", alignItems: "center", overflow: "hidden" },
  miniValue: { fontFamily: "BalooBold", fontSize: 21, color: "#143D66", marginTop: 2 },
  lockArt: { width: 46, height: 46, opacity: 0.9 },
  achievementCard: { minHeight: 108, borderRadius: 28, padding: 15, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(139,210,246,0.34)", flexDirection: "row", alignItems: "center", gap: 10 },
  badgeArt: { width: 66, height: 66 },
  bronzeTitle: { fontFamily: "BalooBold", fontSize: 22, color: "#A65D31" },
  pointsRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 5, borderColor: "#E8EDFF", backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  pointsValue: { fontFamily: "BalooBold", fontSize: 24, color: "#2D52D9" },
  pointsLabel: { fontFamily: "BalooBold", fontSize: 11, color: "#6885A7", marginTop: -5 },
  quickRow: { flexDirection: "row", gap: 10 },
  quickCard: { flex: 1, minHeight: 72, borderRadius: 20, padding: 10, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(139,210,246,0.28)", justifyContent: "center" },
  quickIcon: { width: 30, height: 30, marginBottom: 2 },
  quickTitle: { fontFamily: "BalooBold", color: "#143D66", fontSize: 15 },
  quickSub: { fontFamily: "BalooRegular", color: "#718CAC", fontSize: 12 },
  accountCard: { borderRadius: 28, padding: 15, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(139,210,246,0.34)", marginBottom: 8 },
  accountTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  shield: { width: 58, height: 58 },
  accountText: { fontFamily: "BalooRegular", color: "#153D66", fontSize: 15, marginTop: 2 },
  accountStrong: { fontFamily: "BalooBold", color: "#157FE6" },
  premiumLink: { marginTop: 12, borderTopWidth: 1, borderTopColor: "#DDECF7", paddingTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  premiumLinkText: { fontFamily: "BalooBold", color: "#766AF6", fontSize: 14 },
  accountButtons: { flexDirection: "row", gap: 10, marginTop: 11 },
  restoreBtn: { flex: 1, height: 44, borderRadius: 18, borderWidth: 1.5, borderColor: "#5CAFFF", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: "rgba(255,255,255,0.75)" },
  restoreText: { fontFamily: "BalooBold", color: "#157FE6", fontSize: 14 },
  logoutBtn: { flex: 1, height: 44, borderRadius: 18, borderWidth: 1, borderColor: "#FFC9D1", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, backgroundColor: "#FFF3F5" },
  logoutText: { fontFamily: "BalooBold", color: "#E55364", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(16,44,80,0.35)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: 28, padding: 22, backgroundColor: "#fff", borderWidth: 1, borderColor: "#CBE9FB" },
  modalTitle: { fontFamily: "BalooBold", fontSize: 24, color: "#143D66" },
  modalText: { fontFamily: "BalooRegular", fontSize: 16, color: "#718CAC", marginVertical: 12 },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, height: 50, borderRadius: 18, backgroundColor: "#EDF6FF", alignItems: "center", justifyContent: "center" },
  modalConfirm: { flex: 1, height: 50, borderRadius: 18, backgroundColor: "#E55364", alignItems: "center", justifyContent: "center" },
  modalSingleConfirm: { height: 50, borderRadius: 18, backgroundColor: "#157FE6", alignItems: "center", justifyContent: "center", marginTop: 4 },
  modalCancelText: { fontFamily: "BalooBold", color: "#143D66" },
  modalConfirmText: { fontFamily: "BalooBold", color: "#fff" },
});
