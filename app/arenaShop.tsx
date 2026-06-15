import React, { useCallback, useState } from "react";
import { ImageBackground, Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { sweirkiTheme } from "./theme/sweirkiTheme";
import { getArenaProfile, spendArenaPoints } from "../src/arena/arenaEngine";
import { buyArenaShopCosmetic, ECONOMY_COSMETICS, equipCosmetic, getEconomyInventory, EconomyInventory } from "../src/economy/economyEngine";

const backgroundImage = require("../assets/branding/home-background.png");
type Message = { title: string; body: string } | null;

type State = { arenaPoints: number; inventory: EconomyInventory };

export default function ArenaShopScreen() {
  const [state, setState] = useState<State | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    let alive = true;
    Promise.all([getArenaProfile(), getEconomyInventory()]).then(([profile, inventory]) => alive && setState({ arenaPoints: profile.arenaPoints, inventory }));
    return () => { alive = false; };
  }, []);
  useFocusEffect(load);

  const unlock = async (cosmeticId: string) => {
    const cosmetic = ECONOMY_COSMETICS.find((item) => item.id === cosmeticId);
    if (!cosmetic || !state) return;
    if (state.inventory.ownedCosmeticIds.includes(cosmeticId)) {
      const result = await equipCosmetic(cosmeticId);
      setState({ arenaPoints: state.arenaPoints, inventory: result.inventory });
      setMessage({ title: cosmetic.name, body: result.ok ? "Equipped." : result.reason ?? "Unable to equip." });
      return;
    }
    const price = cosmetic.priceArenaPoints ?? 0;
    setBusy(cosmeticId);
    try {
      const spend = await spendArenaPoints(price, `Arena Shop: ${cosmetic.name}`);
      if (!spend.ok) {
        setMessage({ title: "Not enough Arena Points", body: `You need ${spend.missing} more AP. Arena Points are earned only in Arena and cannot be bought.` });
        return;
      }
      const result = await buyArenaShopCosmetic(cosmeticId, state.arenaPoints);
      const inventory = result.inventory;
      setState({ arenaPoints: spend.profile.arenaPoints, inventory });
      setMessage({ title: cosmetic.name, body: result.ok ? "Unlocked in your Arena inventory." : result.reason ?? "Unable to unlock." });
    } finally { setBusy(null); }
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.screen} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}><Pressable style={styles.circleButton} onPress={() => router.back()}><Ionicons name="chevron-back" size={28} color={sweirkiTheme.colors.inkDeep} /></Pressable><Text style={styles.headerTitle}>Arena Shop</Text><View style={styles.circleButtonGhost} /></View>
        <View style={styles.heroCard}>
          <Text style={styles.kicker}>COMPETITIVE PRESTIGE</Text>
          <Text style={styles.heroTitle}>Spend Arena Points.</Text>
          <Text style={styles.heroText}>Arena Points are earned from Arena performance only. They cannot be bought with money or ads.</Text>
          <Text style={styles.apPill}>{Math.round(state?.arenaPoints ?? 0)} Arena Points</Text>
        </View>
        <View style={styles.grid}>
          {ECONOMY_COSMETICS.filter((item) => item.source === "arena_shop").map((item) => {
            const owned = state?.inventory.ownedCosmeticIds.includes(item.id);
            const price = item.priceArenaPoints ?? 0;
            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.icon}><Ionicons name={item.type === "frame" ? "scan" : item.type === "board_skin" ? "grid" : "ribbon"} size={24} color="#FFFFFF" /></View>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.meta}>{item.rarity} • {item.type.replace("_", " ")}</Text>
                <Text style={styles.text}>{item.description}</Text>
                <TouchableOpacity style={[styles.button, owned && styles.ownedButton]} onPress={() => unlock(item.id)} disabled={busy === item.id}>
                  <Text style={styles.buttonText}>{owned ? "Equip" : price === 0 ? "Unlock" : `${price} AP`}</Text>
                </TouchableOpacity>
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
  screen: { flex: 1 }, content: { padding: 18, paddingTop: 58, paddingBottom: 34 }, headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }, circleButton: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.88)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong }, circleButtonGhost: { width: 46, height: 46 }, headerTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 23, color: sweirkiTheme.colors.inkDeep }, heroCard: { borderRadius: 30, padding: 22, marginBottom: 14, backgroundColor: "rgba(12,48,92,0.94)", borderWidth: 1, borderColor: "rgba(255,255,255,0.38)", ...sweirkiTheme.shadows.hero }, kicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, letterSpacing: 2, color: "rgba(255,255,255,0.66)" }, heroTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 30, color: "#FFFFFF", marginTop: 4 }, heroText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: "rgba(255,255,255,0.76)", marginTop: 6 }, apPill: { alignSelf: "flex-start", marginTop: 14, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 999, overflow: "hidden", backgroundColor: "rgba(245,185,67,0.18)", color: "#FFFFFF", fontFamily: sweirkiTheme.fonts.bold }, grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, card: { width: "48%", minHeight: 190, borderRadius: 24, padding: 14, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong }, icon: { width: 44, height: 44, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.inkDeep }, title: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.inkDeep, fontSize: 15, marginTop: 10 }, meta: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.purple, fontSize: 10, marginTop: 2, textTransform: "uppercase" }, text: { flex: 1, fontFamily: sweirkiTheme.fonts.regular, color: sweirkiTheme.colors.textSoft, fontSize: 11, lineHeight: 15, marginTop: 5 }, button: { height: 38, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep, marginTop: 10 }, ownedButton: { backgroundColor: sweirkiTheme.colors.inkDeep }, buttonText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 12 }, modalBackdrop: { flex: 1, backgroundColor: "rgba(7,22,40,0.58)", alignItems: "center", justifyContent: "center", padding: 24 }, modalCard: { width: "100%", maxWidth: 360, borderRadius: 28, padding: 22, alignItems: "center", backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong }, modalTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 20, color: sweirkiTheme.colors.inkDeep, textAlign: "center" }, modalText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: sweirkiTheme.colors.textSoft, textAlign: "center", marginTop: 8 }, modalButton: { marginTop: 16, minWidth: 150, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.inkDeep }, modalButtonText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 14 },
});
