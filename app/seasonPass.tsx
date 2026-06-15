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
        <View style={styles.headerRow}><Pressable style={styles.circleButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={sweirkiTheme.colors.inkDeep} /></Pressable><Text style={styles.headerTitle}>Season Pass</Text><View style={styles.circleButtonGhost} /></View>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>SEASON 1</Text>
          <Text style={styles.heroTitle}>Logic Wars</Text>
          <Text style={styles.heroText}>Play Classic, Daily, Weekly, and Arena to earn Season XP. The free track is for everyone; Plus/Pass unlocks premium rewards.</Text>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} /></View>
          <Text style={styles.progressText}>Level {currentLevel} • {state?.xp ?? 0} XP</Text>
          {!state?.premium ? <TouchableOpacity style={styles.buyPassButton} onPress={buyPass} disabled={busy === "pass"}><Text style={styles.buyPassText}>{busy === "pass" ? "Processing..." : "Unlock Premium Track"}</Text></TouchableOpacity> : <Text style={styles.activeText}>Premium track active</Text>}
        </View>
        <View style={styles.rewardsList}>
          {SEASON_PASS_REWARDS.map((reward) => {
            const locked = reward.level > currentLevel;
            const freeClaimed = state?.claimedFreeLevels.includes(reward.level);
            const premiumClaimed = state?.claimedPremiumLevels.includes(reward.level);
            return (
              <View key={reward.level} style={styles.levelCard}>
                <View style={styles.levelBadge}><Text style={styles.levelNumber}>{reward.level}</Text></View>
                <View style={{ flex: 1, gap: 8 }}>
                  <View style={styles.rewardRow}><Text style={styles.rewardTrack}>FREE</Text><Text style={styles.rewardLabel}>{reward.free?.label ?? "—"}</Text><TouchableOpacity style={[styles.claimButton, (locked || freeClaimed) && styles.disabledButton]} disabled={locked || freeClaimed || busy === `free-${reward.level}`} onPress={() => claim(reward.level, "free")}><Text style={styles.claimText}>{freeClaimed ? "Claimed" : locked ? "Locked" : "Claim"}</Text></TouchableOpacity></View>
                  <View style={styles.rewardRow}><Text style={[styles.rewardTrack, styles.premiumTrack]}>PASS</Text><Text style={styles.rewardLabel}>{reward.premium?.label ?? "—"}</Text><TouchableOpacity style={[styles.claimButton, styles.passButton, (locked || premiumClaimed || !state?.premium) && styles.disabledButton]} disabled={locked || premiumClaimed || !state?.premium || busy === `premium-${reward.level}`} onPress={() => claim(reward.level, "premium")}><Text style={styles.claimText}>{premiumClaimed ? "Claimed" : !state?.premium ? "Pass" : locked ? "Locked" : "Claim"}</Text></TouchableOpacity></View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <Modal visible={!!message} transparent animationType="fade" onRequestClose={() => setMessage(null)}><View style={styles.modalBackdrop}><View style={styles.modalCard}><Text style={styles.modalTitle}>{message?.title}</Text><Text style={styles.modalText}>{message?.body}</Text><TouchableOpacity style={styles.modalButton} onPress={() => setMessage(null)}><Text style={styles.modalButtonText}>OK</Text></TouchableOpacity></View></View></Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 18, paddingTop: 58, paddingBottom: 34 }, headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, circleButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.88)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong }, circleButtonGhost: { width: 46, height: 46 }, headerTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 23, color: sweirkiTheme.colors.inkDeep }, heroCard: { borderRadius: 30, padding: 22, marginBottom: 14, backgroundColor: "rgba(12,48,92,0.94)", borderWidth: 1, borderColor: "rgba(255,255,255,0.38)", ...sweirkiTheme.shadows.hero }, kicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.66)" }, heroTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 32, color: "#FFFFFF", marginTop: 4 }, heroText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.76)", marginTop: 6 }, progressTrack: { height: 10, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)", overflow: "hidden", marginTop: 16 }, progressFill: { height: "100%", borderRadius: 999, backgroundColor: sweirkiTheme.colors.gold }, progressText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 13, marginTop: 8 }, buyPassButton: { marginTop: 14, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.gold }, buyPassText: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.inkDeep, fontSize: 14 }, activeText: { marginTop: 14, fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.aqua }, rewardsList: { gap: 12 }, levelCard: { flexDirection: "row", gap: 12, borderRadius: 24, padding: 14, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong }, levelBadge: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.inkDeep }, levelNumber: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 18 }, rewardRow: { flexDirection: "row", alignItems: "center", gap: 8 }, rewardTrack: { width: 42, fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, color: sweirkiTheme.colors.cyanDeep }, premiumTrack: { color: sweirkiTheme.colors.gold }, rewardLabel: { flex: 1, fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.ink }, claimButton: { minWidth: 72, height: 34, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep }, passButton: { backgroundColor: sweirkiTheme.colors.gold }, disabledButton: { opacity: 0.45 }, claimText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 11 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(7,22,40,0.58)", alignItems: "center", justifyContent: "center", padding: 24 }, modalCard: { width: "100%", maxWidth: 360, borderRadius: 28, padding: 22, alignItems: "center", backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong }, modalTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 20, color: sweirkiTheme.colors.inkDeep, textAlign: "center" }, modalText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: sweirkiTheme.colors.textSoft, textAlign: "center", marginTop: 8 }, modalButton: { marginTop: 16, minWidth: 150, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.inkDeep }, modalButtonText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 14 },
});
