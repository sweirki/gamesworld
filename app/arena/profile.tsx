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

const BADGE_ART: Record<string, any> = {
  Bronze: require("../../assets/economy/badges/bronze_badge2.png"),
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

const CURRENCY_ART = {
  arenaPoints: require("../../assets/economy/currencies/arena_points_icon.png"),
  seasonXp: require("../../assets/economy/currencies/season_xp_icon.png"),
  ticket: require("../../assets/economy/currencies/ticket_icon.png"),
};

const TROPHY_ART = {
  cup: require("../../assets/arena/tournaments/cup_trophy.png"),
  champion: require("../../assets/arena/tournaments/champion_cup.png"),
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
    <ArenaLayout title="Arena Profile" subtitle="Competitor Identity">
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroEmblem}>
          <Image
            source={BADGE_ART[league] ?? BADGE_ART.Bronze}
            style={styles.heroLeagueArt}
            resizeMode="contain"
          />
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.kicker}>{season.name.replace(":", " •").toUpperCase()}</Text>
          <Text style={styles.heroTitle}>{league}</Text>
          <Text style={styles.heroSubtitle}>Arena Competitor</Text>
          <Text style={styles.heroText}>{badge.label} • {season.daysRemaining} days left</Text>
          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <Ionicons name="shield-checkmark" size={14} color={sweirkiTheme.colors.cyanDeep} />
              <Text style={styles.heroChipText}>{fmt(profile?.rating ?? 420)} rating</Text>
            </View>
            <View style={[styles.heroChip, styles.heroChipGold]}>
              <Ionicons name="sparkles" size={14} color={sweirkiTheme.colors.gold} />
              <Text style={styles.heroChipText}>{fmt(profile?.arenaPoints ?? 0)} AP</Text>
            </View>
          </View>
        </View>

        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: progressWidth as any }]} /></View>
        <View style={styles.heroMetaRow}>
          <Text style={styles.heroMeta}>{reward?.remaining ?? 0} to next tier</Text>
          <Text style={styles.heroMeta}>{reward?.seasonTrack ?? "0 XP / 0 AP"}</Text>
        </View>
      </View>

      <View style={styles.quickStats}>
        <View style={styles.statPill}><Text style={styles.statValue}>{fmt(profile?.bestStreak ?? 0)}</Text><Text style={styles.statLabel}>Streak</Text></View>
        <View style={styles.statPill}><Text style={styles.statValue}>{fmt(profile?.cupsWon ?? 0)}</Text><Text style={styles.statLabel}>Cups</Text></View>
        <View style={styles.statPill}><Text style={styles.statValue}>{winRate}%</Text><Text style={styles.statLabel}>Win rate</Text></View>
        <View style={styles.statPill}><Text style={styles.statValue}>{fmt(profile?.arenaPoints ?? 0)}</Text><Text style={styles.statLabel}>AP</Text></View>
      </View>

      <View style={styles.compactCard}>
        <View style={styles.sectionHeaderTight}>
          <View>
            <Text style={styles.cardLabel}>Equipped Look</Text>
            <Text style={styles.sectionTitle}>{league} Arena Identity</Text>
          </View>
          <Ionicons name="sparkles" size={19} color={sweirkiTheme.colors.purple} />
        </View>
        <View style={styles.loadoutRow}>
          <View style={styles.loadoutSlot}>
            <Image source={BADGE_ART[league] ?? BADGE_ART.Bronze} style={styles.loadoutArt} resizeMode="contain" />
            <Text style={styles.slotLabel}>Badge</Text>
          </View>
          <View style={styles.loadoutSlot}>
            <Image source={FRAME_ART[league] ?? FRAME_ART.Bronze} style={styles.loadoutArt} resizeMode="contain" />
            <Text style={styles.slotLabel}>Frame</Text>
          </View>
          <View style={styles.loadoutTextBox}>
            <Text style={styles.loadoutTitle}>{league} match identity</Text>
            <Text style={styles.loadoutText}>Clean public card with badge tier, rating, and season status.</Text>
          </View>
        </View>
      </View>

      <View style={styles.compactCard}>
        <View style={styles.sectionHeaderTight}>
          <View>
            <Text style={styles.cardLabel}>Collection</Text>
            <Text style={styles.sectionTitle}>Badge Cabinet</Text>
          </View>
          <Text style={styles.collectionCount}>{profile?.badgesUnlocked?.length ?? 1}/{ARENA_LEAGUES.length}</Text>
        </View>
        <View style={styles.badgeGrid}>
          {ARENA_LEAGUES.map((item) => {
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

      <View style={styles.recordsCard}>
        <View style={styles.sectionHeaderTight}>
          <View>
            <Text style={styles.cardLabel}>Trophy Cabinet</Text>
            <Text style={styles.sectionTitle}>Arena Records</Text>
          </View>
          <Image source={TROPHY_ART.cup} style={styles.headerIcon} resizeMode="contain" />
        </View>
        <View style={styles.recordGrid}>
          <View style={styles.recordTile}><Image source={TROPHY_ART.champion} style={styles.recordIcon} resizeMode="contain" /><Text style={styles.recordTitle}>Cup crowns</Text><Text style={styles.recordValue}>{fmt(profile?.cupsWon ?? 0)}</Text></View>
          <View style={styles.recordTile}><Image source={CURRENCY_ART.seasonXp} style={styles.recordIcon} resizeMode="contain" /><Text style={styles.recordTitle}>Best streak</Text><Text style={styles.recordValue}>{fmt(profile?.bestStreak ?? 0)}</Text></View>
          <View style={styles.recordTile}><Image source={CURRENCY_ART.arenaPoints} style={styles.recordIcon} resizeMode="contain" /><Text style={styles.recordTitle}>Power wins</Text><Text style={styles.recordValue}>{fmt(profile?.powerWins ?? 0)}</Text></View>
          <View style={styles.recordTile}><Image source={CURRENCY_ART.ticket} style={styles.recordIcon} resizeMode="contain" /><Text style={styles.recordTitle}>Survival</Text><Text style={styles.recordValue}>{fmt(profile?.survivalBestDepth ?? 0)}/3</Text></View>
        </View>
      </View>

      <View style={styles.goalsCard}>
        <View style={styles.sectionHeaderTight}>
          <View>
            <Text style={styles.cardLabel}>Goal Board</Text>
            <Text style={styles.sectionTitle}>{completedGoals}/{goals.length} complete</Text>
          </View>
          <Text style={styles.collectionCount}>{completedGoals}/{goals.length}</Text>
        </View>
        {goals.map((goal) => (
          <View key={goal.id} style={styles.goalLine}>
            <Ionicons name={goal.complete ? "checkmark-circle" : "ellipse-outline"} size={16} color={goal.complete ? sweirkiTheme.colors.gold : sweirkiTheme.colors.cyanDeep} />
            <Text style={styles.goalLineText}>{goal.title}</Text>
            <Text style={styles.goalProgress}>{goal.progress}/{goal.target}</Text>
          </View>
        ))}
      </View>

      <View style={styles.rewardCard}>
        <Ionicons name="gift" size={20} color={sweirkiTheme.colors.gold} />
        <View style={styles.rewardCopy}>
          <Text style={styles.rewardTitle}>Season reward preview</Text>
          <Text style={styles.rewardText}>{season.rewardPreview}</Text>
        </View>
      </View>

      <Pressable style={styles.primaryButton} onPress={() => router.push("/arena" as any)}>
        <Text style={styles.primaryText}>Back to Arena Hub</Text>
        <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
      </Pressable>
    </ArenaLayout>
  );
}

const styles = StyleSheet.create({
  heroCard: { position: "relative", minHeight: 168, borderRadius: 30, padding: 18, marginBottom: 10, overflow: "hidden", backgroundColor: "rgba(250,254,255,0.96)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.hero },
  heroGlow: { position: "absolute", right: -26, top: -24, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(53,200,244,0.12)" },
  heroEmblem: { position: "absolute", right: 20, top: 28, width: 104, height: 104, alignItems: "center", justifyContent: "center" },
  heroLeagueArt: { width: 92, height: 92 },
  heroCopy: { width: "64%" },
  kicker: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 9, letterSpacing: 2.2, color: sweirkiTheme.colors.cyanDeep, textTransform: "uppercase" },
  heroTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 27, lineHeight: 31, color: sweirkiTheme.colors.inkDeep, marginTop: 8 },
  heroSubtitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 18, lineHeight: 22, color: sweirkiTheme.colors.inkDeep },
  heroText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, lineHeight: 16, color: sweirkiTheme.colors.textSoft, marginTop: 5 },
  heroChips: { flexDirection: "row", gap: 7, marginTop: 10 },
  heroChip: { height: 30, borderRadius: 15, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(53,200,244,0.12)", borderWidth: 1, borderColor: "rgba(53,200,244,0.20)" },
  heroChipGold: { backgroundColor: "rgba(245,185,67,0.13)", borderColor: "rgba(245,185,67,0.24)" },
  heroChipText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, color: sweirkiTheme.colors.inkDeep },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: "rgba(20,56,95,0.10)", marginTop: 16, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 999, backgroundColor: sweirkiTheme.colors.gold },
  heroMetaRow: { flexDirection: "row", justifyContent: "space-between", gap: 10, marginTop: 7 },
  heroMeta: { flex: 1, fontFamily: sweirkiTheme.fonts.bold, fontSize: 10, color: sweirkiTheme.colors.textSoft },

  quickStats: { flexDirection: "row", gap: 7, marginBottom: 10 },
  statPill: { flex: 1, minHeight: 58, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan },
  statValue: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 18, color: sweirkiTheme.colors.inkDeep, lineHeight: 22 },
  statLabel: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 9, color: sweirkiTheme.colors.textSoft },

  compactCard: { borderRadius: 23, padding: 14, marginBottom: 10, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.glassCard },
  sectionHeaderTight: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  cardLabel: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 9, letterSpacing: 2, color: sweirkiTheme.colors.cyanDeep, textTransform: "uppercase" },
  sectionTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 18, color: sweirkiTheme.colors.inkDeep, marginTop: 1 },
  loadoutRow: { flexDirection: "row", alignItems: "stretch", gap: 9 },
  loadoutSlot: { width: 68, minHeight: 66, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(53,200,244,0.08)", borderWidth: 1, borderColor: "rgba(53,200,244,0.16)" },
  loadoutArt: { width: 50, height: 50 },
  slotLabel: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 9, color: sweirkiTheme.colors.textSoft, marginTop: 4 },
  loadoutTextBox: { flex: 1, borderRadius: 18, paddingHorizontal: 11, justifyContent: "center", backgroundColor: "rgba(245,185,67,0.08)", borderWidth: 1, borderColor: "rgba(245,185,67,0.14)" },
  loadoutTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 14, color: sweirkiTheme.colors.inkDeep },
  loadoutText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 11, lineHeight: 14, color: sweirkiTheme.colors.textSoft, marginTop: 2 },

  collectionCount: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.cyanDeep, backgroundColor: "rgba(53,200,244,0.12)", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, overflow: "hidden" },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  badgeTile: { width: "18.5%", minHeight: 62, alignItems: "center", justifyContent: "center", borderRadius: 16, borderWidth: 1 },
  badgeUnlocked: { backgroundColor: "rgba(255,255,255,0.86)", borderColor: "rgba(245,185,67,0.38)" },
  badgeLocked: { backgroundColor: "rgba(20,56,95,0.04)", borderColor: "rgba(20,56,95,0.08)" },
  badgeTileArt: { width: 50, height: 50, marginBottom: 3 },
  badgeTileArtLocked: { opacity: 0.24 },
  badgeName: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 8, color: sweirkiTheme.colors.inkDeep },
  lockedText: { color: "rgba(20,56,95,0.34)" },

  recordsCard: { borderRadius: 23, padding: 14, marginBottom: 10, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  headerIcon: { width: 34, height: 34 },
  recordGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  recordTile: { width: "48.5%", minHeight: 54, borderRadius: 17, paddingHorizontal: 9, flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(53,200,244,0.07)", borderWidth: 1, borderColor: "rgba(53,200,244,0.14)" },
  recordIcon: { width: 24, height: 24 },
  recordTitle: { flex: 1, fontFamily: sweirkiTheme.fonts.bold, fontSize: 11, color: sweirkiTheme.colors.inkDeep },
  recordValue: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 13, color: sweirkiTheme.colors.cyanDeep },

  goalsCard: { borderRadius: 23, padding: 14, marginBottom: 10, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  goalLine: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 },
  goalLineText: { flex: 1, fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.inkDeep },
  goalProgress: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 12, color: sweirkiTheme.colors.cyanDeep },

  rewardCard: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 21, padding: 13, marginBottom: 12, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  rewardCopy: { flex: 1 },
  rewardTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 15, color: sweirkiTheme.colors.inkDeep },
  rewardText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 11, lineHeight: 15, color: sweirkiTheme.colors.textSoft, marginTop: 1 },
  primaryButton: { height: 52, borderRadius: 23, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, backgroundColor: sweirkiTheme.colors.cyanDeep, ...sweirkiTheme.shadows.cta },
  primaryText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 15, color: "#FFFFFF" },
});
