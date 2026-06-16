import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ArenaLayout from "./ArenaLayout";
import { sweirkiTheme } from "../theme/sweirkiTheme";
import {
  ArenaResult,
  formatArenaTime,
  getArenaSnapshot,
  getLeagueBadge,
  getLeagueProgress,
} from "../../src/arena/arenaEngine";
import { playArenaFeedback } from "../../src/arena/arenaFeedback";


const CEREMONY_ART = {
  champion: require("../../assets/arena/ceremonies/champion_ceremony_v2.png"),
  badge: require("../../assets/arena/ceremonies/badge_unlock_v2.png"),
  promotion: require("../../assets/arena/ceremonies/promotion_ceremony_v2.png"),
  reward: require("../../assets/arena/ceremonies/reward_ceremony_v2.png"),
  relegation: require("../../assets/arena/ceremonies/relegation_ceremony_v2.png"),
};


const REWARD_ART = {
  coins: require("../../assets/economy/rewards/reward_coins.png"),
  xp: require("../../assets/economy/currencies/season_xp_icon.png"),
  ap: require("../../assets/economy/currencies/arena_points_icon.png"),
};

function resultArt(result: ArenaResult) {
  if (result.cupChampion) return CEREMONY_ART.champion;
  if (result.badgeUnlocked) return CEREMONY_ART.badge;
  if (result.promotion) return CEREMONY_ART.promotion;
  if (result.demotion) return CEREMONY_ART.relegation;
  return CEREMONY_ART.reward;
}

function modeTitle(mode?: string) {
  if (mode === "survival") return "Survival Run";
  if (mode === "power") return "Power Arena";
  if (mode === "tournament") return "Tournament Cup";
  return "Ranked Duel";
}

function resultHeroTitle(result: ArenaResult) {
  if (result.cupChampion) return "Cup Champion";
  if (result.nextRun) return `${result.stageName} Cleared`;
  if (result.win) return "Victory Secured";
  if (result.mode === "survival") return "Survival Ended";
  if (result.mode === "tournament") return "Cup Eliminated";
  return "Run Defeated";
}

function continueLabel(result: ArenaResult) {
  if (result.nextRun) return `Continue ${result.nextRun.stageName} (${result.nextRun.difficulty.toUpperCase()})`;
  if (result.win) return `Start New ${modeTitle(result.mode)}`;
  return `Try ${modeTitle(result.mode)} Again`;
}

function ceremonyLine(result: ArenaResult) {
  if (result.badgeUnlocked) return `${result.badgeUnlocked} badge unlocked. ${result.rewardSummary}.`;
  if (result.cupChampion) return `Tournament crown secured. ${result.rewardSummary}.`;
  if (result.promotion) return `Promotion unlocked: ${result.leagueBefore} → ${result.leagueAfter}.`;
  if (result.demotion) return `Demoted to ${result.leagueAfter}. Rebuild the ladder.`;
  if (result.nextRun) return `${result.stageName} cleared. The next stage is already protected.`;
  if (result.win) return `Streak now ${result.winStreakAfter ?? 0}. Protect it in the next match.`;
  return "Streak reset. The next match starts clean.";
}

function replayRoute(mode?: string) {
  if (mode === "survival") return "/arena/survival";
  if (mode === "power") return "/arena/power";
  if (mode === "tournament") return "/arena/tournament";
  return "/arena/ranked";
}

