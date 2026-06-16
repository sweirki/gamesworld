import React, { useCallback, useState } from "react";
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import Purchases from "react-native-purchases";
import { sweirkiTheme } from "./theme/sweirkiTheme";
import { useRevenueCat } from "../src/hooks/useRevenueCat";
import { claimSeasonReward, ECONOMY_PRODUCTS, getSeasonLevelFromXp, getSeasonPassState, grantPurchasedProduct, SEASON_LEVEL_XP, SEASON_PASS_REWARDS, SeasonPassState, syncSeasonPassEntitlement } from "../src/economy/economyEngine";

const backgroundImage = require("../assets/branding/home-background.png");
type Message = { title: string; body: string } | null;

function getPurchaseKey(result: any, productIdentifier: string) {
  const transactionId =
    result?.transaction?.transactionIdentifier ??
    result?.transaction?.identifier ??
    result?.transaction?.originalTransactionIdentifier ??
    result?.customerInfo?.originalPurchaseDate ??
    null;
  return transactionId ? `${productIdentifier}:${transactionId}` : `${productIdentifier}:entitlement`;
}

export default function SeasonPassScreen() {
  const { hasSeasonPassEntitlement, getPackageByProductId, refresh } = useRevenueCat();
  const [state, setState] = useState<SeasonPassState | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    let alive = true;
    (async () => {
      const synced = hasSeasonPassEntitlement ? await syncSeasonPassEntitlement(true) : await getSeasonPassState();
      if (alive) setState(synced);
    })();
    return () => { alive = false; };
  }, [hasSeasonPassEntitlement]);
  useFocusEffect(load);

  const currentLevel = getSeasonLevelFromXp(state?.xp ?? 0);
  const progress = Math.min(1, ((state?.xp ?? 0) % SEASON_LEVEL_XP) / SEASON_LEVEL_XP);
  const nextLevelXp = SEASON_LEVEL_XP - ((state?.xp ?? 0) % SEASON_LEVEL_XP);

  const buyPass = async () => {
    const pkg = getPackageByProductId(ECONOMY_PRODUCTS.logicWarsPass);
    if (!pkg) { setMessage({ title: "Season Pass unavailable", body: "Create logic_wars_season_pass in Apple/Google and attach it to RevenueCat current offering." }); return; }
    setBusy("pass");
    try {
      const result = await Purchases.purchasePackage(pkg);
      await refresh();
      const purchaseKey = getPurchaseKey(result, ECONOMY_PRODUCTS.logicWarsPass);
      await grantPurchasedProduct(ECONOMY_PRODUCTS.logicWarsPass, { purchaseKey });
      setState(await syncSeasonPassEntitlement(true));
      setMessage({ title: "Season Pass active", body: "Premium track unlocked. Claim any earned rewards now." });
    } catch (e: any) {
      if (!e?.userCancelled) setMessage({ title: "Purchase failed", body: "The store could not complete this purchase right now." });
    } finally { setBusy(null); }
  };

  const claim = async (level: number, track: "free" | "premium") => {
    setBusy(`${track}-${level}`);
    try {
      const result = await claimSeasonReward(level, track);
      setState(await getSeasonPassState());
      setMessage({ title: result.ok ? "Reward claimed" : "Reward locked", body: result.ok ? `Level ${level} ${track} reward added.` : result.reason ?? "Not available yet." });
    } finally { setBusy(null); }
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.screen} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.circleButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={sweirkiTheme.colors.inkDeep} /></Pressable>
          <View style={styles.headerCenter}><Text style={styles.headerKicker}>SWEIRKI SEASON</Text><Text style={styles.headerTitle}>Season Pass</Text></View>
          <Pressable style={styles.circleButton} onPress={() => router.push("/shop" as any)}><Ionicons name="wallet" size={22} color={sweirkiTheme.colors.cyanDeep} /></Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}><Ionicons name="ribbon" size={26} color="#FFFFFF" /></View>
            <View style={styles.statusPill}><Ionicons name={state?.premium ? "checkmark-circle" : "lock-closed"} size={13} color={sweirkiTheme.colors.inkDeep} /><Text style={styles.statusText}>{state?.premium ? "PASS ACTIVE" : "PASS LOCKED"}</Text></View>
          </View>
          <Text style={styles.kicker}>SEASON 1</Text>
          <Text style={styles.heroTitle}>Logic Wars</Text>
          <Text style={styles.heroText}>Play Classic, Daily, Weekly, and Arena to earn Season XP. Free rewards are open to everyone; the pass unlocks the premium track.</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
          <View style={styles.progressRow}><Text style={styles.progressText}>Level {currentLevel}</Text><Text style={styles.progressSub}>{state?.xp ?? 0} XP • {nextLevelXp} XP to next</Text></View>
          {!state?.premium ? <TouchableOpacity style={styles.buyPassButton} onPress={buyPass} disabled={busy === "pass"} activeOpacity={0.88}><Text style={styles.buyPassText}>{busy === "pass" ? "Processing..." : "Unlock Premium Track"}</Text></TouchableOpacity> : <Text style={styles.activeText}>Premium track active</Text>}
        </View>

        <View style={styles.statGrid}>
          <View style={styles.statCard}><Ionicons name="star" size={19} color={sweirkiTheme.colors.gold} /><Text style={styles.statValue}>{currentLevel}</Text><Text style={styles.statLabel}>Level</Text></View>
          <View style={styles.statCard}><Ionicons name="flash" size={19} color={sweirkiTheme.colors.cyanDeep} /><Text style={styles.statValue}>{state?.xp ?? 0}</Text><Text style={styles.statLabel}>Season XP</Text></View>
          <View style={styles.statCard}><Ionicons name="gift" size={19} color={sweirkiTheme.colors.purple} /><Text style={styles.statValue}>{state?.premium ? "ON" : "FREE"}</Text><Text style={styles.statLabel}>Track</Text></View>
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionKicker}>REWARD ROAD</Text><Text style={styles.sectionTitle}>Claim earned rewards</Text></View>
        <View style={styles.rewardsList}>
          {SEASON_PASS_REWARDS.map((reward) => {
            const locked = reward.level > currentLevel;
            const freeClaimed = state?.claimedFreeLevels.includes(reward.level);
            const premiumClaimed = state?.claimedPremiumLevels.includes(reward.level);
            return (
              <View key={reward.level} style={styles.levelCard}>
                <View style={styles.levelBadge}><Text style={styles.levelNumber}>{reward.level}</Text><Text style={styles.levelLabel}>LVL</Text></View>
                <View style={styles.rewardStack}>
                  <View style={styles.rewardRow}><Text style={styles.rewardTrack}>FREE</Text><Text style={styles.rewardLabel}>{reward.free?.label ?? "—"}</Text><TouchableOpacity style={[styles.claimButton, (locked || freeClaimed) && styles.disabledButton]} disabled={locked || freeClaimed || busy === `free-${reward.level}`} onPress={() => claim(reward.level, "free")} activeOpacity={0.88}><Text style={[styles.claimText, (locked || freeClaimed) && styles.disabledClaimText]}>{freeClaimed ? "Claimed" : locked ? "Locked" : "Claim"}</Text></TouchableOpacity></View>
                  <View style={styles.rewardRow}><Text style={[styles.rewardTrack, styles.premiumTrack]}>PASS</Text><Text style={styles.rewardLabel}>{reward.premium?.label ?? "—"}</Text><TouchableOpacity style={[styles.claimButton, styles.passButton, (locked || premiumClaimed || !state?.premium) && styles.disabledButton]} disabled={locked || premiumClaimed || !state?.premium || busy === `premium-${reward.level}`} onPress={() => claim(reward.level, "premium")} activeOpacity={0.88}><Text style={[styles.claimText, styles.passClaimText]}>{premiumClaimed ? "Claimed" : !state?.premium ? "Pass" : locked ? "Locked" : "Claim"}</Text></TouchableOpacity></View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <Modal visible={!!message} transparent animationType="fade" onRequestClose={() => setMessage(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalIcon}><Ionicons name="ribbon" size={26} color="#FFFFFF" /></View><Text style={styles.modalTitle}>{message?.title}</Text><Text style={styles.modalText}>{message?.body}</Text><TouchableOpacity style={styles.modalButton} onPress={() => setMessage(null)} activeOpacity={0.88}><Text style={styles.modalButtonText}>OK</Text></TouchableOpacity></View></View></Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 18, paddingTop: 58, paddingBottom: 36 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  headerCenter: { alignItems: "center", flex: 1 },
  headerKicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 9, letterSpacing: 2.5, color: sweirkiTheme.colors.cyanDeep, textTransform: "uppercase", marginBottom: 2 },
  headerTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 24, color: sweirkiTheme.colors.inkDeep },
  circleButton: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.glassCard },

  heroCard: { borderRadius: 30, padding: 20, marginBottom: 12, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, overflow: "hidden", ...sweirkiTheme.shadows.hero },
  heroGlow: { position: "absolute", right: -38, top: -54, width: 178, height: 178, borderRadius: 89, backgroundColor: "rgba(245,185,67,0.18)" },
  heroTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  heroIcon: { width: 54, height: 54, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.gold, borderWidth: 1, borderColor: "rgba(255,255,255,0.65)", ...sweirkiTheme.shadows.glassCard },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6, height: 32, paddingHorizontal: 13, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.78)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan },
  statusText: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.inkDeep, fontSize: 9, letterSpacing: 1.3 },
  kicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, letterSpacing: 2.4, color: sweirkiTheme.colors.cyanDeep, textTransform: "uppercase" },
  heroTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 30, lineHeight: 35, color: sweirkiTheme.colors.inkDeep, marginTop: 6, maxWidth: "82%" },
  heroText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: sweirkiTheme.colors.textSoft, marginTop: 8, maxWidth: "92%" },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: "rgba(20,56,95,0.10)", overflow: "hidden", marginTop: 16 },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: sweirkiTheme.colors.gold },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 9 },
  progressText: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.inkDeep, fontSize: 14 },
  progressSub: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.textSoft, fontSize: 11 },
  buyPassButton: { marginTop: 14, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.inkDeep },
  buyPassText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 14 },
  activeText: { marginTop: 14, fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.cyanDeep },

  statGrid: { flexDirection: "row", gap: 10, marginBottom: 14 },
  statCard: { flex: 1, minHeight: 92, borderRadius: 22, padding: 12, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.glassCard },
  statValue: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 19, color: sweirkiTheme.colors.inkDeep, marginTop: 6 },
  statLabel: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 9, letterSpacing: 1.2, color: sweirkiTheme.colors.textSoft, textTransform: "uppercase", marginTop: 2 },

  sectionHeader: { borderRadius: 24, padding: 15, backgroundColor: "rgba(255,255,255,0.80)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan, marginBottom: 12 },
  sectionKicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 9, letterSpacing: 2.2, color: sweirkiTheme.colors.cyanDeep, textTransform: "uppercase" },
  sectionTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 19, color: sweirkiTheme.colors.inkDeep, marginTop: 4 },
  rewardsList: { gap: 12 },
  levelCard: { flexDirection: "row", gap: 12, borderRadius: 26, padding: 14, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.glassCard },
  levelBadge: { width: 48, height: 54, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(226,247,255,0.96)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  levelNumber: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.cyanDeep, fontSize: 18 },
  levelLabel: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.inkDeep, fontSize: 8, letterSpacing: 1.1, marginTop: 1 },
  rewardStack: { flex: 1, gap: 9 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 34 },
  rewardTrack: { width: 42, fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, color: sweirkiTheme.colors.cyanDeep },
  premiumTrack: { color: "#8A6420" },
  rewardLabel: { flex: 1, fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, lineHeight: 16, color: sweirkiTheme.colors.inkDeep },
  claimButton: { minWidth: 72, height: 34, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep },
  passButton: { backgroundColor: sweirkiTheme.colors.gold },
  disabledButton: { opacity: 1, backgroundColor: "rgba(185,224,247,0.88)" },
  claimText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 11 },
  disabledClaimText: { color: sweirkiTheme.colors.inkDeep },
  passClaimText: { color: sweirkiTheme.colors.inkDeep },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(7,22,40,0.58)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 360, borderRadius: 28, padding: 22, alignItems: "center", backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.hero },
  modalIcon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.gold, marginBottom: 12 },
  modalTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 20, color: sweirkiTheme.colors.inkDeep, textAlign: "center" },
  modalText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: sweirkiTheme.colors.textSoft, textAlign: "center", marginTop: 8 },
  modalButton: { marginTop: 16, minWidth: 150, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.inkDeep },
  modalButtonText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 14 },
});

