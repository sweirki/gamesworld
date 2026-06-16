import { useCallback, useState } from "react";
import { Image, ImageSourcePropType, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ArenaLayout from "./ArenaLayout";
import { sweirkiTheme } from "../theme/sweirkiTheme";
import {
  ArenaSnapshot,
  forfeitPendingArenaRun,
  formatArenaTime,
  getArenaSnapshot,
  getArenaGoals,
  getArenaRewardPreview,
  getArenaSeason,
  getLeagueProgress,
  startArenaRun,
  type ArenaMode,
} from "../../src/arena/arenaEngine";
import { playArenaFeedback } from "../../src/arena/arenaFeedback";
import { useRevenueCat } from "../../src/hooks/useRevenueCat";
import { getEconomyWallet, type EconomyWallet } from "../../src/economy/economyEngine";

const ASSETS = {
  hero: require("../../assets/branding/heroes/arena-hero.png"),
  wallet: require("../../assets/arena/ui/wallet_status_v2.png"),
  profile: require("../../assets/arena/ui/arena_profile_v2.png"),
  xp: require("../../assets/economy/currencies/season_xp_icon.png"),
  arenaPoints: require("../../assets/economy/currencies/arena_points_icon.png"),
  ranked: require("../../assets/arena/modes/ranked_duel_v2.png"),
  survival: require("../../assets/arena/modes/survival_run_v2.png"),
  power: require("../../assets/arena/modes/power_arena_v2.png"),
  tournament: require("../../assets/arena/modes/tournament_cup_v2.png"),
  rankBronze: require("../../assets/economy/badges/bronze_badge2.png"),
rankSilver: require("../../assets/economy/badges/silver_badge.png"),
rankGold: require("../../assets/economy/badges/gold_badge.png"),
rankPlatinum: require("../../assets/economy/badges/gold_badge.png"),
rankMaster: require("../../assets/economy/badges/master_badge.png"),
rankGrandmaster: require("../../assets/economy/badges/champion_badge.png"),
  bronze: require("../../assets/arena/leagues/bronze_league.png"),
  silver: require("../../assets/arena/leagues/silver_league.png"),
  gold: require("../../assets/arena/leagues/gold_league.png"),
  elite: require("../../assets/arena/leagues/elite_league.png"),
  master: require("../../assets/arena/leagues/master_league.png"),
} as const;

type ModeTile = {
  mode: ArenaMode;
  title: string;
  label: string;
  desc: string;
  route: string;
  art: ImageSourcePropType;
  accent: string;
  softAccent: string;
  cardGradient: readonly [string, string];
  iconGradient: readonly [string, string];
  premium?: boolean;
};

const MODES: ModeTile[] = [
  {
    mode: "ranked",
    title: "Ranked Duel",
    label: "Flagship",
    desc: "One verified board. Rating pressure.",
    route: "/arena/ranked",
    art: ASSETS.ranked,
    accent: sweirkiTheme.colors.cyanDeep,
    softAccent: "rgba(53,200,244,0.22)",
    cardGradient: ["rgba(255,255,255,0.99)", "rgba(228,248,255,0.96)"],
    iconGradient: ["rgba(255,255,255,0.98)", "rgba(212,245,255,0.92)"],
  },
  {
    mode: "survival",
    title: "Survival Run",
    label: "Pressure",
    desc: "Climb harder boards. One collapse ends it.",
    route: "/arena/survival",
    art: ASSETS.survival,
    accent: sweirkiTheme.colors.gold,
    softAccent: "rgba(245,185,67,0.24)",
    cardGradient: ["rgba(255,255,255,0.99)", "rgba(255,247,225,0.95)"],
    iconGradient: ["rgba(255,255,255,0.98)", "rgba(255,237,181,0.9)"],
  },
  {
    mode: "power",
    title: "Power Arena",
    label: "Strategy",
    desc: "Reveal, Shield, and Freeze under pressure.",
    route: "/arena/power",
    art: ASSETS.power,
    accent: sweirkiTheme.colors.purple,
    softAccent: "rgba(143,121,255,0.24)",
    cardGradient: ["rgba(255,255,255,0.99)", "rgba(244,240,255,0.96)"],
    iconGradient: ["rgba(255,255,255,0.98)", "rgba(231,224,255,0.9)"],
    premium: true,
  },
  {
    mode: "tournament",
    title: "Tournament Cup",
    label: "Bracket",
    desc: "Qualifier, semifinal, final. Built for cups.",
    route: "/arena/tournament",
    art: ASSETS.tournament,
    accent: "#D8A528",
    softAccent: "rgba(216,165,40,0.22)",
    cardGradient: ["rgba(255,255,255,0.99)", "rgba(255,249,230,0.95)"],
    iconGradient: ["rgba(255,255,255,0.98)", "rgba(255,239,190,0.88)"],
    premium: true,
  },
];

function fmt(n: number) {
  return Number.isFinite(n) ? String(Math.round(n)) : "0";
}

function leagueArt(league?: string) {
  const key = String(league ?? "Bronze").toLowerCase();
  if (key.includes("master")) return ASSETS.master;
  if (key.includes("elite")) return ASSETS.elite;
  if (key.includes("gold")) return ASSETS.gold;
  if (key.includes("silver")) return ASSETS.silver;
  return ASSETS.bronze;
}

function rankArt(league?: string) {
  const key = String(league ?? "Bronze").toLowerCase();
  if (key.includes("master")) return ASSETS.rankMaster;
  if (key.includes("elite")) return ASSETS.rankGrandmaster;
  if (key.includes("gold")) return ASSETS.rankGold;
  if (key.includes("silver")) return ASSETS.rankSilver;
  return ASSETS.rankBronze;
}

function modeStatus(mode: ArenaMode, snapshot: ArenaSnapshot | null) {
  const active = snapshot?.pendingRun?.mode === mode ? snapshot.pendingRun : null;
  if (active) return `${active.stageName} live`;
  if (mode === "ranked") return `${fmt(snapshot?.profile.rating ?? 420)} rating`;
  if (mode === "survival") return "Perfect pressure";
  if (mode === "power") return "Reveal • Shield • Freeze";
  return "Cup path";
}

export default function ArenaHub() {
  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null);
  const [wallet, setWallet] = useState<EconomyWallet | null>(null);
  const [forfeitVisible, setForfeitVisible] = useState(false);
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

  const profile = snapshot?.profile;
  const progress = getLeagueProgress(profile?.rating ?? 420);
  const season = getArenaSeason();
  const rewardPreview = profile ? getArenaRewardPreview(profile) : null;
  const goals = getArenaGoals(snapshot);
  const completedGoals = goals.filter((goal) => goal.complete).length;
  const league = profile?.league ?? "Bronze";
  const rating = profile?.rating ?? 420;
  const ratingToNext = Math.max(0, progress.nextRating - rating);
  const pendingRun = snapshot?.pendingRun;

  const quickStart = async () => {
    playArenaFeedback("matchStart");
    if (pendingRun) {
      router.push({ pathname: "/sudoku", params: { level: pendingRun.difficulty, arena: pendingRun.mode } } as any);
      return;
    }

    const run = await startArenaRun("ranked", { isPremium });
    router.push({ pathname: "/sudoku", params: { level: run.difficulty, arena: run.mode } } as any);
  };

  const forfeitActiveRun = () => {
    if (!pendingRun) return;
    setForfeitVisible(true);
  };

  const confirmForfeit = async () => {
    if (!pendingRun) return;
    setForfeitVisible(false);
    await forfeitPendingArenaRun();
    playArenaFeedback("defeat");
    const next = await getArenaSnapshot();
    setSnapshot(next);
  };

  return (
    <ArenaLayout title="Arena" subtitle="Competitive Hub" showBack={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>{season.name.toUpperCase()} • {season.daysRemaining} DAYS LEFT</Text>
          <Text style={styles.heroTitle}>Logic Arena</Text>
          <Text style={styles.heroSubtitle}>Choose your competitive path. Protect rating. Chase season rewards.</Text>
          <Pressable style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]} onPress={quickStart}>
            <View>
              <Text style={styles.ctaLabel}>{pendingRun ? "LIVE SESSION" : "MAIN EVENT"}</Text>
              <Text style={styles.ctaTitle}>{pendingRun ? "Continue Run" : "Enter Ranked"}</Text>
            </View>
            <View style={styles.ctaOrb}>
              <Ionicons name={pendingRun ? "return-down-forward" : "play"} size={21} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
        <Image source={ASSETS.hero} style={styles.heroArt} resizeMode="contain" />
      </View>

      {pendingRun ? (
        <View style={styles.liveRunCard}>
          <View style={styles.liveDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.liveTitle}>{pendingRun.stageName} is live</Text>
            <Text style={styles.liveText}>{pendingRun.mode.toUpperCase()} • {pendingRun.difficulty.toUpperCase()} • target {formatArenaTime(pendingRun.targetTimeSec)}</Text>
          </View>
          <Pressable style={styles.forfeitButton} onPress={forfeitActiveRun}>
            <Text style={styles.forfeitText}>Forfeit</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.identityPanel}>
        <View style={styles.leagueDisc}>
          <Image source={rankArt(league)} style={styles.leagueArt} resizeMode="contain" />
        </View>
        <View style={styles.identityCopy}>
          <Text style={styles.panelLabel}>Current Tier</Text>
          <Text style={styles.leagueTitle}>{league}</Text>
          <Text style={styles.leagueSub}>{ratingToNext > 0 ? `${ratingToNext} rating to next tier` : "Master ladder active"}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(7, Math.round(progress.progress * 100))}%` as any }]} />
          </View>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingNumber}>{fmt(rating)}</Text>
          <Text style={styles.ratingLabel}>Rating</Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionKicker}>Choose your fight</Text>
          <Text style={styles.sectionTitle}>Arena Modes</Text>
        </View>
        <Text style={styles.sectionMeta}>{completedGoals}/{goals.length} goals</Text>
      </View>

      <View style={styles.modeGrid}>
        <View style={styles.modeRow}>
          <ModeCard item={MODES[0]} snapshot={snapshot} isPremium={isPremium} />
          <ModeCard item={MODES[1]} snapshot={snapshot} isPremium={isPremium} />
        </View>
        <View style={styles.modeRow}>
          <ModeCard item={MODES[2]} snapshot={snapshot} isPremium={isPremium} />
          <ModeCard item={MODES[3]} snapshot={snapshot} isPremium={isPremium} />
        </View>
      </View>

      <View style={styles.secondaryGrid}>
        <Pressable style={({ pressed }) => [styles.secondaryCard, pressed && styles.pressed]} onPress={() => { playArenaFeedback("tap"); router.push("/shop" as any); }}>
          <Image source={ASSETS.wallet} style={styles.secondaryAsset} resizeMode="contain" />
          <Text style={styles.secondaryTitle}>Wallet</Text>
          <Text style={styles.secondaryText}>{wallet?.coins ?? 0} Coins • {wallet?.tickets ?? 0} Tickets</Text>
        </Pressable>

        <Pressable style={({ pressed }) => [styles.secondaryCard, pressed && styles.pressed]} onPress={() => { playArenaFeedback("tap"); router.push("/arena/profile" as any); }}>
          <Image source={ASSETS.profile} style={styles.secondaryAsset} resizeMode="contain" />
          <Text style={styles.secondaryTitle}>Profile</Text>
          <Text style={styles.secondaryText}>Best {fmt(profile?.bestStreak ?? 0)} • Cups {fmt(profile?.cupsWon ?? 0)}</Text>
        </Pressable>
      </View>

      <View style={styles.goalsCard}>
        <View style={styles.goalsHeader}>
          <View>
            <Text style={styles.goalsKicker}>Momentum Board</Text>
            <Text style={styles.goalsTitle}>Daily pressure</Text>
          </View>
          <View style={styles.goalsPill}><Text style={styles.goalsPillText}>{completedGoals}/{goals.length}</Text></View>
        </View>
        {goals.slice(0, 2).map((goal, index) => {
          const width = `${Math.max(8, Math.min(100, Math.round((goal.progress / goal.target) * 100)))}%`;
          const icons = [ASSETS.arenaPoints, ASSETS.xp];
          return (
            <View key={goal.id} style={styles.goalRow}>
              <Image source={icons[index] ?? ASSETS.xp} style={styles.goalAsset} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <View style={styles.goalTitleRow}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalProgress}>{goal.progress}/{goal.target}</Text>
                </View>
                <View style={styles.goalTrack}><View style={[styles.goalFill, { width: width as any }]} /></View>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.footerStack}>
        {snapshot?.lastResult ? (
          <Pressable style={({ pressed }) => [styles.resultCard, pressed && styles.pressed]} onPress={() => { playArenaFeedback("tap"); router.push("/arena/result" as any); }}>
            <View style={[styles.resultIcon, snapshot.lastResult.win && styles.resultIconWin]}>
              <Ionicons name={snapshot.lastResult.win ? "checkmark" : "close"} size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.resultTitle}>{snapshot.lastResult.win ? "Last arena win" : "Last arena loss"}</Text>
              <Text style={styles.resultText}>{snapshot.lastResult.opponentName} • {formatArenaTime(snapshot.lastResult.playerTimeSec)} • {snapshot.lastResult.ratingDelta > 0 ? "+" : ""}{snapshot.lastResult.ratingDelta} rating</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={sweirkiTheme.colors.cyanDeep} />
          </Pressable>
        ) : null}

        <View style={styles.seasonStrip}>
          <Image source={ASSETS.xp} style={styles.seasonAsset} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.seasonTitle}>{season.theme}</Text>
            <Text style={styles.seasonText}>{season.rewardPreview}. Track: {rewardPreview?.seasonTrack ?? "0 XP / 0 AP"}.</Text>
          </View>
        </View>
      </View>

      <Modal transparent visible={forfeitVisible} animationType="fade" onRequestClose={() => setForfeitVisible(false)}>
        <View style={styles.modalShade}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcon}>
              <Ionicons name="warning" size={22} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>Forfeit Arena run?</Text>
            <Text style={styles.modalText}>This counts as a loss and clears the active Arena session.</Text>
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setForfeitVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={confirmForfeit}>
                <Text style={styles.modalConfirmText}>Forfeit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ArenaLayout>
  );
}

function ModeCard({ item, snapshot, isPremium }: { item: ModeTile; snapshot: ArenaSnapshot | null; isPremium: boolean }) {
  const locked = Boolean(item.premium && !isPremium);

  return (
    <Pressable
      style={({ pressed }) => [styles.cardMotion, pressed && styles.pressed]}
      onPress={() => {
        playArenaFeedback("tap");
        router.push(item.route as any);
      }}
    >
      <LinearGradient colors={item.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.modeCard, { borderColor: item.softAccent }]}>
        <View style={[styles.cardWash, { backgroundColor: item.softAccent }]} />
        <View style={styles.iconPlate}>
          <Image source={item.art} style={[styles.modeArt, locked && styles.lockedArt]} resizeMode="contain" />
        </View>
        <View style={styles.modeMetaRow}>
          <Text style={[styles.modeLabel, { color: item.accent }]}>{item.label}</Text>
          {locked ? <Text style={styles.lockTag}>★ Premium</Text> : null}
        </View>
        <Text style={styles.modeTitle}>{item.title}</Text>
        <Text style={styles.modeDesc}>{item.desc}</Text>
        <Text style={[styles.modeStatus, { color: item.accent }]}>{modeStatus(item.mode, snapshot)}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    minHeight: 170,
    borderRadius: 30,
    paddingLeft: 15,
    paddingRight: 6,
    paddingVertical: 15,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: sweirkiTheme.colors.glassStrong,
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    overflow: "hidden",
    ...sweirkiTheme.shadows.hero,
  },
  heroGlow: {
    position: "absolute",
    right: -34,
    top: -26,
    width: 178,
    height: 178,
    borderRadius: 89,
    backgroundColor: "rgba(53,200,244,0.12)",
  },
  heroCopy: { flex: 1, zIndex: 2, paddingRight: 4 },
  kicker: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.9,
    color: sweirkiTheme.colors.cyanDeep,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  heroTitle: {
    maxWidth: 210,
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 31,
    lineHeight: 34,
    color: sweirkiTheme.colors.inkDeep,
  },
  heroSubtitle: {
    maxWidth: 205,
    marginTop: 6,
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: sweirkiTheme.colors.textSoft,
  },
  heroArt: {
    width: 144,
    height: 144,
    marginRight: -13,
    marginBottom: -7,
  },
  primaryCta: {
    width: 206,
    minHeight: 55,
    borderRadius: 20,
    paddingLeft: 15,
    paddingRight: 7,
    marginTop: 13,
    backgroundColor: sweirkiTheme.colors.cyanDeep,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.55)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...sweirkiTheme.shadows.cta,
  },
  ctaLabel: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 9,
    color: "rgba(255,255,255,0.82)",
    letterSpacing: 1.5,
  },
  ctaTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 19, color: "#FFFFFF", marginTop: 1 },
  ctaOrb: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { transform: [{ scale: 0.985 }], opacity: 0.94 },

  liveRunCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 20,
    padding: 11,
    marginBottom: 11,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
  },
  liveDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: sweirkiTheme.colors.gold },
  liveTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 14, color: sweirkiTheme.colors.inkDeep },
  liveText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 11, color: sweirkiTheme.colors.textSoft, marginTop: 1 },
  forfeitButton: { borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, backgroundColor: "rgba(217,83,79,0.12)" },
  forfeitText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, color: "#C84B47" },

  identityPanel: {
    minHeight: 92,
    borderRadius: 26,
    padding: 13,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    ...sweirkiTheme.shadows.glassCard,
  },
  leagueDisc: {
    width: 66,
    height: 66,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  leagueArt: { width: 66, height: 66 },
  identityCopy: { flex: 1 },
  panelLabel: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 9,
    letterSpacing: 1.6,
    color: sweirkiTheme.colors.purple,
    textTransform: "uppercase",
  },
  leagueTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 23, color: sweirkiTheme.colors.inkDeep, marginTop: 1 },
  leagueSub: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 11, color: sweirkiTheme.colors.textSoft, marginTop: 1 },
  progressTrack: { height: 7, borderRadius: 999, backgroundColor: "rgba(20,56,95,0.08)", marginTop: 8, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: sweirkiTheme.colors.gold },
  ratingBadge: {
    minWidth: 58,
    height: 54,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sweirkiTheme.colors.inkDeep,
    borderWidth: 1,
    borderColor: "rgba(245,185,67,0.28)",
  },
  ratingNumber: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 19 },
  ratingLabel: { fontFamily: sweirkiTheme.fonts.bold, color: "rgba(255,255,255,0.64)", fontSize: 8, letterSpacing: 0.7, textTransform: "uppercase" },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 9,
    paddingHorizontal: 2,
  },
  sectionKicker: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 9,
    letterSpacing: 1.7,
    color: sweirkiTheme.colors.purple,
    textTransform: "uppercase",
  },
  sectionTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 22, color: sweirkiTheme.colors.inkDeep, marginTop: 1 },
  sectionMeta: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.cyanDeep, marginBottom: 3 },

  modeGrid: { gap: 10, marginBottom: 12 },
  modeRow: { flexDirection: "row", gap: 10 },
  cardMotion: { flex: 1 },
  modeCard: {
    minHeight: 174,
    borderRadius: 24,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
    ...sweirkiTheme.shadows.glassCard,
  },
  cardWash: {
    position: "absolute",
    right: -31,
    bottom: -36,
    width: 112,
    height: 112,
    borderRadius: 56,
    opacity: 0.52,
  },
  iconPlate: {
    alignSelf: "flex-start",
    width: 104,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
    overflow: "visible",
  },
  iconGlow: { position: "absolute", width: 72, height: 42, borderRadius: 22, opacity: 0 },
  modeArt: { width: 96, height: 96 },
  lockedArt: { opacity: 0.58 },
  modeMetaRow: { minHeight: 20, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginBottom: 2 },
  modeLabel: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  lockTag: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: "rgba(255,244,213,0.9)",
    borderWidth: 1,
    borderColor: "rgba(245,185,67,0.45)",
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 8.5,
    color: "#9A6908",
  },
  modeTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 18, lineHeight: 21, color: sweirkiTheme.colors.inkDeep },
  modeDesc: { marginTop: 4, fontFamily: sweirkiTheme.fonts.regular, fontSize: 11.5, lineHeight: 15, color: sweirkiTheme.colors.textSoft },
  modeStatus: {
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 7,
    backgroundColor: "rgba(53,200,244,0.10)",
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 10,
  },

  secondaryGrid: { flexDirection: "row", gap: 10, marginBottom: 10 },
  secondaryCard: {
    flex: 1,
    minHeight: 104,
    borderRadius: 23,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  secondaryAsset: { width: 54, height: 54, marginBottom: 4, alignSelf: "flex-start" },
  secondaryTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 16, color: sweirkiTheme.colors.inkDeep },
  secondaryText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 11, color: sweirkiTheme.colors.textSoft, marginTop: 1 },

  goalsCard: {
    borderRadius: 24,
    padding: 13,
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    ...sweirkiTheme.shadows.glassCard,
  },
  goalsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 7 },
  goalsKicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 9, letterSpacing: 1.6, color: sweirkiTheme.colors.purple, textTransform: "uppercase" },
  goalsTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 17, color: sweirkiTheme.colors.inkDeep, marginTop: 1 },
  goalsPill: { minWidth: 43, height: 28, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(53,200,244,0.16)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  goalsPillText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.cyanDeep },
  goalRow: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 6 },
  goalAsset: { width: 30, height: 30 },
  goalTitleRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  goalTitle: { flex: 1, fontFamily: sweirkiTheme.fonts.bold, fontSize: 13, color: sweirkiTheme.colors.inkDeep },
  goalProgress: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.cyanDeep },
  goalTrack: { height: 6, borderRadius: 999, backgroundColor: "rgba(20,56,95,0.08)", overflow: "hidden", marginTop: 6 },
  goalFill: { height: "100%", borderRadius: 999, backgroundColor: sweirkiTheme.colors.gold },

  footerStack: { gap: 10, marginBottom: 4 },
  resultCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 23, padding: 13, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan },
  resultIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#D9534F" },
  resultIconWin: { backgroundColor: sweirkiTheme.colors.cyanDeep },
  resultTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 16, color: sweirkiTheme.colors.inkDeep },
  resultText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, color: sweirkiTheme.colors.textSoft, marginTop: 1 },
  seasonStrip: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 23, padding: 13, backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan },
  seasonAsset: { width: 36, height: 36 },
  seasonTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 15, color: sweirkiTheme.colors.inkDeep },
  seasonText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, lineHeight: 16, color: sweirkiTheme.colors.textSoft, marginTop: 1 },

  modalShade: { flex: 1, backgroundColor: "rgba(5,20,38,0.66)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: 28, padding: 20, backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, alignItems: "center", ...sweirkiTheme.shadows.hero },
  modalIcon: { width: 50, height: 50, borderRadius: 25, backgroundColor: "#D9534F", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  modalTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 22, color: sweirkiTheme.colors.inkDeep, textAlign: "center" },
  modalText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 14, lineHeight: 20, color: sweirkiTheme.colors.textSoft, textAlign: "center", marginTop: 6 },
  modalActions: { flexDirection: "row", gap: 10, width: "100%", marginTop: 18 },
  modalCancel: { flex: 1, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(53,200,244,0.12)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  modalConfirm: { flex: 1, height: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#D9534F" },
  modalCancelText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 14, color: sweirkiTheme.colors.cyanDeep },
  modalConfirmText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 14, color: "#FFFFFF" },
});