export default function ArenaResultScreen() {
  const [result, setResult] = useState<ArenaResult | null>(null);
  const heroScale = useRef(new Animated.Value(0.96)).current;
  const heroFade = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getArenaSnapshot().then((snapshot) => alive && setResult(snapshot.lastResult));
      return () => {
        alive = false;
      };
    }, []),
  );

  const progress = useMemo(
    () => getLeagueProgress(result?.ratingAfter ?? 420),
    [result?.ratingAfter],
  );

  const progressWidth = `${Math.max(6, Math.round(progress.progress * 100))}%`;
  const promoted = result ? result.leagueAfter !== result.leagueBefore : false;
  const badge = getLeagueBadge(result?.leagueAfter ?? "Bronze");

  useEffect(() => {
    if (!result) return;

    heroScale.setValue(0.96);
    heroFade.setValue(0);
    Animated.parallel([
      Animated.timing(heroFade, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(heroScale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
    ]).start();

    if (result.cupChampion) playArenaFeedback("cupChampion");
    else if (result.badgeUnlocked) playArenaFeedback("badgeUnlock");
    else if (result.promotion) playArenaFeedback("promotion");
    else if (result.win) playArenaFeedback("victory");
    else playArenaFeedback("defeat");
  }, [heroFade, heroScale, result]);

  return (
    <ArenaLayout title="Result" subtitle="Arena Ceremony">
      {!result ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Ionicons name="trophy-outline" size={30} color={sweirkiTheme.colors.cyanDeep} />
          </View>
          <Text style={styles.emptyTitle}>No Arena result yet</Text>
          <Text style={styles.emptyText}>
            Complete an Arena run to unlock the full result ceremony.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => { playArenaFeedback("tap"); router.push("/arena" as any); }}>
            <Text style={styles.primaryText}>Go to Arena</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : (
        <>
          <Animated.View style={[styles.heroCard, result.win ? styles.winHero : styles.lossHero, { opacity: heroFade, transform: [{ scale: heroScale }] }]}>
            <View style={styles.heroCircle} />
            <View style={styles.heroTopRow}>
              <View style={styles.heroStatusPill}>
                <Ionicons name={(result.badgeUnlocked ? badge.icon : result.win ? "trophy" : "shield-outline") as any} size={15} color={result.win ? sweirkiTheme.colors.cyanDeep : sweirkiTheme.colors.gold} />
                <Text style={styles.heroStatusText}>{result.win ? "CEREMONY" : "ARENA RESET"}</Text>
              </View>
              <Text style={styles.modeLabel}>{modeTitle(result.mode).toUpperCase()}</Text>
            </View>

            <View style={styles.heroBody}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>{resultHeroTitle(result)}</Text>
                <Text style={styles.heroText}>vs {result.opponentName}</Text>
                <View style={styles.deltaPill}>
                  <Text style={styles.ratingDelta}>
                    {result.ratingDelta >= 0 ? "+" : ""}
                    {result.ratingDelta} Rating
                  </Text>
                </View>
              </View>
              <Image source={resultArt(result)} style={styles.heroArt} resizeMode="contain" />
            </View>
          </Animated.View>

          <View style={styles.ceremonyCard}>
            <View style={styles.ceremonyIcon}>
              <Ionicons name={result.promotion || result.cupChampion ? "ribbon" : result.win ? "flame" : "pulse"} size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ceremonyTitle}>{result.badgeUnlocked ? "New Badge Unlocked" : result.promotion ? "League Promotion" : result.demotion ? "League Pressure" : result.win ? "Momentum Banked" : "Reset and Respond"}</Text>
              <Text style={styles.ceremonyText}>{ceremonyLine(result)}</Text>
            </View>
          </View>


          <View style={styles.claimCard}>
            <View style={styles.claimIcon}>
              <Image source={result.arenaPointsEarned ? REWARD_ART.ap : REWARD_ART.xp} style={styles.claimArt} resizeMode="contain" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.claimTitle}>Rewards Banked</Text>
              <Text style={styles.claimText}>+{result.xpEarned} Season XP • +{result.arenaPointsEarned ?? 0} Arena Points{(result.streakBonusXp ?? 0) > 0 ? ` • streak bonus +${result.streakBonusXp} XP` : ""}</Text>
              {result.economyCapped ? <Text style={styles.capText}>Soft anti-farming cap applied for high-volume Arena play.</Text> : null}
            </View>
          </View>

          <View style={styles.ratingCard}>
            <View style={styles.ratingRow}>
              <View>
                <Text style={styles.cardLabel}>Arena rating</Text>
                <Text style={styles.ratingLine}>
                  {result.ratingBefore} → {result.ratingAfter}
                </Text>
              </View>
              <View style={[styles.outcomeBadge, result.win ? styles.outcomeWin : styles.outcomeLoss]}>
                <Text style={styles.outcomeText}>{result.win ? "WIN" : "LOSS"}</Text>
              </View>
            </View>

            <View style={styles.leagueRow}>
              <View style={styles.badgeRow}>
                <Ionicons name={badge.icon as any} size={18} color={sweirkiTheme.colors.gold} />
                <Text style={styles.leagueText}>{result.leagueAfter}</Text>
              </View>
              <Text style={styles.nextText}>
                {promoted ? `Promoted from ${result.leagueBefore}` : `Next: ${progress.nextRating} rating`}
              </Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: progressWidth as any }]} />
            </View>
          </View>

          <View style={styles.statGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatArenaTime(result.playerTimeSec)}</Text>
              <Text style={styles.statLabel}>Your time</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{formatArenaTime(result.targetTimeSec)}</Text>
              <Text style={styles.statLabel}>Target</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{result.errors}</Text>
              <Text style={styles.statLabel}>Errors</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{result.xpEarned}</Text>
              <Text style={styles.statLabel}>Season XP</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{result.arenaPointsEarned ?? 0}</Text>
              <Text style={styles.statLabel}>Arena Points</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{result.winStreakAfter ?? 0}</Text>
              <Text style={styles.statLabel}>New streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{result.powerChargesUsed ?? 0}</Text>
              <Text style={styles.statLabel}>Powers used</Text>
            </View>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>{result.win ? "Match report" : "Match report"}</Text>
            <Text style={styles.summaryText}>{result.resultReason}</Text>
            <Text style={styles.summaryText}>Rewards banked: {result.rewardSummary ?? `+${result.xpEarned} XP`}.</Text>
            {(result.streakBonusXp ?? 0) > 0 || (result.streakBonusAp ?? 0) > 0 ? (
              <Text style={styles.summaryText}>Streak bonus included: +{result.streakBonusXp ?? 0} XP and +{result.streakBonusAp ?? 0} AP.</Text>
            ) : null}
            {result.economyCapped ? (
              <Text style={styles.summaryText}>Economy guard active: rewards were reduced to protect the Arena from farming loops.</Text>
            ) : null}
            {result.badgeUnlocked ? (
              <Text style={styles.summaryText}>Badge reward: {badge.label} is now available on Arena Home and Arena Profile.</Text>
            ) : null}
            {result.nextRun ? (
              <Text style={styles.summaryText}>Next protected stage: {result.nextRun.stageName} on {result.nextRun.difficulty.toUpperCase()}. Tap continue to resume the new Arena board.</Text>
            ) : null}
            {result.cupChampion ? (
              <Text style={styles.summaryText}>Tournament Cup complete. Champion state recorded and the Cup run is closed.</Text>
            ) : null}
            {!result.nextRun && !result.cupChampion ? (
              <Text style={styles.summaryText}>This Arena session is closed. Starting again will create a fresh opponent, timer target, and saved run.</Text>
            ) : null}
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => {
              playArenaFeedback(result.nextRun ? "matchStart" : "tap");
              return result.nextRun
                ? router.push({ pathname: "/sudoku", params: { level: result.nextRun.difficulty, arena: result.nextRun.mode } } as any)
                : router.push(replayRoute(result.mode) as any);
            }}
          >
            <Text style={styles.primaryText}>{continueLabel(result)}</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={() => { playArenaFeedback("tap"); router.push("/arena" as any); }}>
            <Text style={styles.secondaryText}>Back to Arena Hub</Text>
          </Pressable>
        </>
      )}
    </ArenaLayout>
  );
}

