import React, { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import Purchases from "react-native-purchases";
import { sweirkiTheme } from "./theme/sweirkiTheme";
import { useRevenueCat } from "../src/hooks/useRevenueCat";
import { ECONOMY_PRODUCT_LIST, ECONOMY_PRODUCTS, EconomyBalance, formatCost, getEconomyBalance, grantDailyPremiumEconomyBonus, grantPurchasedProduct } from "../src/economy/economyEngine";

const backgroundImage = require("../assets/branding/home-background.png");
type Tab = "featured" | "tickets" | "premium" | "season";
type Message = { title: string; body: string } | null;

function fmt(value?: number) { return Number.isFinite(value) ? String(Math.round(value ?? 0)) : "0"; }

function getPurchaseKey(result: any, productIdentifier: string) {
  const transactionId =
    result?.transaction?.transactionIdentifier ??
    result?.transaction?.identifier ??
    result?.transaction?.originalTransactionIdentifier ??
    result?.customerInfo?.originalPurchaseDate ??
    null;
  return transactionId ? `${productIdentifier}:${transactionId}` : `${productIdentifier}:entitlement`;
}

function productIcon(productId: string): keyof typeof Ionicons.glyphMap {
  if (productId === ECONOMY_PRODUCTS.premiumLifetime) return "diamond";
  if (productId === ECONOMY_PRODUCTS.arenaTickets10) return "ticket";
  if (productId === ECONOMY_PRODUCTS.championBundle) return "trophy";
  return "sparkles";
}

export default function ShopScreen() {
  const { isPremium, loading, getPackageByProductId, refresh } = useRevenueCat();
  const [balance, setBalance] = useState<EconomyBalance | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [tab, setTab] = useState<Tab>("featured");

  const refreshBalance = useCallback(() => {
    let alive = true;
    getEconomyBalance().then((next) => alive && setBalance(next));
    return () => { alive = false; };
  }, []);
  useFocusEffect(refreshBalance);

  const wallet = balance?.wallet;
  const recentLedger = useMemo(() => balance?.ledger.slice(0, 5) ?? [], [balance]);
  const products = ECONOMY_PRODUCT_LIST.filter((item) => item.storePlacement === tab || (tab === "featured" && item.storePlacement === "featured"));
  const visibleProducts = products.filter((item) => Boolean(getPackageByProductId(item.revenueCatIdentifier)) || item.revenueCatIdentifier === ECONOMY_PRODUCTS.premiumLifetime);

  const buyProduct = async (productIdentifier: string) => {
    const product = ECONOMY_PRODUCT_LIST.find((item) => item.revenueCatIdentifier === productIdentifier);
    if (!product) return;
    const pkg = getPackageByProductId(productIdentifier);
    if (!pkg) {
      setMessage({ title: "Package not available", body: "Create this product in Apple/Google, import it in RevenueCat, and attach it to the current offering." });
      return;
    }
    setBusyId(productIdentifier);
    try {
      const result = await Purchases.purchasePackage(pkg);
      await refresh();
      const purchaseKey = getPurchaseKey(result, productIdentifier);
      const grant = await grantPurchasedProduct(productIdentifier, { purchaseKey });
      setBalance(await getEconomyBalance());
      setMessage({ title: product.title, body: grant.alreadyProcessed ? "Purchase is already active. No duplicate wallet grant was added." : "Purchase complete. Rewards were added to your Sweirki wallet/inventory." });
    } catch (e: any) {
      if (!e?.userCancelled) setMessage({ title: "Purchase failed", body: "The store could not complete this purchase right now." });
    } finally {
      setBusyId(null);
    }
  };

  const claimPremiumBonus = async () => {
    setBusyId("premium-bonus");
    try {
      const nextWallet = await grantDailyPremiumEconomyBonus(isPremium);
      setBalance(await getEconomyBalance());
      setMessage({
        title: isPremium ? "Daily Plus Bonus" : "Sweirki Plus required",
        body: isPremium ? `Current wallet: ${fmt(nextWallet.coins)} Coins • ${fmt(nextWallet.tickets)} Tickets.` : "Upgrade to Sweirki Plus to claim the daily no-ad bonus.",
      });
    } finally { setBusyId(null); }
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.screen} resizeMode="cover">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable style={styles.circleButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={sweirkiTheme.colors.inkDeep} /></Pressable>
          <Text style={styles.headerTitle}>Shop</Text>
          <Pressable style={styles.circleButton} onPress={() => router.push("/rewardCenter" as any)}><Ionicons name="play-circle" size={22} color={sweirkiTheme.colors.cyanDeep} /></Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <Text style={styles.kicker}>PREMIUM SUDOKU ECOSYSTEM</Text>
          <Text style={styles.heroTitle}>Coins, Tickets, Plus.</Text>
          <Text style={styles.heroText}>Coins power the full app. Tickets unlock special Arena cups. Arena Points stay competitive and are never sold.</Text>
          <View style={styles.walletRow}>
            <View style={styles.walletPill}><Ionicons name="logo-bitcoin" size={17} color="#FFFFFF" /><Text style={styles.walletText}>{fmt(wallet?.coins)} Coins</Text></View>
            <View style={[styles.walletPill, styles.ticketPill]}><Ionicons name="ticket" size={17} color="#FFFFFF" /><Text style={styles.walletText}>{fmt(wallet?.tickets)} Tickets</Text></View>
            <View style={[styles.walletPill, styles.fragmentPill]}><Ionicons name="layers" size={17} color="#FFFFFF" /><Text style={styles.walletText}>{fmt(wallet?.ticketFragments)}/10 Fragments</Text></View>
          </View>
        </View>

        <View style={styles.quickGrid}>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/rewardCenter" as any)} activeOpacity={0.88}>
            <Ionicons name="play-circle" size={22} color={sweirkiTheme.colors.cyanDeep} />
            <Text style={styles.quickTitle}>Reward Center</Text>
            <Text style={styles.quickText}>Optional rewarded ads only. Never during play.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/arenaShop" as any)} activeOpacity={0.88}>
            <Ionicons name="shield-checkmark" size={22} color={sweirkiTheme.colors.purple} />
            <Text style={styles.quickTitle}>Arena Shop</Text>
            <Text style={styles.quickText}>Spend Arena Points on prestige cosmetics.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={() => router.push("/seasonPass" as any)} activeOpacity={0.88}>
            <Ionicons name="ribbon" size={22} color={sweirkiTheme.colors.gold} />
            <Text style={styles.quickTitle}>Season Pass</Text>
            <Text style={styles.quickText}>Free and premium reward tracks.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickCard} onPress={claimPremiumBonus} disabled={busyId === "premium-bonus"} activeOpacity={0.88}>
            <Ionicons name="diamond" size={22} color={sweirkiTheme.colors.purple} />
            <Text style={styles.quickTitle}>{isPremium ? "Claim Plus" : "Sweirki Plus"}</Text>
            <Text style={styles.quickText}>{isPremium ? "Daily no-ad bonus." : "No ads, premium boards, daily ticket."}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {(["featured", "tickets", "premium", "season"] as Tab[]).map((key) => (
            <Pressable key={key} style={[styles.tab, tab === key && styles.tabActive]} onPress={() => setTab(key)}>
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{key.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>

        {loading ? <ActivityIndicator color={sweirkiTheme.colors.cyanDeep} /> : null}

        <View style={styles.productsList}>
          {visibleProducts.length === 0 ? (
            <View style={styles.productCard}>
              <Text style={styles.productTitle}>No configured products</Text>
              <Text style={styles.productSub}>This tab is hidden until the matching Apple/Google products are added to the current RevenueCat offering.</Text>
            </View>
          ) : null}
          {visibleProducts.map((product) => {
            const pkg = getPackageByProductId(product.revenueCatIdentifier);
            const price = pkg?.product?.priceString ?? "Configure in RevenueCat";
            const isBusy = busyId === product.revenueCatIdentifier;
            const grantText = formatCost({ coins: product.grants.coins, tickets: product.grants.tickets, ticketFragments: product.grants.ticketFragments });
            return (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productTop}>
                  <View style={styles.productIcon}><Ionicons name={productIcon(product.revenueCatIdentifier)} size={24} color="#FFFFFF" /></View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.productTitleRow}><Text style={styles.productTitle}>{product.title}</Text><Text style={styles.productTag}>{product.tag}</Text></View>
                    <Text style={styles.productSub}>{product.subtitle}</Text>
                  </View>
                </View>
                <View style={styles.productBottom}>
                  <Text style={styles.grantText}>Grants: {grantText}{product.grants.cosmeticIds?.length ? ` • ${product.grants.cosmeticIds.length} cosmetic${product.grants.cosmeticIds.length === 1 ? "" : "s"}` : ""}</Text>
                  <TouchableOpacity style={styles.buyButton} onPress={() => buyProduct(product.revenueCatIdentifier)} disabled={isBusy} activeOpacity={0.88}><Text style={styles.buyText}>{isBusy ? "Processing..." : price}</Text></TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        <View style={styles.ledgerCard}>
          <Text style={styles.sectionTitle}>Recent wallet activity</Text>
          {recentLedger.length ? recentLedger.map((entry) => (
            <View key={entry.id} style={styles.ledgerRow}>
              <View style={{ flex: 1 }}><Text style={styles.ledgerTitle}>{entry.label}</Text><Text style={styles.ledgerMeta}>{new Date(entry.createdAt).toLocaleDateString()}</Text></View>
              <Text style={styles.ledgerValue}>{entry.deltaCoins ? `${entry.deltaCoins > 0 ? "+" : ""}${entry.deltaCoins}C` : ""}{entry.deltaTickets ? ` ${entry.deltaTickets > 0 ? "+" : ""}${entry.deltaTickets}T` : ""}{entry.deltaTicketFragments ? ` +${entry.deltaTicketFragments}F` : ""}</Text>
            </View>
          )) : <Text style={styles.helperText}>No wallet activity yet.</Text>}
        </View>
      </ScrollView>

      <Modal visible={!!message} transparent animationType="fade" onRequestClose={() => setMessage(null)}>
        <View style={styles.modalBackdrop}><View style={styles.modalCard}><View style={styles.modalIcon}><Ionicons name="wallet" size={26} color="#FFFFFF" /></View><Text style={styles.modalTitle}>{message?.title}</Text><Text style={styles.modalText}>{message?.body}</Text><TouchableOpacity style={styles.modalButton} onPress={() => setMessage(null)} activeOpacity={0.88}><Text style={styles.modalButtonText}>OK</Text></TouchableOpacity></View></View>
      </Modal>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 18, paddingTop: 58, paddingBottom: 34 }, headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, circleButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.88)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong }, headerTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 24, color: sweirkiTheme.colors.inkDeep },
  heroCard: { borderRadius: 32, padding: 22, marginBottom: 14, backgroundColor: "rgba(12,48,92,0.94)", borderWidth: 1, borderColor: "rgba(255,255,255,0.38)", overflow: "hidden", ...sweirkiTheme.shadows.hero }, heroGlow: { position: "absolute", right: -40, top: -40, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(53,200,244,0.28)" }, kicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, letterSpacing: 2.1, color: "rgba(255,255,255,0.68)", textTransform: "uppercase" }, heroTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 30, lineHeight: 36, color: "#FFFFFF", marginTop: 4 }, heroText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.76)", marginTop: 7 },
  walletRow: { flexDirection: "row", gap: 10, marginTop: 16, flexWrap: "wrap" }, walletPill: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 13, height: 38, borderRadius: 19, backgroundColor: "rgba(245,185,67,0.28)", borderWidth: 1, borderColor: "rgba(245,185,67,0.5)" }, ticketPill: { backgroundColor: "rgba(53,200,244,0.24)", borderColor: "rgba(53,200,244,0.52)" }, fragmentPill: { backgroundColor: "rgba(143,121,255,0.24)", borderColor: "rgba(143,121,255,0.52)" }, walletText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 14 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }, quickCard: { width: "48%", minHeight: 112, borderRadius: 22, padding: 13, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong }, quickTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 15, color: sweirkiTheme.colors.inkDeep, marginTop: 7 }, quickText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 11, lineHeight: 15, color: sweirkiTheme.colors.textSoft, marginTop: 3 },
  tabRow: { flexDirection: "row", gap: 7, marginBottom: 14 }, tab: { flex: 1, minHeight: 38, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.72)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan }, tabActive: { backgroundColor: sweirkiTheme.colors.inkDeep }, tabText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 9, color: sweirkiTheme.colors.ink }, tabTextActive: { color: "#FFFFFF" },
  productsList: { gap: 12, marginBottom: 14 }, productCard: { borderRadius: 26, padding: 15, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.glassCard }, productTop: { flexDirection: "row", gap: 12, alignItems: "flex-start" }, productIcon: { width: 48, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.inkDeep }, productTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }, productTitle: { flex: 1, fontFamily: sweirkiTheme.fonts.bold, fontSize: 17, color: sweirkiTheme.colors.inkDeep }, productTag: { overflow: "hidden", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: "rgba(245,185,67,0.18)", fontFamily: sweirkiTheme.fonts.bold, color: "#8A6420", fontSize: 10 }, productSub: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, lineHeight: 17, color: sweirkiTheme.colors.textSoft, marginTop: 4 }, productBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 13 }, grantText: { flex: 1, fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.ink, fontSize: 12 }, buyButton: { minHeight: 42, borderRadius: 16, paddingHorizontal: 14, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep }, buyText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 12 },
  ledgerCard: { borderRadius: 24, padding: 15, backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan }, sectionTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 18, color: sweirkiTheme.colors.inkDeep, marginTop: 2 }, helperText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, lineHeight: 17, color: sweirkiTheme.colors.textSoft, marginTop: 10 }, ledgerRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(20,56,95,0.08)" }, ledgerTitle: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.inkDeep, fontSize: 13 }, ledgerMeta: { fontFamily: sweirkiTheme.fonts.regular, color: sweirkiTheme.colors.textSoft, fontSize: 11, marginTop: 2 }, ledgerValue: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.cyanDeep, fontSize: 13 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(7,22,40,0.58)", alignItems: "center", justifyContent: "center", padding: 24 }, modalCard: { width: "100%", maxWidth: 360, borderRadius: 28, padding: 22, alignItems: "center", backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong }, modalIcon: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep, marginBottom: 12 }, modalTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 20, color: sweirkiTheme.colors.inkDeep, textAlign: "center" }, modalText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: sweirkiTheme.colors.textSoft, textAlign: "center", marginTop: 8 }, modalButton: { marginTop: 16, minWidth: 150, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.inkDeep }, modalButtonText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 14 },
});
