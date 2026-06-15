import { useCallback, useMemo, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ArenaLayout from "./ArenaLayout";
import { sweirkiTheme } from "../theme/sweirkiTheme";
import {
  ArenaMode,
  ArenaRun,
  ArenaSnapshot,
  forfeitPendingArenaRun,
  formatArenaTime,
  getArenaSnapshot,
  startArenaRun,
} from "../../src/arena/arenaEngine";
import { playArenaFeedback } from "../../src/arena/arenaFeedback";
import { useRevenueCat } from "../../src/hooks/useRevenueCat";
import { formatCost, getArenaEntryCost, getEconomyWallet, type EconomyWallet } from "../../src/economy/economyEngine";

type Props = {
  mode: ArenaMode;
  title: string;
  eyebrow: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: "blue" | "gold" | "purple" | "navy";
  rules: string[];
  startLabel: string;
};


const MODE_ART: Record<ArenaMode, any> = {
  ranked: require("../../assets/arena/leagues/gold_league.png"),
  survival: require("../../assets/arena/ceremonies/reward_claim_bg.png"),
  power: require("../../assets/arena/powers/reveal_power_active.png"),
  tournament: require("../../assets/arena/tournaments/champion_cup.png"),
};

const MODE_BADGE_ART: Record<ArenaMode, any> = {
  ranked: require("../../assets/economy/badges/gold_badge.png"),
  survival: require("../../assets/economy/rewards/reward_ticket_fragments.png"),
  power: require("../../assets/arena/powers/shield_power_active.png"),
  tournament: require("../../assets/arena/tournaments/cup_trophy.png"),
};

const accentMap = {
  blue: {
    bg: sweirkiTheme.colors.cyanDeep,
    soft: "rgba(53,200,244,0.14)",
    text: sweirkiTheme.colors.cyanDeep,
    glow: "rgba(53,200,244,0.28)",
  },
  gold: {
    bg: "#B8872F",
    soft: "rgba(232,190,111,0.18)",
    text: "#8A6420",
    glow: "rgba(232,190,111,0.30)",
  },
  purple: {
    bg: sweirkiTheme.colors.purple,
    soft: "rgba(143,121,255,0.16)",
    text: "#6E5CE5",
    glow: "rgba(143,121,255,0.26)",
  },
  navy: {
    bg: sweirkiTheme.colors.inkDeep,
    soft: "rgba(20,56,95,0.12)",
    text: sweirkiTheme.colors.inkDeep,
    glow: "rgba(20,56,95,0.22)",
  },
};

const MODE_COPY: Record<
  ArenaMode,
  {
    opponentLabel: string;
    contract: string;
    reward: string;
    risk: string;
    promise: string;
    continueLabel: string;
    forfeitLabel: string;
  }
> = {
  ranked: {
    opponentLabel: "Matched Rival",
    contract: "One official duel. Beat the target with control to gain rating.",
    reward: "+26 to +38 rating",
    risk: "-18 rating or more",
    promise: "Rating, league progress, streak, and result history are updated after the board.",
    continueLabel: "Continue Duel",
    forfeitLabel: "Forfeit Duel",
  },
  survival: {
    opponentLabel: "The Run",
    contract: "One wrong cell ends the current run. Clear Easy, Medium, then Hard without a mistake.",
    reward: "Stage streak + XP boost",
    risk: "One wrong cell ends it",
    promise: "Survival keeps the exact board, timer, and mistake state. One wrong cell ends the run.",
    continueLabel: "Continue Run",
    forfeitLabel: "End Run",
  },
  power: {
    opponentLabel: "Power Rival",
    contract: "Use limited assists wisely. Controlled decisions beat raw speed.",
    reward: "+26 rating + XP",
    risk: "Limited charges, no careless solves",
    promise: "Power Arena treats assists as part of strategy, not a casual shortcut.",
    continueLabel: "Continue Power Run",
    forfeitLabel: "Forfeit Power Run",
  },
  tournament: {
    opponentLabel: "Cup Opponent",
    contract: "Qualifier starts on Medium. Semifinal and Final move to Hard. Lose once and the Cup ends.",
    reward: "Cup rating + Cup XP",
    risk: "Cup eliminated",
    promise: "Tournament runs are built for seasonal championship identity and rare wins.",
    continueLabel: "Continue Cup Match",
    forfeitLabel: "Forfeit Cup",
  },
};

const MODE_DISPLAY_NAME: Record<ArenaMode, string> = {
  ranked: "Ranked Duel",
  survival: "Survival Run",
  power: "Power Arena",
  tournament: "Tournament Cup",
};

const MODE_SESSION_LABEL: Record<ArenaMode, string> = {
  ranked: "duel",
  survival: "run",
  power: "power run",
  tournament: "cup match",
};

function modeDifficultyLabel(mode: ArenaMode) {
  if (mode === "survival") return "Easy opener";
  if (mode === "tournament") return "Medium qualifier";
  if (mode === "power") return "Medium powers";
  return "Medium duel";
}

function activeRunStatus(run: ArenaRun) {
  const stage = run.stageTotal > 1 ? `${run.stageName} ${run.stageIndex + 1}/${run.stageTotal}` : run.stageName;
  return `${stage} • ${run.difficulty.toUpperCase()} • target ${formatArenaTime(run.targetTimeSec)}`;
}

function ratingText(value?: number) {
  return Number.isFinite(value) ? String(Math.round(value ?? 0)) : "---";
}

export default function ModeScreen({
  mode,
  title,
  eyebrow,
  subtitle,
  icon,
  accent,
  rules,
  startLabel,
}: Props) {
  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null);
  const [wallet, setWallet] = useState<EconomyWallet | null>(null);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [confirmForfeit, setConfirmForfeit] = useState(false);
  const colors = accentMap[accent];
  const copy = MODE_COPY[mode];
  const { isPremium } = useRevenueCat();

  const refresh = useCallback(() => {
    let alive = true;
    Promise.all([getArenaSnapshot(), getEconomyWallet()]).then(([next, nextWallet]) => {
      if (!alive) return;
      setSnapshot(next);
      setWallet(nextWallet);
    });
    return () => {
      alive = false;
    };
  }, []);

  useFocusEffect(refresh);

  const activeRun = snapshot?.pendingRun?.mode === mode ? snapshot.pendingRun : null;
  const entryCost = getArenaEntryCost(mode, snapshot?.profile, isPremium);
  const canAffordEntry = (wallet?.coins ?? 0) >= entryCost.coins && (wallet?.tickets ?? 0) >= entryCost.tickets;
  const otherRun = snapshot?.pendingRun && snapshot.pendingRun.mode !== mode ? snapshot.pendingRun : null;
  const otherRunName = otherRun ? MODE_DISPLAY_NAME[otherRun.mode] : "Arena Session";
  const otherRunLabel = otherRun ? MODE_SESSION_LABEL[otherRun.mode] : "session";

  const canStart = !starting;

  const matchupTitle = useMemo(() => {
    if (activeRun) return `${copy.opponentLabel}: ${activeRun.opponentName}`;
    return mode === "survival" ? "Survival contract" : "Match contract";
  }, [activeRun, copy.opponentLabel, mode]);

  const goToRun = (run: ArenaRun) => {
    playArenaFeedback("matchStart");
    router.push({
      pathname: "/sudoku",
      params: { level: run.difficulty, arena: run.mode },
    } as any);
  };

  const start = async () => {
    if (!canStart) return;

    if (activeRun) {
      goToRun(activeRun);
      return;
    }

    if (otherRun) {
      goToRun(otherRun);
      return;
    }

    setStarting(true);
    try {
      setEntryError(null);
      if (!canAffordEntry) {
        setEntryError(`Need ${formatCost(entryCost)} to start. Your wallet has ${wallet?.coins ?? 0} Coins and ${wallet?.tickets ?? 0} Tickets.`);
        return;
      }
      const run: ArenaRun = await startArenaRun(mode, { isPremium });
      const next = await getArenaSnapshot();
      setSnapshot(next);
      goToRun(run);
    } catch (e: any) {
      setEntryError(e?.code === "ARENA_ENTRY_FUNDS" ? `Need ${formatCost(entryCost)} to start this mode.` : "Arena could not start. Try again from the hub.");
    } finally {
      setStarting(false);
    }
  };

  const startFreshAfterForfeit = async () => {
    if (starting) return;
    setStarting(true);
    try {
      await forfeitPendingArenaRun();
      setEntryError(null);
      if (!canAffordEntry) {
        setEntryError(`Need ${formatCost(entryCost)} to start. Your wallet has ${wallet?.coins ?? 0} Coins and ${wallet?.tickets ?? 0} Tickets.`);
        return;
      }
      const run: ArenaRun = await startArenaRun(mode, { isPremium });
      const next = await getArenaSnapshot();
      setSnapshot(next);
      goToRun(run);
    } finally {
      setStarting(false);
    }
  };

  const forfeit = async () => {
    setConfirmForfeit(false);
    await forfeitPendingArenaRun();
    playArenaFeedback("defeat");
    refresh();
  };

  return (
    <ArenaLayout title={title} subtitle={eyebrow}>
      <View style={[styles.heroCard, { borderColor: colors.glow }]}> 
        <View style={[styles.heroGlow, { backgroundColor: colors.glow }]} />
        <Image source={MODE_ART[mode]} style={styles.heroWatermark} resizeMode="contain" />
        <View style={[styles.heroIcon, { backgroundColor: colors.soft }]}> 
          <Image source={MODE_BADGE_ART[mode]} style={styles.heroAsset} resizeMode="contain" />
          <View style={styles.heroMiniIcon}><Ionicons name={icon} size={13} color="#FFFFFF" /></View>
        </View>
        <Text style={styles.heroKicker}>{eyebrow}</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </View>

      {!activeRun && !otherRun && !canAffordEntry ? (
        <Pressable style={styles.switchButton} onPress={() => router.push("/shop" as any)}>
          <Text style={styles.switchText}>Open Shop / Earn Currency</Text>
        </Pressable>
      ) : null}

      {otherRun ? (
        <View style={styles.lockedCard}>
          <Ionicons name="lock-closed" size={20} color="#B94A48" />
          <View style={{ flex: 1 }}>
            <Text style={styles.lockedTitle}>Active Arena session detected</Text>
            <Text style={styles.lockedText}>
              You already have an active {otherRunName} against {otherRun.opponentName}. Continue that {otherRunLabel}, or forfeit it before starting {title}.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.briefingCard}>
        <View style={styles.briefingHeader}>
          <View>
            <Text style={styles.sectionLabel}>Arena briefing</Text>
            <Text style={styles.sectionTitle}>{matchupTitle}</Text>
          </View>
          <View style={[styles.contractBadge, { backgroundColor: colors.bg }]}> 
            <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.vsRow}>
          <View style={styles.competitorCard}>
            <Text style={styles.competitorLabel}>You</Text>
            <Text style={styles.competitorName}>{snapshot?.profile.league ?? "Bronze"}</Text>
            <Text style={styles.competitorMeta}>{ratingText(snapshot?.profile.rating ?? 420)} rating</Text>
          </View>

          <View style={[styles.vsBadge, { backgroundColor: colors.bg }]}> 
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={styles.competitorCard}>
            <Text style={styles.competitorLabel}>{copy.opponentLabel}</Text>
            <Text style={styles.competitorName}>{activeRun?.opponentName ?? "Revealed on start"}</Text>
            <Text style={styles.competitorMeta}>
              {activeRun ? `${activeRun.opponentRating} rating` : `${modeDifficultyLabel(mode)} board`}
            </Text>
          </View>
        </View>

        <View style={styles.contractPanel}>
          <Text style={styles.contractText}>{activeRun ? copy.promise : copy.contract}</Text>
        </View>

        {mode === "ranked" ? (
          <View style={styles.pressurePanel}>
            <View style={styles.pressureItem}>
              <Text style={styles.pressureValue}>{ratingText(snapshot?.profile.winStreak ?? 0)}x</Text>
              <Text style={styles.pressureLabel}>streak pressure</Text>
            </View>
            <View style={styles.pressureDivider} />
            <View style={styles.pressureItem}>
              <Text style={styles.pressureValue}>{snapshot?.profile.league ?? "Bronze"}</Text>
              <Text style={styles.pressureLabel}>league defense</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.stakeGrid}>
          <View style={styles.stakeBox}>
            <Text style={styles.stakeLabel}>Target</Text>
            <Text style={styles.stakeValue}>
              {activeRun ? formatArenaTime(activeRun.targetTimeSec) : "Set on match"}
            </Text>
          </View>
          <View style={styles.stakeBox}>
            <Text style={styles.stakeLabel}>Reward</Text>
            <Text style={[styles.stakeValue, { color: colors.text }]}>{copy.reward}</Text>
          </View>
          <View style={styles.stakeBox}>
            <Text style={styles.stakeLabel}>Risk</Text>
            <Text style={styles.stakeValue}>{copy.risk}</Text>
          </View>
          <View style={styles.stakeBox}>
            <Text style={styles.stakeLabel}>Mistakes</Text>
            <Text style={styles.stakeValue}>{mode === "survival" ? "0 allowed" : "3 max"}</Text>
          </View>
        </View>
      </View>

      {activeRun ? (
        <View style={styles.pendingCard}>
          <Ionicons name="return-down-forward" size={20} color={colors.text} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pendingTitle}>Active {title}: {activeRun.stageName}</Text>
            <Text style={styles.pendingText}>
              {activeRunStatus(activeRun)} is protected. Continue the exact board, timer, powers, and mistake count — or forfeit it cleanly.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.economyCard}>
        <View style={styles.economyLine}>
          <Text style={styles.economyLabel}>Entry</Text>
          <Text style={styles.economyValue}>{formatCost(entryCost)}</Text>
        </View>
        <View style={styles.economyLine}>
          <Text style={styles.economyLabel}>Wallet</Text>
          <Text style={styles.economyValue}>{wallet?.coins ?? 0} Coins • {wallet?.tickets ?? 0} Tickets</Text>
        </View>
        {entryError ? <Text style={styles.entryError}>{entryError}</Text> : null}
      </View>

      <Pressable
        style={[
          styles.startButton,
          { backgroundColor: colors.bg },
          !activeRun && !otherRun && !canAffordEntry && styles.startButtonDisabled,
        ]}
        onPress={start}
      >
        <Text style={styles.startText}>
          {starting
            ? "Preparing..."
            : activeRun
              ? `${copy.continueLabel}: ${activeRun.stageName}`
              : otherRun
                ? `Return to ${otherRunName}`
                : startLabel}
        </Text>
        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
      </Pressable>

      {!activeRun && !otherRun && !canAffordEntry ? (
        <Pressable style={styles.switchButton} onPress={() => router.push("/shop" as any)}>
          <Text style={styles.switchText}>Open Shop / Earn Currency</Text>
        </Pressable>
      ) : null}

      {otherRun ? (
        <Pressable style={styles.switchButton} onPress={startFreshAfterForfeit}>
          <Text style={styles.switchText}>Forfeit active {otherRunLabel} and start {title}</Text>
        </Pressable>
      ) : null}

      {activeRun ? (
        <Pressable style={styles.forfeitButton} onPress={() => setConfirmForfeit(true)}>
          <Text style={styles.forfeitText}>{copy.forfeitLabel}</Text>
        </Pressable>
      ) : null}

      <View style={styles.rulesCard}>
        <Text style={styles.sectionTitle}>Rules of engagement</Text>
        {rules.map((rule, index) => (
          <View key={rule} style={styles.ruleRow}>
            <View style={[styles.ruleBadge, { backgroundColor: colors.soft }]}> 
              <Text style={[styles.ruleBadgeText, { color: colors.text }]}>{index + 1}</Text>
            </View>
            <Text style={styles.ruleText}>{rule}</Text>
          </View>
        ))}
      </View>

      <Modal visible={confirmForfeit} transparent animationType="fade" onRequestClose={() => setConfirmForfeit(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIcon, { backgroundColor: colors.soft }]}> 
              <Ionicons name="warning-outline" size={28} color="#B94A48" />
            </View>
            <Text style={styles.modalTitle}>{copy.forfeitLabel}?</Text>
            <Text style={styles.modalText}>
              This counts as an Arena loss, clears the active board, and applies the mode penalty.
            </Text>
            <Pressable style={styles.modalPrimary} onPress={forfeit}>
              <Text style={styles.modalPrimaryText}>Confirm Forfeit</Text>
            </Pressable>
            <Pressable style={styles.modalSecondary} onPress={() => setConfirmForfeit(false)}>
              <Text style={styles.modalSecondaryText}>Keep Playing</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ArenaLayout>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    alignItems: "center",
    borderRadius: 32,
    padding: 24,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    overflow: "hidden",
    ...sweirkiTheme.shadows.hero,
  },
  heroWatermark: { position: "absolute", right: -22, top: -18, width: 150, height: 150, opacity: 0.13 },
  heroAsset: { width: 50, height: 50 },
  heroMiniIcon: { position: "absolute", right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(12,48,92,0.92)", borderWidth: 1, borderColor: "rgba(255,255,255,0.65)" },
  heroGlow: {
    position: "absolute",
    top: -60,
    width: 170,
    height: 170,
    borderRadius: 85,
    opacity: 0.72,
  },
  heroIcon: {
    width: 76,
    height: 76,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
  },
  heroKicker: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 11,
    letterSpacing: 2.2,
    color: sweirkiTheme.colors.purple,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  heroTitle: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 28,
    color: sweirkiTheme.colors.inkDeep,
    textAlign: "center",
  },
  heroSubtitle: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 13,
    lineHeight: 19,
    color: sweirkiTheme.colors.textSoft,
    textAlign: "center",
    marginTop: 5,
  },
  briefingCard: {
    borderRadius: 28,
    padding: 18,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
    ...sweirkiTheme.shadows.glassCard,
  },
  briefingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  sectionLabel: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 11,
    letterSpacing: 2.1,
    color: sweirkiTheme.colors.cyanDeep,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontFamily: sweirkiTheme.fonts.bold,
    color: sweirkiTheme.colors.ink,
    fontSize: 22,
    marginTop: 2,
  },
  contractBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  vsRow: { flexDirection: "row", alignItems: "center", gap: 9, marginBottom: 12 },
  competitorCard: {
    flex: 1,
    borderRadius: 20,
    padding: 13,
    backgroundColor: "rgba(239,249,255,0.86)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
  },
  competitorLabel: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: sweirkiTheme.colors.textSoft,
  },
  competitorName: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 16,
    color: sweirkiTheme.colors.ink,
    marginTop: 2,
  },
  competitorMeta: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 11,
    color: sweirkiTheme.colors.textSoft,
    marginTop: 1,
  },
  vsBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  vsText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 13 },
  contractPanel: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(12,48,92,0.06)",
    borderWidth: 1,
    borderColor: "rgba(12,48,92,0.08)",
    marginBottom: 12,
  },
  contractText: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: sweirkiTheme.colors.text,
  },
  pressurePanel: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    backgroundColor: "rgba(245,185,67,0.12)",
    borderWidth: 1,
    borderColor: "rgba(245,185,67,0.30)",
  },
  pressureItem: { flex: 1 },
  pressureValue: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 20,
    color: sweirkiTheme.colors.inkDeep,
  },
  pressureLabel: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: sweirkiTheme.colors.textSoft,
    marginTop: 1,
  },
  pressureDivider: {
    width: 1,
    height: 34,
    marginHorizontal: 12,
    backgroundColor: "rgba(138,100,32,0.18)",
  },
  stakeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  stakeBox: {
    width: "48%",
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
  },
  stakeLabel: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: sweirkiTheme.colors.textSoft,
  },
  stakeValue: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 15,
    color: sweirkiTheme.colors.ink,
    marginTop: 3,
  },
  pendingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
  },
  pendingTitle: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.ink, fontSize: 15 },
  pendingText: { fontFamily: sweirkiTheme.fonts.regular, color: sweirkiTheme.colors.textSoft, fontSize: 12, lineHeight: 16 },
  lockedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 22,
    padding: 14,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.93)",
    borderWidth: 1,
    borderColor: "rgba(217,83,79,0.22)",
  },
  lockedTitle: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.ink, fontSize: 15 },
  lockedText: { fontFamily: sweirkiTheme.fonts.regular, color: sweirkiTheme.colors.textSoft, fontSize: 12, lineHeight: 16 },
  startButton: {
    height: 60,
    borderRadius: 24,
    marginBottom: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...sweirkiTheme.shadows.cta,
  },
  startText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 19 },
  switchButton: {
    minHeight: 50,
    borderRadius: 20,
    marginTop: -4,
    marginBottom: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,247,232,0.96)",
    borderWidth: 1,
    borderColor: "rgba(232,190,111,0.45)",
  },
  switchText: {
    fontFamily: sweirkiTheme.fonts.bold,
    color: "#8A6420",
    fontSize: 13,
    textAlign: "center",
  },
  forfeitButton: {
    height: 48,
    borderRadius: 20,
    marginBottom: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(217,83,79,0.28)",
  },
  forfeitText: { fontFamily: sweirkiTheme.fonts.bold, color: "#B94A48", fontSize: 14 },
  economyCard: { borderRadius: 20, padding: 14, marginBottom: 12, backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan },
  economyLine: { flexDirection: "row", justifyContent: "space-between", gap: 12, marginBottom: 5 },
  economyLabel: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.textSoft, textTransform: "uppercase" },
  economyValue: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 13, color: sweirkiTheme.colors.inkDeep, textAlign: "right", flex: 1 },
  entryError: { marginTop: 6, fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, lineHeight: 17, color: "#B94A48" },
  startButtonDisabled: { opacity: 0.62 },
  rulesCard: {
    borderRadius: 26,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
  },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  ruleBadge: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  ruleBadgeText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 15 },
  ruleText: {
    flex: 1,
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    color: sweirkiTheme.colors.text,
  },
  modalBackdrop: {
    flex: 1,
    padding: 22,
    backgroundColor: "rgba(3,18,34,0.54)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCard: {
    width: "100%",
    borderRadius: 32,
    padding: 22,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
    ...sweirkiTheme.shadows.hero,
  },
  modalIcon: {
    width: 66,
    height: 66,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 25, color: sweirkiTheme.colors.ink, textAlign: "center" },
  modalText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 19, color: sweirkiTheme.colors.textSoft, textAlign: "center", marginTop: 6, marginBottom: 18 },
  modalPrimary: { width: "100%", height: 54, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#B94A48" },
  modalPrimaryText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 16 },
  modalSecondary: { width: "100%", height: 48, alignItems: "center", justifyContent: "center", marginTop: 6 },
  modalSecondaryText: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.cyanDeep, fontSize: 15 },
});
