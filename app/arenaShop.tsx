import React, { useCallback, useState } from "react";
import {
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
import { router, useFocusEffect } from "expo-router";
import { sweirkiTheme } from "./theme/sweirkiTheme";
import { getArenaProfile, spendArenaPoints } from "../src/arena/arenaEngine";
import {
  buyArenaShopCosmetic,
  ECONOMY_COSMETICS,
  equipCosmetic,
  getEconomyInventory,
  EconomyInventory,
} from "../src/economy/economyEngine";

const backgroundImage = require("../assets/branding/home-background.png");

type Message = { title: string; body: string } | null;
type State = { arenaPoints: number; inventory: EconomyInventory };

const fmt = (value?: number) => Math.round(value ?? 0).toLocaleString();

function cosmeticIcon(type: string): keyof typeof Ionicons.glyphMap {
  if (type === "frame") return "scan";
  if (type === "board_skin") return "grid";
  return "ribbon";
}

export default function ArenaShopScreen() {
  const [state, setState] = useState<State | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    let alive = true;
    Promise.all([getArenaProfile(), getEconomyInventory()]).then(([profile, inventory]) => {
      if (alive) setState({ arenaPoints: profile.arenaPoints, inventory });
    });
    return () => {
      alive = false;
    };
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
        setMessage({
          title: "Not enough Arena Points",
          body: `You need ${spend.missing} more AP. Arena Points are earned only in Arena and cannot be bought.`,
        });
        return;
      }

      const result = await buyArenaShopCosmetic(cosmeticId, state.arenaPoints);
      setState({ arenaPoints: spend.profile.arenaPoints, inventory: result.inventory });
      setMessage({
        title: cosmetic.name,
        body: result.ok ? "Unlocked in your Arena inventory." : result.reason ?? "Unable to unlock.",
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <ImageBackground source={backgroundImage} style={styles.screen} resizeMode="cover">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable style={styles.circleButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={sweirkiTheme.colors.inkDeep} />
          </Pressable>
          <Text style={styles.headerTitle}>Arena Shop</Text>
          <View style={styles.circleButtonGhost} />
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={28} color={sweirkiTheme.colors.cyanDeep} />
          </View>
          <Text style={styles.kicker}>COMPETITIVE PRESTIGE</Text>
          <Text style={styles.heroTitle}>Spend Arena Points.</Text>
          <Text style={styles.heroText}>Arena Points are earned from Arena performance only. They cannot be bought with money or ads.</Text>
          <View style={styles.apPill}>
            <Ionicons name="flash" size={15} color="#8A6420" />
            <Text style={styles.apPillText}>{fmt(state?.arenaPoints)} Arena Points</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Prestige cosmetics</Text>
            <Text style={styles.sectionTag}>Arena only</Text>
          </View>
          <Text style={styles.sectionText}>Unlock badges, frames, and board looks that show your Arena progress.</Text>
        </View>

        <View style={styles.grid}>
          {ECONOMY_COSMETICS.filter((item) => item.source === "arena_shop").map((item) => {
            const owned = state?.inventory.ownedCosmeticIds.includes(item.id);
            const price = item.priceArenaPoints ?? 0;
            const loading = busy === item.id;

            return (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <View style={styles.icon}>
                    <Ionicons name={cosmeticIcon(item.type)} size={23} color={sweirkiTheme.colors.cyanDeep} />
                  </View>
                  <View style={[styles.rarityPill, owned && styles.ownedPill]}>
                    <Text style={[styles.rarityText, owned && styles.ownedPillText]}>{owned ? "Owned" : item.rarity}</Text>
                  </View>
                </View>

                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.meta}>{item.type.replace("_", " ")}</Text>
                <Text style={styles.text}>{item.description}</Text>

                <TouchableOpacity
                  style={[styles.button, owned && styles.ownedButton, loading && styles.disabledButton]}
                  onPress={() => unlock(item.id)}
                  disabled={loading || !state}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.buttonText, owned && styles.ownedButtonText]}>
                    {owned ? "Equip" : price === 0 ? "Unlock" : `${price} AP`}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={!!message} transparent animationType="fade" onRequestClose={() => setMessage(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalGlow} />
            <View style={styles.modalIcon}>
              <Ionicons name="shield-checkmark" size={26} color={sweirkiTheme.colors.cyanDeep} />
            </View>
            <Text style={styles.modalTitle}>{message?.title}</Text>
            <Text style={styles.modalText}>{message?.body}</Text>
            <TouchableOpacity style={styles.modalButton} onPress={() => setMessage(null)} activeOpacity={0.88}>
              <Text style={styles.modalButtonText}>OK</Text>
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
  content: {
    padding: 18,
    paddingTop: 58,
    paddingBottom: 34,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  circleButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    ...sweirkiTheme.shadows.glassCard,
  },
  circleButtonGhost: {
    width: 46,
    height: 46,
  },
  headerTitle: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 24,
    color: sweirkiTheme.colors.inkDeep,
  },

  heroCard: {
    borderRadius: 30,
    padding: 20,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    overflow: "hidden",
    ...sweirkiTheme.shadows.hero,
  },
  heroGlow: {
    position: "absolute",
    right: -38,
    top: -54,
    width: 178,
    height: 178,
    borderRadius: 89,
    backgroundColor: "rgba(53,200,244,0.20)",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(53,200,244,0.15)",
    borderWidth: 1,
    borderColor: "rgba(53,200,244,0.42)",
    marginBottom: 12,
  },
  kicker: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 10,
    letterSpacing: 2.4,
    color: sweirkiTheme.colors.cyanDeep,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 29,
    lineHeight: 34,
    color: sweirkiTheme.colors.inkDeep,
    marginTop: 6,
    maxWidth: "82%",
  },
  heroText: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: sweirkiTheme.colors.textSoft,
    marginTop: 8,
    maxWidth: "92%",
  },
  apPill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 13,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(245,185,67,0.20)",
    borderWidth: 1,
    borderColor: "rgba(245,185,67,0.55)",
  },
  apPillText: {
    fontFamily: sweirkiTheme.fonts.bold,
    color: sweirkiTheme.colors.inkDeep,
    fontSize: 14,
  },

  sectionCard: {
    borderRadius: 24,
    padding: 15,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    ...sweirkiTheme.shadows.glassCard,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  sectionTitle: {
    flex: 1,
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 19,
    color: sweirkiTheme.colors.inkDeep,
  },
  sectionTag: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "rgba(53,200,244,0.16)",
    fontFamily: sweirkiTheme.fonts.bold,
    color: sweirkiTheme.colors.cyanDeep,
    fontSize: 10,
    textTransform: "uppercase",
  },
  sectionText: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 12,
    lineHeight: 17,
    color: sweirkiTheme.colors.textSoft,
    marginTop: 6,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: "48%",
    minHeight: 202,
    borderRadius: 24,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    ...sweirkiTheme.shadows.glassCard,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(53,200,244,0.15)",
    borderWidth: 1,
    borderColor: "rgba(53,200,244,0.42)",
  },
  rarityPill: {
    flexShrink: 1,
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: "rgba(143,121,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(143,121,255,0.25)",
  },
  ownedPill: {
    backgroundColor: "rgba(245,185,67,0.18)",
    borderColor: "rgba(245,185,67,0.42)",
  },
  rarityText: {
    fontFamily: sweirkiTheme.fonts.bold,
    color: sweirkiTheme.colors.purple,
    fontSize: 9,
    textTransform: "uppercase",
  },
  ownedPillText: {
    color: "#8A6420",
  },
  title: {
    fontFamily: sweirkiTheme.fonts.bold,
    color: sweirkiTheme.colors.inkDeep,
    fontSize: 15,
    marginTop: 11,
  },
  meta: {
    fontFamily: sweirkiTheme.fonts.bold,
    color: sweirkiTheme.colors.cyanDeep,
    fontSize: 10,
    marginTop: 2,
    textTransform: "uppercase",
  },
  text: {
    flex: 1,
    fontFamily: sweirkiTheme.fonts.regular,
    color: sweirkiTheme.colors.textSoft,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
  },
  button: {
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sweirkiTheme.colors.cyanDeep,
    marginTop: 11,
  },
  ownedButton: {
    backgroundColor: "rgba(245,185,67,0.24)",
    borderWidth: 1,
    borderColor: "rgba(245,185,67,0.55)",
  },
  disabledButton: {
    opacity: 0.62,
  },
  buttonText: {
    fontFamily: sweirkiTheme.fonts.bold,
    color: "#FFFFFF",
    fontSize: 12,
  },
  ownedButtonText: {
    color: sweirkiTheme.colors.inkDeep,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(7,22,40,0.58)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 28,
    padding: 22,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    overflow: "hidden",
    ...sweirkiTheme.shadows.hero,
  },
  modalGlow: {
    position: "absolute",
    right: -44,
    top: -58,
    width: 154,
    height: 154,
    borderRadius: 77,
    backgroundColor: "rgba(53,200,244,0.18)",
  },
  modalIcon: {
    width: 54,
    height: 54,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(53,200,244,0.15)",
    borderWidth: 1,
    borderColor: "rgba(53,200,244,0.42)",
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 20,
    color: sweirkiTheme.colors.inkDeep,
    textAlign: "center",
  },
  modalText: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: sweirkiTheme.colors.textSoft,
    textAlign: "center",
    marginTop: 8,
  },
  modalButton: {
    marginTop: 16,
    minWidth: 150,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sweirkiTheme.colors.inkDeep,
  },
  modalButtonText: {
    fontFamily: sweirkiTheme.fonts.bold,
    color: "#FFFFFF",
    fontSize: 14,
  },
});