const styles = StyleSheet.create({
  emptyCard: {
    alignItems: "center",
    borderRadius: 28,
    padding: 24,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    backgroundColor: "rgba(53,200,244,0.14)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
  },
  emptyTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 23, color: sweirkiTheme.colors.ink },
  emptyText: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 13,
    color: sweirkiTheme.colors.textSoft,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
  },
  heroCard: {
    borderRadius: 32,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    overflow: "hidden",
    ...sweirkiTheme.shadows.hero,
  },
  winHero: { backgroundColor: "rgba(255,255,255,0.96)" },
  lossHero: { backgroundColor: "rgba(255,249,242,0.96)" },
  heroCircle: {
    position: "absolute",
    right: -34,
    top: -34,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: "rgba(53,200,244,0.15)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12,
  },
  heroStatusPill: {
    height: 32,
    paddingHorizontal: 11,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
  },
  heroStatusText: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: sweirkiTheme.colors.inkDeep,
  },
  heroBody: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  heroCopy: { flex: 1, minHeight: 128, justifyContent: "center" },
  heroArt: { width: 126, height: 126 },
  modeLabel: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 10,
    letterSpacing: 2,
    color: sweirkiTheme.colors.cyanDeep,
    textAlign: "right",
    flexShrink: 1,
  },
  heroTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 28, color: sweirkiTheme.colors.inkDeep },
  heroText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, color: sweirkiTheme.colors.textSoft, marginTop: 3 },
  deltaPill: {
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245,185,67,0.18)",
    borderWidth: 1,
    borderColor: "rgba(245,185,67,0.38)",
  },
  ratingDelta: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 17, color: sweirkiTheme.colors.gold },
  ceremonyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 24,
    padding: 15,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(245,185,67,0.38)",
    ...sweirkiTheme.shadows.glassCard,
  },
  ceremonyIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sweirkiTheme.colors.gold,
  },
  ceremonyTitle: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 16,
    color: sweirkiTheme.colors.ink,
  },
  ceremonyText: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: sweirkiTheme.colors.textSoft,
    marginTop: 1,
  },

  claimCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 24,
    padding: 15,
    marginBottom: 14,
    backgroundColor: "rgba(245,185,67,0.15)",
    borderWidth: 1,
    borderColor: "rgba(245,185,67,0.38)",
  },
  claimIcon: {
    width: 50,
    height: 50,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sweirkiTheme.colors.gold,
  },
  claimArt: { width: 34, height: 34 },
  claimTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 17, color: sweirkiTheme.colors.inkDeep },
  claimText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.ink, marginTop: 2 },
  capText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 11, color: sweirkiTheme.colors.textSoft, marginTop: 2 },
  ratingCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 26,
    padding: 18,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
    ...sweirkiTheme.shadows.glassCard,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardLabel: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: sweirkiTheme.colors.cyanDeep,
  },
  ratingLine: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 27, color: sweirkiTheme.colors.inkDeep, marginTop: 2 },
  outcomeBadge: { paddingHorizontal: 12, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  outcomeWin: { backgroundColor: "rgba(53,200,244,0.16)" },
  outcomeLoss: { backgroundColor: "rgba(217,83,79,0.12)" },
  outcomeText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.inkDeep, letterSpacing: 1.3 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  leagueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  leagueText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 17, color: sweirkiTheme.colors.ink },
  nextText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, color: sweirkiTheme.colors.textSoft },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: "rgba(18,56,90,0.1)", overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: sweirkiTheme.colors.gold },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  statCard: {
    width: "48.5%",
    borderRadius: 22,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
  },
  statValue: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 22, color: sweirkiTheme.colors.ink },
  statLabel: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, color: sweirkiTheme.colors.textSoft },
  summaryCard: {
    borderRadius: 24,
    padding: 16,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
  },
  summaryTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 19, color: sweirkiTheme.colors.ink, marginBottom: 4 },
  summaryText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 18, color: sweirkiTheme.colors.textSoft },
  primaryButton: {
    height: 58,
    borderRadius: 23,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: sweirkiTheme.colors.cyanDeep,
    ...sweirkiTheme.shadows.cta,
  },
  primaryText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 17, color: "#FFFFFF" },
  secondaryButton: { height: 48, alignItems: "center", justifyContent: "center", marginTop: 6 },
  secondaryText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 15, color: sweirkiTheme.colors.cyanDeep },
});
