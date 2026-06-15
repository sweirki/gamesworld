import { useCallback, useState } from "react";
import { Image, ImageSourcePropType, Modal, Pressable, StyleSheet, Text, View } from "react-native";
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
  coins: require("../../assets/economy/currencies/coins_icon.png"),
  tickets: require("../../assets/economy/currencies/ticket_icon.png"),
  xp: require("../../assets/economy/currencies/season_xp_icon.png"),
  arenaPoints: require("../../assets/economy/currencies/arena_points_icon.png"),
  ranked: require("../../assets/arena/leagues/gold_league.png"),
  survival: require("../../assets/arena/ceremonies/relegation_warning_bg.png"),
  power: require("../../assets/arena/powers/reveal_power_active.png"),
  tournament: require("../../assets/arena/tournaments/champion_cup.png"),
  bronze: require("../../assets/arena/leagues/bronze_league.png"),
  silver: require("../../assets/arena/leagues/silver_league.png"),
  gold: require("../../assets/arena/leagues/gold_league.png"),
  elite: require("../../assets/arena/leagues/elite_league.png"),
  master: require("../../assets/arena/leagues/master_league.png"),
} as const;

const MODES: Array<{
  mode: ArenaMode;
  title: string;
  label: string;
  desc: string;
  route: string;
  art: ImageSourcePropType;
  accent: string;
  premium?: boolean;
}> = [
  {
    mode: "ranked",
    title: "Ranked Duel",
    label: "Rating match",
    desc: "One verified puzzle. Rating pressure. Clean win or clean loss.",
    route: "/arena/ranked",
    art: ASSETS.ranked,
    accent: "#2B9BE8",
  },
  {
    mode: "survival",
    title: "Survival Run",
    label: "Streak pressure",
    desc: "Climb through harder boards. One mistake ends the run.",
    route: "/arena/survival",
    art: ASSETS.survival,
    accent: "#F0A22E",
  },
  {
    mode: "power",
    title: "Power Arena",
    label: "Strategy rules",
    desc: "Limited Reveal, Shield, and Freeze charges. No waste moves.",
    route: "/arena/power",
    art: ASSETS.power,
    accent: "#7B61FF",
    premium: true,
  },
  {
    mode: "tournament",
    title: "Tournament Cup",
    label: "Bracket path",
    desc: "Qualifier, semifinal, final. Built for cup runs.",
    route: "/arena/tournament",
    art: ASSETS.tournament,
    accent: "#D8A528",
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

function modeStatus(mode: ArenaMode, snapshot: ArenaSnapshot | null) {
  const active = snapshot?.pendingRun?.mode === mode ? snapshot.pendingRun : null;
  if (active) return `${active.stageName} live • ${active.difficulty.toUpperCase()} • ${formatArenaTime(active.targetTimeSec)}`;
  if (mode === "ranked") return `${fmt(snapshot?.profile.rating ?? 420)} rating • streak ${fmt(snapshot?.profile.winStreak ?? 0)}`;
  if (mode === "survival") return "Perfect run pressure";
  if (mode === "power") return "Reveal • Shield • Freeze";
  return "Qualifier → Semifinal → Final";
}

function modeCta(mode: ArenaMode) {
  if (mode === "ranked") return "Enter ranked";
  if (mode === "survival") return "Start streak";
  if (mode === "power") return "Use powers";
  return "Open cup";
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

  const quickStart = async () => {
    playArenaFeedback("matchStart");
    if (snapshot?.pendingRun) {
      const run = snapshot.pendingRun;
      router.push({ pathname: "/sudoku", params: { level: run.difficulty, arena: run.mode } } as any);
      return;
    }

    const run = await startArenaRun("ranked", { isPremium });
    router.push({ pathname: "/sudoku", params: { level: run.difficulty, arena: run.mode } } as any);
  };

  const forfeitActiveRun = () => {
    if (!snapshot?.pendingRun) return;
    setForfeitVisible(true);
  };

  const confirmForfeit = async () => {
    if (!snapshot?.pendingRun) return;
    setForfeitVisible(false);
    await forfeitPendingArenaRun();
    playArenaFeedback("defeat");
    const next = await getArenaSnapshot();
    setSnapshot(next);
  };

  return (
    <ArenaLayout title="Arena" subtitle="Competitive Hub" showBack={false}>
      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>{season.name.toUpperCase()} • {season.daysRemaining} DAYS LEFT</Text>
          <Text style={styles.heroTitle}>Enter the Logic Arena</Text>
          <Text style={styles.heroSubtitle}>Ranked pressure, cup runs, streaks, badges, and season rewards in one compact competitive hub.</Text>
          <View style={styles.heroPills}>
            <View style={styles.heroPill}><Text style={styles.heroPillText}>{fmt(rating)} rating</Text></View>
            <View style={styles.heroPillGold}><Text style={styles.heroPillGoldText}>{completedGoals}/{goals.length} goals</Text></View>
          </View>
        </View>
        <Image source={ASSETS.hero} style={styles.heroArt} resizeMode="contain" />
      </View>

      <View style={styles.commandPanel}>
        <View style={styles.commandTop}>
          <Image source={leagueArt(league)} style={styles.leagueArt} resizeMode="contain" />
          <View style={styles.commandCopy}>
            <Text style={styles.panelLabel}>Current arena tier</Text>
            <Text style={styles.leagueTitle}>{league}</Text>
            <Text style={styles.leagueSub}>{ratingToNext > 0 ? `${ratingToNext} rating to next tier` : "Master ladder active"}</Text>
          </View>
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingNumber}>{fmt(rating)}</Text>
            <Text style={styles.ratingLabel}>rating</Text>
          </View>
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(7, Math.round(progress.progress * 100))}%` as any }]} /></View>
        <View style={styles.compactStats}>
          <View style={styles.compactStat}><Text style={styles.statValue}>{fmt(profile?.wins ?? 0)}</Text><Text style={styles.statLabel}>Wins</Text></View>
          <View style={styles.compactStat}><Text style={styles.statValue}>{fmt(profile?.winStreak ?? 0)}</Text><Text style={styles.statLabel}>Streak</Text></View>
          <View style={styles.compactStat}><Text style={styles.statValue}>{fmt(profile?.arenaPoints ?? 0)}</Text><Text style={styles.statLabel}>AP</Text></View>
          <View style={styles.compactStat}><Text style={styles.statValue}>{fmt(profile?.seasonXp ?? 0)}</Text><Text style={styles.statLabel}>XP</Text></View>
        </View>
      </View>

      <Pressable style={styles.primaryCta} onPress={quickStart}>
        <View style={styles.primaryGlow} />
        <View>
          <Text style={styles.ctaLabel}>{snapshot?.pendingRun ? "Active session" : "Ready now"}</Text>
          <Text style={styles.ctaTitle}>{snapshot?.pendingRun ? "Continue Arena Run" : "Enter Ranked Arena"}</Text>
        </View>
        <View style={styles.ctaOrb}><Ionicons name={snapshot?.pendingRun ? "return-down-forward" : "play"} size={24} color="#FFFFFF" /></View>
      </Pressable>

      {snapshot?.pendingRun ? (
        <Pressable style={styles.forfeitButton} onPress={forfeitActiveRun}><Text style={styles.forfeitText}>Forfeit active run</Text></Pressable>
      ) : null}

      <View style={styles.modeGrid}>
        {MODES.map((item, index) => {
          const wide = index === 0;
          return (
            <Pressable
              key={item.mode}
              style={({ pressed }) => [styles.modeCard, wide && styles.modeCardWide, pressed && styles.pressed]}
              onPress={() => { playArenaFeedback("tap"); router.push(item.route as any); }}
            >
              <View style={[styles.modeAccent, { backgroundColor: item.accent }]} />
              <Image source={item.art} style={[styles.modeArt, wide && styles.modeArtWide]} resizeMode="contain" />
              <View style={styles.modeCopy}>
                <View style={styles.modeMetaRow}>
                  <Text style={styles.modeLabel}>{item.label}</Text>
                  {item.premium ? <Text style={styles.premiumTag}>Premium</Text> : null}
                </View>
                <Text style={styles.modeTitle}>{item.title}</Text>
                <Text style={styles.modeDesc}>{item.desc}</Text>
                <View style={styles.modeFooter}>
                  <Text style={styles.modeStatus}>{modeStatus(item.mode, snapshot)}</Text>
                  <Text style={styles.modeCta}>{modeCta(item.mode)}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.utilityRow}>
        <Pressable style={styles.walletCard} onPress={() => { playArenaFeedback("tap"); router.push("/shop" as any); }}>
          <View style={styles.walletIconRow}>
            <Image source={ASSETS.coins} style={styles.walletAsset} />
            <Image source={ASSETS.tickets} style={styles.walletAsset} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.utilityTitle}>Sweirki Wallet</Text>
            <Text style={styles.utilityText}>{wallet?.coins ?? 0} Coins • {wallet?.tickets ?? 0} Tickets</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={sweirkiTheme.colors.cyanDeep} />
        </Pressable>

        <Pressable style={styles.walletCard} onPress={() => { playArenaFeedback("tap"); router.push("/arena/profile" as any); }}>
          <Image source={leagueArt(league)} style={styles.profileMiniArt} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.utilityTitle}>Arena Profile</Text>
            <Text style={styles.utilityText}>Best streak {fmt(profile?.bestStreak ?? 0)} • Cups {fmt(profile?.cupsWon ?? 0)}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={sweirkiTheme.colors.cyanDeep} />
        </Pressable>
      </View>

      <View style={styles.goalsCard}>
        <View style={styles.goalsHeader}>
          <View>
            <Text style={styles.goalsKicker}>Momentum board</Text>
            <Text style={styles.goalsTitle}>Daily / weekly pressure</Text>
          </View>
          <View style={styles.goalsPill}><Text style={styles.goalsPillText}>{completedGoals}/{goals.length}</Text></View>
        </View>
        {goals.slice(0, 3).map((goal, index) => {
          const width = `${Math.max(8, Math.min(100, Math.round((goal.progress / goal.target) * 100)))}%`;
          const icons = [ASSETS.ranked, ASSETS.power, ASSETS.tournament];
          return (
            <View key={goal.id} style={styles.goalRow}>
              <Image source={icons[index] ?? ASSETS.xp} style={styles.goalAsset} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <View style={styles.goalTitleRow}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalProgress}>{goal.progress}/{goal.target}</Text>
                </View>
                <Text style={styles.goalReward}>{goal.reward}</Text>
                <View style={styles.goalTrack}><View style={[styles.goalFill, { width: width as any }]} /></View>
              </View>
            </View>
          );
        })}
      </View>

      {snapshot?.lastResult ? (
        <Pressable style={styles.resultCard} onPress={() => { playArenaFeedback("tap"); router.push("/arena/result" as any); }}>
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
        <Image source={ASSETS.xp} style={styles.seasonAsset} />
        <View style={{ flex: 1 }}>
          <Text style={styles.seasonTitle}>{season.theme}</Text>
          <Text style={styles.seasonText}>{season.rewardPreview}. Track: {rewardPreview?.seasonTrack ?? "0 XP / 0 AP"}.</Text>
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

const styles = StyleSheet.create({
  heroCard: {
    minHeight: 174,
    borderRadius: 30,
    padding: 19,
    marginBottom: 12,
    backgroundColor: "rgba(255,255,255,0.97)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...sweirkiTheme.shadows.hero,
  },
  heroCopy: { flex: 1, zIndex: 2 },
  kicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, letterSpacing: 2, color: sweirkiTheme.colors.purple, marginBottom: 7, textTransform: "uppercase" },
  heroTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 27, lineHeight: 31, color: sweirkiTheme.colors.inkDeep },
  heroSubtitle: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, lineHeight: 17, color: sweirkiTheme.colors.textSoft, marginTop: 7 },
  heroPills: { flexDirection: "row", gap: 8, marginTop: 12 },
  heroPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(37,141,215,0.12)" },
  heroPillGold: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "rgba(245,185,67,0.18)" },
  heroPillText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, color: sweirkiTheme.colors.cyanDeep },
  heroPillGoldText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, color: "#8B651A" },
  heroArt: { width: 148, height: 148, marginRight: -24, marginLeft: -8 },

  commandPanel: { borderRadius: 26, padding: 15, marginBottom: 12, backgroundColor: "rgba(13,49,92,0.96)", borderWidth: 1, borderColor: "rgba(255,255,255,0.34)", overflow: "hidden", ...sweirkiTheme.shadows.glassCard },
  commandTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  leagueArt: { width: 62, height: 62 },
  commandCopy: { flex: 1 },
  panelLabel: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, letterSpacing: 1.7, color: "rgba(255,255,255,0.62)", textTransform: "uppercase" },
  leagueTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 26, color: "#FFFFFF", marginTop: 1 },
  leagueSub: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, color: "rgba(255,255,255,0.68)", marginTop: 1 },
  ratingBadge: { minWidth: 66, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(53,200,244,0.22)", borderWidth: 1, borderColor: "rgba(107,229,201,0.38)" },
  ratingNumber: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 19 },
  ratingLabel: { fontFamily: sweirkiTheme.fonts.bold, color: "rgba(255,255,255,0.66)", fontSize: 9, textTransform: "uppercase" },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)", marginTop: 12, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: sweirkiTheme.colors.gold },
  compactStats: { flexDirection: "row", gap: 8, marginTop: 12 },
  compactStat: { flex: 1, borderRadius: 16, paddingVertical: 9, paddingHorizontal: 10, backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.14)" },
  statValue: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 17 },
  statLabel: { fontFamily: sweirkiTheme.fonts.regular, color: "rgba(255,255,255,0.68)", fontSize: 10, marginTop: 1 },

  primaryCta: { height: 76, borderRadius: 25, paddingHorizontal: 19, marginBottom: 12, backgroundColor: sweirkiTheme.colors.cyanDeep, flexDirection: "row", alignItems: "center", justifyContent: "space-between", overflow: "hidden", ...sweirkiTheme.shadows.cta },
  primaryGlow: { position: "absolute", right: -30, top: -48, width: 145, height: 145, borderRadius: 72, backgroundColor: "rgba(255,255,255,0.16)" },
  ctaLabel: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, color: "rgba(255,255,255,0.76)", letterSpacing: 1.7, textTransform: "uppercase" },
  ctaTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 23, color: "#FFFFFF", marginTop: 2 },
  ctaOrb: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.20)", alignItems: "center", justifyContent: "center" },
  forfeitButton: { height: 44, borderRadius: 20, marginBottom: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.9)", borderWidth: 1, borderColor: "rgba(217,83,79,0.28)" },
  forfeitText: { fontFamily: sweirkiTheme.fonts.bold, color: "#B94A48", fontSize: 14 },

  modeGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12, marginBottom: 12 },
  modeCard: { width: "48%", minHeight: 176, borderRadius: 25, padding: 14, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan, overflow: "hidden", ...sweirkiTheme.shadows.glassCard },
  modeCardWide: { minHeight: 176 },
  pressed: { transform: [{ scale: 0.988 }], opacity: 0.9 },
  modeAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 5, opacity: 0.9 },
  modeArt: { alignSelf: "center", width: 74, height: 74, marginTop: 1, marginBottom: 9, opacity: 0.98 },
  modeArtWide: { width: 82, height: 82 },
  modeCopy: { flex: 1, zIndex: 2 },
  modeMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  modeLabel: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, color: sweirkiTheme.colors.cyanDeep, letterSpacing: 1.7, textTransform: "uppercase" },
  premiumTag: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, color: "#8A6420", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(245,185,67,0.18)", overflow: "hidden" },
  modeTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 18, color: sweirkiTheme.colors.inkDeep },
  modeDesc: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 11, lineHeight: 15, color: sweirkiTheme.colors.textSoft, marginTop: 3 },
  modeFooter: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 10 },
  modeStatus: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, color: sweirkiTheme.colors.ink, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(53,200,244,0.10)", overflow: "hidden" },
  modeCta: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, color: "#8A6420", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(245,185,67,0.18)", overflow: "hidden" },

  utilityRow: { gap: 10, marginBottom: 12 },
  walletCard: { minHeight: 66, flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 22, padding: 12, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  walletIconRow: { width: 46, height: 42, alignItems: "center", justifyContent: "center" },
  walletAsset: { width: 30, height: 30, position: "absolute" },
  profileMiniArt: { width: 52, height: 52 },
  utilityTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 16, color: sweirkiTheme.colors.inkDeep },
  utilityText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, color: sweirkiTheme.colors.textSoft, marginTop: 1 },

  goalsCard: { borderRadius: 24, padding: 14, marginBottom: 12, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.glassCard },
  goalsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  goalsKicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, letterSpacing: 1.7, color: sweirkiTheme.colors.purple, textTransform: "uppercase" },
  goalsTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 17, color: sweirkiTheme.colors.inkDeep, marginTop: 2 },
  goalsPill: { minWidth: 45, height: 29, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(53,200,244,0.16)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  goalsPillText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.cyanDeep },
  goalRow: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 7 },
  goalAsset: { width: 38, height: 38 },
  goalTitleRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  goalTitle: { flex: 1, fontFamily: sweirkiTheme.fonts.bold, fontSize: 13, color: sweirkiTheme.colors.inkDeep },
  goalProgress: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.cyanDeep },
  goalReward: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 11, color: sweirkiTheme.colors.textSoft, marginTop: 1 },
  goalTrack: { height: 6, borderRadius: 999, backgroundColor: "rgba(20,56,95,0.08)", overflow: "hidden", marginTop: 6 },
  goalFill: { height: "100%", borderRadius: 999, backgroundColor: sweirkiTheme.colors.gold },

  resultCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22, padding: 14, marginBottom: 12, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan },
  resultIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#D9534F" },
  resultIconWin: { backgroundColor: sweirkiTheme.colors.cyanDeep },
  resultTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 16, color: sweirkiTheme.colors.ink },
  resultText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, color: sweirkiTheme.colors.textSoft, marginTop: 1 },

  seasonStrip: { flexDirection: "row", alignItems: "center", gap: 11, borderRadius: 22, padding: 13, marginBottom: 4, backgroundColor: "rgba(255,255,255,0.92)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan },
  seasonAsset: { width: 38, height: 38 },
  seasonTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 15, color: sweirkiTheme.colors.inkDeep },
  seasonText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, lineHeight: 16, color: sweirkiTheme.colors.textSoft, marginTop: 1 },

  modalShade: { flex: 1, backgroundColor: "rgba(5,20,38,0.62)", alignItems: "center", justifyContent: "center", padding: 24 },
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
