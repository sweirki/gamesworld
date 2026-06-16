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
          <View style={styles.headerCenter}><Text style={styles.headerKicker}>SWEIRKI ECONOMY</Text><Text style={styles.headerTitle}>Reward Center</Text></View>
          <Pressable style={styles.circleButton} onPress={() => router.push("/shop" as any)}><Ionicons name="wallet" size={22} color={sweirkiTheme.colors.cyanDeep} /></Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroIcon}><View style={styles.heroPlayCircle}><Ionicons name="play" size={26} color="#FFFFFF" /></View></View>
          <Text style={styles.kicker}>OPTIONAL ADS ONLY</Text>
          <Text style={styles.heroTitle}>Earn rewards on your terms.</Text>
          <Text style={styles.heroText}>Rewarded ads are always user-initiated. No banners, no interstitials, and no ads during Classic, Daily, or Arena boards.</Text>
          <View style={styles.walletRow}>
            <View style={styles.walletPill}><Ionicons name="logo-bitcoin" size={17} color={sweirkiTheme.colors.inkDeep} /><Text style={styles.walletText}>{fmt(balance?.wallet.coins)} Coins</Text></View>
            <View style={[styles.walletPill, styles.ticketPill]}><Ionicons name="ticket" size={17} color={sweirkiTheme.colors.inkDeep} /><Text style={styles.walletText}>{fmt(balance?.wallet.tickets)} Tickets</Text></View>
            <View style={[styles.walletPill, styles.fragmentPill]}><Ionicons name="layers" size={17} color={sweirkiTheme.colors.inkDeep} /><Text style={styles.walletText}>{fmt(balance?.wallet.ticketFragments)}/10 Fragments</Text></View>
          </View>
        </View>

        <View style={styles.policyCard}>
          <View style={styles.policyIcon}><Ionicons name="shield-checkmark" size={22} color={sweirkiTheme.colors.cyanDeep} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.policyTitle}>Clean reward rules</Text>
            <Text style={styles.policyText}>You choose when to watch. Gameplay never gets interrupted.</Text>
          </View>
        </View>

        <View style={styles.offerList}>
          {REWARDED_AD_OFFERS.map((offer) => {
            const used = balance?.wallet.adCenterClaimsToday?.[offer.id] ?? 0;
            const capped = used >= offer.dailyLimit;
            return (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerTop}>
                  <View style={styles.offerIcon}><View style={styles.offerPlayCircle}><Ionicons name="play" size={22} color="#FFFFFF" /></View></View>
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
      <Modal visible={!!message} transparent animationType="fade" onRequestClose={() => setMessage(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalIcon}><View style={styles.modalPlayCircle}><Ionicons name="play" size={24} color="#FFFFFF" /></View></View><Text style={styles.modalTitle}>{message?.title}</Text><Text style={styles.modalText}>{message?.body}</Text><TouchableOpacity style={styles.modalButton} onPress={() => setMessage(null)} activeOpacity={0.88}><Text style={styles.modalButtonText}>OK</Text></TouchableOpacity></View></View>
      </Modal>
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

  heroCard: { borderRadius: 30, padding: 20, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, overflow: "hidden", ...sweirkiTheme.shadows.hero },
  heroGlow: { position: "absolute", right: -38, top: -54, width: 178, height: 178, borderRadius: 89, backgroundColor: "rgba(53,200,244,0.20)" },
  heroIcon: { width: 72, height: 58, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(229,248,255,0.92)", borderWidth: 1, borderColor: "rgba(53,200,244,0.36)", marginBottom: 12 },
  heroPlayCircle: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep, borderWidth: 2, borderColor: "rgba(255,255,255,0.92)", ...sweirkiTheme.shadows.glassCard },
  kicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, letterSpacing: 2.4, color: sweirkiTheme.colors.cyanDeep, textTransform: "uppercase" },
  heroTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 29, lineHeight: 34, color: sweirkiTheme.colors.inkDeep, marginTop: 6, maxWidth: "86%" },
  heroText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: sweirkiTheme.colors.textSoft, marginTop: 8, maxWidth: "92%" },
  walletRow: { flexDirection: "row", gap: 9, marginTop: 16, flexWrap: "wrap" },
  walletPill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, height: 38, borderRadius: 19, backgroundColor: "rgba(245,185,67,0.20)", borderWidth: 1, borderColor: "rgba(245,185,67,0.55)" },
  ticketPill: { backgroundColor: "rgba(53,200,244,0.18)", borderColor: "rgba(53,200,244,0.55)" },
  fragmentPill: { backgroundColor: "rgba(143,121,255,0.18)", borderColor: "rgba(143,121,255,0.55)" },
  walletText: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.inkDeep, fontSize: 14 },

  policyCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 23, padding: 14, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.glassCard },
  policyIcon: { width: 46, height: 46, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(53,200,244,0.16)", borderWidth: 1, borderColor: "rgba(53,200,244,0.38)" },
  policyTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 15, color: sweirkiTheme.colors.inkDeep },
  policyText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, lineHeight: 17, color: sweirkiTheme.colors.textSoft, marginTop: 3 },

  offerList: { gap: 12 },
  offerCard: { borderRadius: 26, padding: 15, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.glassCard },
  offerTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  offerIcon: { width: 56, height: 50, borderRadius: 19, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(229,248,255,0.92)", borderWidth: 1, borderColor: "rgba(53,200,244,0.34)" },
  offerPlayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep, borderWidth: 2, borderColor: "rgba(255,255,255,0.92)" },
  offerTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 17, color: sweirkiTheme.colors.inkDeep },
  offerText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, color: sweirkiTheme.colors.textSoft, lineHeight: 17, marginTop: 5 },
  offerBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 13 },
  limitText: { flex: 1, fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.ink, lineHeight: 17 },
  claimButton: { minHeight: 42, borderRadius: 16, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep },
  disabledButton: { opacity: 0.45 },
  claimText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 12 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(7,22,40,0.58)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", maxWidth: 360, borderRadius: 28, padding: 22, alignItems: "center", backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  modalIcon: { width: 70, height: 56, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(229,248,255,0.95)", borderWidth: 1, borderColor: "rgba(53,200,244,0.36)", marginBottom: 12 },
  modalPlayCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep, borderWidth: 2, borderColor: "rgba(255,255,255,0.92)" },
  modalTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 20, color: sweirkiTheme.colors.inkDeep, textAlign: "center" },
  modalText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: sweirkiTheme.colors.textSoft, textAlign: "center", marginTop: 8 },
  modalButton: { marginTop: 16, minWidth: 150, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.inkDeep },
  modalButtonText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 14 },
});

