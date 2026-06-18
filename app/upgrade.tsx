import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Purchases from "react-native-purchases";
import { useRevenueCat } from "../src/hooks/useRevenueCat";
import AppBackButton from "./components/AppBackButton";

const backgroundImage = require("../assets/branding/home-background.png");
const premiumArtwork = require("../assets/branding/profile/account-shield.png");
const premiumTier = require("../assets/branding/profile/premium-card.png");

const COLORS = {
  ink: "#14385F",
  inkSoft: "#6F8CAB",
  blue: "#1697DA",
  blueDeep: "#0E73BC",
  sky: "#EAF8FF",
  card: "rgba(255,255,255,0.88)",
  cardStrong: "rgba(255,255,255,0.96)",
  border: "rgba(126,205,246,0.45)",
  gold: "#D99416",
  goldDeep: "#A86F0C",
  goldSoft: "#FFF1C7",
  green: "#43CFA8",
  purple: "#8C70F8",
  red: "#EA5264",
};

const FEATURES = [
  {
    icon: "grid-outline" as const,
    title: "Advanced Boards",
    body: "Killer, Hyper, X Sudoku, and premium Arena economy bonuses.",
    tone: COLORS.blue,
  },
  {
    icon: "trophy-outline" as const,
    title: "Ranked Seasons",
    body: "Plus players receive one daily Arena ticket bonus and stronger season value.",
    tone: COLORS.gold,
  },
  {
    icon: "calendar-outline" as const,
    title: "Daily Challenges",
    body: "Claim premium bonuses while Coins and Tickets power the wider app.",
    tone: COLORS.green,
  },
  {
    icon: "infinite-outline" as const,
    title: "Lifetime Access",
    body: "One payment. Restore anytime.",
    tone: COLORS.purple,
  },
];

