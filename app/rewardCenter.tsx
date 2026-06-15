import React, { useCallback, useState } from "react";
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { sweirkiTheme } from "./theme/sweirkiTheme";
import { claimRewardedAdOffer, EconomyBalance, getEconomyBalance, REWARDED_AD_OFFERS, RewardedAdRewardId } from "../src/economy/economyEngine";
import { showRewarded } from "../utils/adsManager";

const backgroundImage = require("../assets/branding/home-background.png");

type Message = { title: string; body: string } | null;
const fmt = (n?: number) => String(Math.round(Number(n ?? 0)));

export default function RewardCenterScreen() {
  const [balance, setBalance] = useState<EconomyBalance | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  const refresh = useCallback(() => {
    let alive = true;
    getEconomyBalance().then((next) => alive && setBalance(next));
    return () => { alive = false; };
  }, []);
  useFocusEffect(refresh);

  const claim = async (offerId: RewardedAdRewardId) => {
    setBusy(offerId);
    try {
      const earned = await showRewarded();
      if (!earned) {
        setMessage({ title: "Reward not earned", body: "Finish the rewarded ad to collect the reward. Ads never appear while solving." });
        return;
      }
      const result = await claimRewardedAdOffer(offerId);
      setBalance(await getEconomyBalance());
      setMessage({ title: result.ok ? "Reward claimed" : "Limit reached", body: result.ok ? `${result.offer?.rewardLabel} was added to your wallet.` : result.reason ?? "Try again tomorrow." });
    } catch {
      setMessage({ title: "Ad unavailable", body: "Rewarded ads are not available right now. No currency was changed." });
    } finally { setBusy(null); }
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.screen} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.circleButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={sweirkiTheme.colors.inkDeep} /></Pressable>
          <Text style={styles.headerTitle}>Reward Center</Text>
          <View style={styles.circleButtonGhost} />
        </View>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>OPTIONAL ADS ONLY</Text>
          <Text style={styles.heroTitle}>Earn without interruptions.</Text>
          <Text style={styles.heroText}>Rewarded ads are always user-initiated. No banners, no interstitials, and no ads during Classic, Daily, or Arena boards.</Text>
          <View style={styles.walletRow}><Text style={styles.walletPill}>{fmt(balance?.wallet.coins)} Coins</Text><Text style={styles.walletPill}>{fmt(balance?.wallet.tickets)} Tickets</Text><Text style={styles.walletPill}>{fmt(balance?.wallet.ticketFragments)}/10 Fragments</Text></View>
        </View>
        <View style={styles.offerList}>
          {REWARDED_AD_OFFERS.map((offer) => {
            const used = balance?.wallet.adCenterClaimsToday?.[offer.id] ?? 0;
            const capped = used >= offer.dailyLimit;
            return (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerTop}>
                  <View style={styles.offerIcon}><Ionicons name="play-circle" size={24} color="#FFFFFF" /></View>
                  <View style={{ flex: 1 }}><Text style={styles.offerTitle}>{offer.title}</Text><Text style={styles.offerText}>{offer.subtitle}</Text></View>
                </View>
                <View style={styles.offerBottom}>
                  <Text style={styles.limitText}>{offer.rewardLabel} • {used}/{offer.dailyLimit} today</Text>
                  <TouchableOpacity style={[styles.claimButton, capped && styles.disabledButton]} onPress={() => claim(offer.id)} disabled={capped || busy === offer.id} activeOpacity={0.88}><Text style={styles.claimText}>{capped ? "Done" : busy === offer.id ? "Loading..." : "Watch"}</Text></TouchableOpacity>
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
  screen: { flex: 1 }, content: { padding: 18, paddingTop: 58, paddingBottom: 34 }, headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, circleButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.88)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong }, circleButtonGhost: { width: 46, height: 46 }, headerTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 23, color: sweirkiTheme.colors.inkDeep },
  heroCard: { borderRadius: 30, padding: 22, marginBottom: 14, backgroundColor: "rgba(12,48,92,0.94)", borderWidth: 1, borderColor: "rgba(255,255,255,0.38)", ...sweirkiTheme.shadows.hero }, kicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.66)" }, heroTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 30, color: "#FFFFFF", marginTop: 4 }, heroText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.76)", marginTop: 6 }, walletRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 }, walletPill: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.14)", overflow: "hidden" },
  offerList: { gap: 12 }, offerCard: { borderRadius: 26, padding: 16, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.glassCard }, offerTop: { flexDirection: "row", gap: 12 }, offerIcon: { width: 48, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep }, offerTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 18, color: sweirkiTheme.colors.inkDeep }, offerText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, color: sweirkiTheme.colors.textSoft, lineHeight: 17, marginTop: 3 }, offerBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 14 }, limitText: { flex: 1, fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.ink }, claimButton: { minWidth: 92, height: 42, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep }, disabledButton: { opacity: 0.45 }, claimText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(7,22,40,0.58)", alignItems: "center", justifyContent: "center", padding: 24 }, modalCard: { width: "100%", maxWidth: 360, borderRadius: 28, padding: 22, alignItems: "center", backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong }, modalTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 20, color: sweirkiTheme.colors.inkDeep, textAlign: "center" }, modalText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: sweirkiTheme.colors.textSoft, textAlign: "center", marginTop: 8 }, modalButton: { marginTop: 16, minWidth: 150, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.inkDeep }, modalButtonText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 14 },
});
