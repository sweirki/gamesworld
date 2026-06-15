import { useCallback, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ArenaLayout from "./ArenaLayout";
import { sweirkiTheme } from "../theme/sweirkiTheme";
import {
  ARENA_LEAGUES,
  ArenaSnapshot,
  getArenaGoals,
  getArenaRewardPreview,
  getArenaSeason,
  getArenaSnapshot,
  getLeagueBadge,
  getLeagueProgress,
} from "../../src/arena/arenaEngine";


const LEAGUE_ART: Record<string, any> = {
  Bronze: require("../../assets/arena/leagues/bronze_league.png"),
  Silver: require("../../assets/arena/leagues/silver_league.png"),
  Gold: require("../../assets/arena/leagues/gold_league.png"),
  Elite: require("../../assets/arena/leagues/elite_league.png"),
  Master: require("../../assets/arena/leagues/master_league.png"),
};

const BADGE_ART: Record<string, any> = {
  Bronze: require("../../assets/economy/badges/bronze_badge.png"),
  Silver: require("../../assets/economy/badges/silver_badge.png"),
  Gold: require("../../assets/economy/badges/gold_badge.png"),
  Elite: require("../../assets/economy/badges/elite_badge.png"),
  Master: require("../../assets/economy/badges/master_badge.png"),
};

const FRAME_ART: Record<string, any> = {
  Bronze: require("../../assets/economy/frames/bronze_frame.png"),
  Silver: require("../../assets/economy/frames/silver_frame.png"),
  Gold: require("../../assets/economy/frames/gold_frame.png"),
  Elite: require("../../assets/economy/frames/elite_frame.png"),
  Master: require("../../assets/economy/frames/master_frame.png"),
};

const TITLE_ART = {
  champion: require("../../assets/economy/titles/title_arena_champion.png"),
  cupWinner: require("../../assets/economy/titles/title_cup_winner.png"),
  gridMaster: require("../../assets/economy/titles/title_grid_master.png"),
  logicHunter: require("../../assets/economy/titles/title_logic_hunter.png"),
  legend: require("../../assets/economy/titles/title_sweirki_legend.png"),
};

function fmt(value?: number) {
  return Number.isFinite(value) ? String(Math.round(value ?? 0)) : "0";
}

export default function ArenaProfileScreen() {
  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getArenaSnapshot().then((next) => alive && setSnapshot(next));
      return () => {
        alive = false;
      };
    }, []),
  );

  const profile = snapshot?.profile;
  const season = getArenaSeason();
  const league = profile?.league ?? "Bronze";
  const badge = getLeagueBadge(league);
  const leagueArt = LEAGUE_ART[league] ?? LEAGUE_ART.Bronze;
  const frameArt = FRAME_ART[league] ?? FRAME_ART.Bronze;
  const progress = getLeagueProgress(profile?.rating ?? 420);
  const reward = profile ? getArenaRewardPreview(profile) : null;
  const goals = getArenaGoals(snapshot);
  const completedGoals = goals.filter((goal) => goal.complete).length;
  const progressWidth = `${Math.max(6, Math.round(progress.progress * 100))}%`;

  const winRate = useMemo(() => {
    const wins = profile?.wins ?? 0;
    const losses = profile?.losses ?? 0;
    const total = wins + losses;
    return total ? Math.round((wins / total) * 100) : 0;
  }, [profile?.losses, profile?.wins]);

  return (
    <ArenaLayout title="Arena Profile" subtitle="Season Snapshot">
      <View style={styles.heroCard}>
        <Image source={leagueArt} style={styles.heroWatermark} resizeMode="contain" />
        <View style={styles.badgeIcon}>
          <Image source={frameArt} style={styles.heroFrameArt} resizeMode="contain" />
          <Image source={BADGE_ART[league] ?? BADGE_ART.Bronze} style={styles.badgeArt} resizeMode="contain" />
        </View>
        <Text style={styles.kicker}>{season.name.toUpperCase()}</Text>
        <Text style={styles.heroTitle}>{league} Competitor</Text>
        <Text style={styles.heroText}>{badge.label} • {season.daysRemaining} days left • {season.theme}</Text>
      </View>

      <View style={styles.ratingCard}>
        <View style={styles.ratingTop}>
          <View>
            <Text style={styles.cardLabel}>Rating path</Text>
            <Text style={styles.ratingText}>{fmt(profile?.rating ?? 420)} rating</Text>
          </View>
          <View style={styles.pointsPill}>
            <Ionicons name="diamond" size={15} color="#FFFFFF" />
            <Text style={styles.pointsText}>{fmt(profile?.arenaPoints ?? 0)} AP</Text>
          </View>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: progressWidth as any }]} />
        </View>
        <Text style={styles.helperText}>{reward?.remaining ?? 0} rating to next badge tier • {reward?.seasonTrack ?? "0 XP / 0 AP"}</Text>
      </View>

      <View style={styles.identityCard}>
        <Text style={styles.sectionTitle}>Equipped Arena Look</Text>
        <View style={styles.identityRow}>
          <View style={styles.identityPreview}>
            <Image source={frameArt} style={styles.identityFrame} resizeMode="contain" />
            <Image source={BADGE_ART[league] ?? BADGE_ART.Bronze} style={styles.identityBadge} resizeMode="contain" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.identityTitle}>{league} Frame + Badge</Text>
            <Text style={styles.identityText}>Your public Arena identity should feel collectible, not like a settings page.</Text>
          </View>
        </View>
        <View style={styles.titleStrip}>
          <Image source={TITLE_ART.logicHunter} style={styles.titleArt} resizeMode="contain" />
          <Image source={TITLE_ART.gridMaster} style={styles.titleArt} resizeMode="contain" />
          <Image source={TITLE_ART.champion} style={styles.titleArt} resizeMode="contain" />
        </View>
      </View>

      <View style={styles.statGrid}>
        <View style={styles.statCard}><Text style={styles.statValue}>{fmt(profile?.bestStreak ?? 0)}</Text><Text style={styles.statLabel}>Best streak</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{fmt(profile?.cupsWon ?? 0)}</Text><Text style={styles.statLabel}>Cups won</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{profile?.highestLeague ?? "Bronze"}</Text><Text style={styles.statLabel}>Highest badge</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{fmt(profile?.powerWins ?? 0)}</Text><Text style={styles.statLabel}>Power wins</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{fmt(profile?.survivalBestDepth ?? 0)}/3</Text><Text style={styles.statLabel}>Survival record</Text></View>
        <View style={styles.statCard}><Text style={styles.statValue}>{winRate}%</Text><Text style={styles.statLabel}>Win rate</Text></View>
      </View>

      <View style={styles.badgeCard}>
        <Text style={styles.sectionTitle}>Badge Collection</Text>
        <View style={styles.badgeGrid}>
          {ARENA_LEAGUES.map((item) => {
            const itemBadge = getLeagueBadge(item);
            const unlocked = profile?.badgesUnlocked?.includes(item) ?? item === "Bronze";
            return (
              <View key={item} style={[styles.badgeTile, unlocked ? styles.badgeUnlocked : styles.badgeLocked]}>
                <Image source={BADGE_ART[item] ?? BADGE_ART.Bronze} style={[styles.badgeTileArt, !unlocked && styles.badgeTileArtLocked]} resizeMode="contain" />
                <Text style={[styles.badgeName, !unlocked && styles.lockedText]}>{item}</Text>
              </View>
            );
          })}
        </View>
      </View>


      <View style={styles.trophyCard}>
        <Text style={styles.sectionTitle}>Trophy Cabinet</Text>
        <View style={styles.trophyGrid}>
          <View style={styles.trophyTile}><Ionicons name="trophy" size={21} color={sweirkiTheme.colors.gold} /><Text style={styles.trophyValue}>{fmt(profile?.cupsWon ?? 0)}</Text><Text style={styles.trophyLabel}>Cup crowns</Text></View>
          <View style={styles.trophyTile}><Ionicons name="flame" size={21} color={sweirkiTheme.colors.gold} /><Text style={styles.trophyValue}>{fmt(profile?.bestStreak ?? 0)}</Text><Text style={styles.trophyLabel}>Best streak</Text></View>
          <View style={styles.trophyTile}><Ionicons name="sparkles" size={21} color={sweirkiTheme.colors.gold} /><Text style={styles.trophyValue}>{fmt(profile?.powerWins ?? 0)}</Text><Text style={styles.trophyLabel}>Power wins</Text></View>
        </View>
      </View>

      <View style={styles.goalsCard}>
        <View style={styles.goalsTop}>
          <View>
            <Text style={styles.cardLabel}>Goal board</Text>
            <Text style={styles.goalsTitle}>{completedGoals}/{goals.length} complete</Text>
          </View>
          <Ionicons name="checkbox" size={26} color={sweirkiTheme.colors.cyanDeep} />
        </View>
        {goals.map((goal) => (
          <View key={goal.id} style={styles.goalLine}>
            <Ionicons name={goal.complete ? "checkmark-circle" : "ellipse-outline"} size={17} color={goal.complete ? sweirkiTheme.colors.gold : sweirkiTheme.colors.textSoft} />
            <Text style={styles.goalLineText}>{goal.period.toUpperCase()} • {goal.title} • {goal.progress}/{goal.target}</Text>
          </View>
        ))}
      </View>

      <View style={styles.rewardCard}>
        <View style={styles.rewardIcon}><Ionicons name="gift" size={20} color="#FFFFFF" /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rewardTitle}>Season reward preview</Text>
          <Text style={styles.rewardText}>{season.rewardPreview}. Keep banking XP, Arena Points, and badge unlocks before the season closes.</Text>
        </View>
      </View>

      <Pressable style={styles.primaryButton} onPress={() => router.push("/arena" as any)}>
        <Text style={styles.primaryText}>Back to Arena Hub</Text>
      </Pressable>
    </ArenaLayout>
  );
}