export default function UpgradeScreen() {
  const router = useRouter();
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  const { isPremium, loading, refresh, resolvedPackage } = useRevenueCat();

  const buyLifetime = async () => {
    if (!resolvedPackage) return;

    try {
      const { customerInfo } = await Purchases.purchasePackage(resolvedPackage);
      await refresh();

      if (!customerInfo?.entitlements?.active?.premium) {
        setPurchaseError("Purchase completed but premium was not detected yet.");
      }
    } catch {
      setPurchaseError("Unable to complete purchase right now.");
    }
  };

  const restore = async () => {
    try {
      const info = await Purchases.restorePurchases();
      await refresh();

      if (info?.entitlements?.active?.premium) {
        setRestoreMessage("Premium access has been restored on this account.");
      } else {
        setRestoreMessage("No previous premium purchase was found.");
      }
    } catch {
      setRestoreMessage("Unable to restore purchases at this time.");
    }
  };

  useEffect(() => {
    if (!purchaseError) return;
    const t = setTimeout(() => setPurchaseError(null), 2500);
    return () => clearTimeout(t);
  }, [purchaseError]);

  if (loading) {
    return (
      <ImageBackground source={backgroundImage} style={styles.center} resizeMode="cover">
        <ActivityIndicator color={COLORS.ink} />
        <Text style={styles.loadingText}>Checking premium status…</Text>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={backgroundImage} style={styles.screen} resizeMode="cover">
      <AppBackButton />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerRow}>
          <View style={styles.circleButtonGhost} />
          <Text style={styles.headerTitle}>Premium</Text>
          <View style={styles.circleButtonGhost} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>SWEIRKI PLUS</Text>
            <Text style={styles.heroTitle}>Premium Sudoku</Text>
            <Text style={styles.heroText}>
              Compete in ranked seasons, access advanced boards, and earn exclusive rewards.
            </Text>
          </View>
          <Image source={premiumTier} style={styles.heroImage} resizeMode="contain" />
        </View>

        <View style={styles.statusCard}>
          <Image source={premiumArtwork} style={styles.statusImage} resizeMode="contain" />
          <View style={styles.statusCopy}>
            <Text style={styles.statusKicker}>CURRENT STATUS</Text>
            <Text style={styles.statusTitle}>{isPremium ? "Premium Active" : "Standard Player"}</Text>
            <Text style={styles.statusText}>
              {isPremium
                ? "Your premium access is active on this account."
                : "Upgrade once and keep premium access permanently."}
            </Text>
          </View>
        </View>

        <View style={styles.featureGrid}>
          {FEATURES.map((feature) => (
            <View key={feature.title} style={styles.featureCard}>
              <View style={[styles.featureIcon, { backgroundColor: `${feature.tone}18` }]}>
                <Ionicons name={feature.icon} size={24} color={feature.tone} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureText}>{feature.body}</Text>
            </View>
          ))}
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceTopRow}>
            <View>
              <Text style={styles.priceKicker}>ONE-TIME PURCHASE</Text>
              <Text style={styles.priceTitle}>Lifetime Access</Text>
            </View>
            <View style={styles.priceBadge}>
              <Ionicons name="sparkles" size={17} color={COLORS.goldDeep} />
              <Text style={styles.priceBadgeText}>Forever</Text>
            </View>
          </View>

          <Text style={styles.priceText}>No subscriptions. Restore anytime on this account.</Text>

          {resolvedPackage ? (
            <TouchableOpacity
              style={[styles.primaryButton, isPremium && styles.primaryButtonDisabled]}
              onPress={buyLifetime}
              activeOpacity={0.88}
              disabled={isPremium}
            >
              <Text style={styles.primaryButtonText}>
                {isPremium
                  ? "Premium Already Active"
                  : `Continue — ${resolvedPackage.product.priceString}`}
              </Text>
              {!isPremium && <Ionicons name="arrow-forward" size={19} color="#FFFFFF" />}
            </TouchableOpacity>
          ) : (
            <View style={styles.packageMissingCard}>
              <Text style={styles.packageMissingText}>Premium package is not available right now.</Text>
            </View>
          )}

          {purchaseError && <Text style={styles.errorText}>{purchaseError}</Text>}
        </View>

        <TouchableOpacity style={styles.restoreButton} onPress={restore} activeOpacity={0.86}>
          <Ionicons name="refresh" size={19} color={COLORS.blueDeep} />
          <Text style={styles.restoreText}>Restore Purchase</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.restoreButton} onPress={() => router.push("/shop" as any)} activeOpacity={0.86}>
          <Ionicons name="wallet" size={19} color={COLORS.blueDeep} />
          <Text style={styles.restoreText}>Open Shop / Ticket Packs</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>No ads · One-time purchase · Restore anytime</Text>
      </ScrollView>

      <Modal
        transparent
        visible={!!restoreMessage}
        animationType="fade"
        onRequestClose={() => setRestoreMessage(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="refresh" size={28} color={COLORS.blueDeep} />
            </View>
            <Text style={styles.modalTitle}>Restore Purchase</Text>
            <Text style={styles.modalText}>{restoreMessage}</Text>

            <TouchableOpacity
              onPress={() => setRestoreMessage(null)}
              style={styles.modalSingleConfirm}
              activeOpacity={0.86}
            >
              <Text style={styles.modalConfirmText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 59,
    paddingBottom: 34,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.inkSoft,
    fontWeight: "700",
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  circleButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#64BDEB",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  circleButtonGhost: {
    width: 58,
    height: 58,
  },
  headerTitle: {
    color: COLORS.ink,
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: -0.7,
  },
  heroCard: {
    minHeight: 182,
    borderRadius: 30,
    backgroundColor: COLORS.card,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#6DC4F1",
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroCopy: {
    flex: 1,
    paddingRight: 8,
  },
  kicker: {
    color: COLORS.blue,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 3,
    marginBottom: 7,
  },
  heroTitle: {
    color: COLORS.ink,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 34,
    marginBottom: 8,
  },
  heroText: {
    color: "#7893B0",
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: "700",
  },
  heroImage: {
    width: 104,
    height: 104,
  },
  statusCard: {
    borderRadius: 28,
    backgroundColor: COLORS.cardStrong,
    borderWidth: 1.3,
    borderColor: COLORS.border,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    marginBottom: 16,
  },
  statusImage: {
    width: 74,
    height: 74,
  },
  statusCopy: {
    flex: 1,
  },
  statusKicker: {
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2.4,
    marginBottom: 4,
  },
  statusTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 3,
  },
  statusText: {
    color: "#7893B0",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  featureCard: {
    width: "48%",
    minHeight: 112,
    borderRadius: 24,
    backgroundColor: COLORS.cardStrong,
    borderWidth: 1.2,
    borderColor: COLORS.border,
    padding: 14,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  featureTitle: {
    color: COLORS.ink,
    fontSize: 16.5,
    fontWeight: "900",
    marginBottom: 4,
  },
  featureText: {
    color: "#7893B0",
    fontSize: 12.8,
    lineHeight: 17,
    fontWeight: "700",
  },
  priceCard: {
    borderRadius: 30,
    backgroundColor: COLORS.goldSoft,
    borderWidth: 1.5,
    borderColor: "rgba(237, 188, 75, 0.45)",
    padding: 18,
    marginBottom: 14,
    shadowColor: "#F1C866",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  priceTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 8,
  },
  priceKicker: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 4,
  },
  priceTitle: {
    color: COLORS.ink,
    fontSize: 23,
    fontWeight: "900",
  },
  priceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.65)",
  },
  priceBadgeText: {
    color: COLORS.goldDeep,
    fontWeight: "900",
    fontSize: 13,
  },
  priceText: {
    color: "#8D6F31",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    marginBottom: 16,
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 24,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    shadowColor: COLORS.blue,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.green,
  },
  primaryButtonText: {
    fontSize: 15.5,
    fontWeight: "900",
    color: "#FFFFFF",
    textAlign: "center",
  },
  packageMissingCard: {
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.62)",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  packageMissingText: {
    color: COLORS.goldDeep,
    fontWeight: "800",
    textAlign: "center",
  },
  errorText: {
    color: COLORS.red,
    textAlign: "center",
    fontWeight: "800",
    marginTop: 10,
  },
  restoreButton: {
    minHeight: 52,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1.5,
    borderColor: "rgba(37, 146, 238, 0.45)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  restoreText: {
    color: COLORS.blueDeep,
    fontSize: 16,
    fontWeight: "900",
  },
  footerText: {
    marginTop: 12,
    color: COLORS.inkSoft,
    fontSize: 13,
    textAlign: "center",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 55, 95, 0.34)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COLORS.cardStrong,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.4,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  modalIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.sky,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 21,
    fontWeight: "900",
    color: COLORS.ink,
    textAlign: "center",
    marginBottom: 7,
  },
  modalText: {
    fontSize: 14,
    color: COLORS.inkSoft,
    textAlign: "center",
    lineHeight: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  modalSingleConfirm: {
    minHeight: 50,
    alignSelf: "stretch",
    borderRadius: 22,
    backgroundColor: COLORS.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
  },
});