const styles = StyleSheet.create({
  heroCard: { position: "relative", overflow: "hidden", alignItems: "center", borderRadius: 32, padding: 24, marginBottom: 14, backgroundColor: "rgba(12,48,92,0.94)", borderWidth: 1, borderColor: "rgba(255,255,255,0.34)", ...sweirkiTheme.shadows.hero },
  heroWatermark: { position: "absolute", right: -24, top: -20, width: 150, height: 150, opacity: 0.14 },
  badgeArt: { width: 54, height: 54 },
  badgeTileArt: { width: 28, height: 28, marginBottom: 5 },
  badgeTileArtLocked: { opacity: 0.28 },
  badgeIcon: { width: 86, height: 86, borderRadius: 32, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245,185,67,0.20)", borderWidth: 1, borderColor: "rgba(245,185,67,0.44)", marginBottom: 12 },
  heroFrameArt: { position: "absolute", width: 86, height: 86, opacity: 0.84 },
  kicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, letterSpacing: 1.9, color: "rgba(255,255,255,0.68)", textTransform: "uppercase" },
  heroTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 28, color: "#FFFFFF", marginTop: 3 },
  heroText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.76)", textAlign: "center", marginTop: 4 },
  ratingCard: { borderRadius: 26, padding: 17, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.glassCard },
  ratingTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLabel: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, letterSpacing: 1.5, color: sweirkiTheme.colors.cyanDeep, textTransform: "uppercase" },
  ratingText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 25, color: sweirkiTheme.colors.inkDeep, marginTop: 2 },
  pointsPill: { flexDirection: "row", alignItems: "center", gap: 6, height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: sweirkiTheme.colors.purple },
  pointsText: { fontFamily: sweirkiTheme.fonts.bold, color: "#FFFFFF", fontSize: 14 },
  progressTrack: { height: 10, borderRadius: 999, backgroundColor: "rgba(20,56,95,0.10)", marginTop: 14, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: sweirkiTheme.colors.gold },
  helperText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, color: sweirkiTheme.colors.textSoft, marginTop: 8 },

  identityCard: { borderRadius: 26, padding: 16, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.glassCard },
  identityRow: { flexDirection: "row", alignItems: "center", gap: 13 },
  identityPreview: { width: 72, height: 72, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(12,48,92,0.92)", borderWidth: 1, borderColor: "rgba(245,185,67,0.28)" },
  identityFrame: { position: "absolute", width: 72, height: 72, opacity: 0.82 },
  identityBadge: { width: 42, height: 42 },
  identityTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 17, color: sweirkiTheme.colors.inkDeep },
  identityText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, lineHeight: 16, color: sweirkiTheme.colors.textSoft, marginTop: 2 },
  titleStrip: { flexDirection: "row", gap: 8, marginTop: 13 },
  titleArt: { flex: 1, height: 42, borderRadius: 14 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  statCard: { width: "31%", minHeight: 86, borderRadius: 21, padding: 12, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan, justifyContent: "center" },
  statValue: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 20, color: sweirkiTheme.colors.inkDeep },
  statLabel: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 11, color: sweirkiTheme.colors.textSoft, marginTop: 2 },
  badgeCard: { borderRadius: 26, padding: 16, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan },
  sectionTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 18, color: sweirkiTheme.colors.inkDeep, marginBottom: 10 },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badgeTile: { minWidth: "30%", flex: 1, alignItems: "center", gap: 6, borderRadius: 18, paddingVertical: 12, borderWidth: 1 },
  badgeUnlocked: { backgroundColor: "rgba(245,185,67,0.15)", borderColor: "rgba(245,185,67,0.34)" },
  badgeLocked: { backgroundColor: "rgba(20,56,95,0.05)", borderColor: "rgba(20,56,95,0.08)" },
  badgeName: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.inkDeep },
  lockedText: { color: "rgba(20,56,95,0.34)" },

  trophyCard: { borderRadius: 26, padding: 16, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan },
  trophyGrid: { flexDirection: "row", gap: 10 },
  trophyTile: { flex: 1, alignItems: "center", borderRadius: 18, padding: 12, backgroundColor: "rgba(245,185,67,0.12)", borderWidth: 1, borderColor: "rgba(245,185,67,0.26)" },
  trophyValue: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 20, color: sweirkiTheme.colors.inkDeep, marginTop: 4 },
  trophyLabel: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 10, color: sweirkiTheme.colors.textSoft, textAlign: "center" },
  goalsCard: { borderRadius: 26, padding: 16, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  goalsTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  goalsTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 18, color: sweirkiTheme.colors.inkDeep, marginTop: 2 },
  goalLine: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  goalLineText: { flex: 1, fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, color: sweirkiTheme.colors.textSoft },
  rewardCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 23, padding: 14, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  rewardIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep },
  rewardTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 16, color: sweirkiTheme.colors.inkDeep },
  rewardText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, lineHeight: 17, color: sweirkiTheme.colors.textSoft, marginTop: 2 },
  primaryButton: { height: 54, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep, ...sweirkiTheme.shadows.cta },
  primaryText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 16, color: "#FFFFFF" },
});
