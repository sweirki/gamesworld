import React, { useEffect, useMemo, useState } from "react";
import {
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { auth } from "../firebase";
import {
  GameMode,
  getAnalytics,
  getModeProgress,
  getProgressSummary,
} from "../src/analytics/playerAnalytics";
import {
  sweirkiColors,
  sweirkiFonts,
  sweirkiRadius,
  sweirkiShadows,
  sweirkiSpacing,
  sweirkiTheme,
} from "./theme/sweirkiTheme";

type SummaryType = {
  totalGames: number;
  winRate: number | string;
  totalTime: string;
  currentStreak: number;
  bestStreak: number;
  totalSessions: number;
  avgSessionTime: string;
};

type ModeProgressType = {
  gamesPlayed: number;
  winRate: number | string;
  bestTime: string;
  avgTime: string;
  avgErrors: number | string;
  avgHintsUsed: number | string;
};

type ModeItem = {
  key: GameMode;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  target: number;
};

const MODE_ITEMS: ModeItem[] = [
  { key: "classic", title: "Classic", subtitle: "Original Sudoku", icon: "grid-outline", tint: "#35C8F4", target: 50 },
  { key: "daily", title: "Daily", subtitle: "Daily challenge", icon: "calendar-clear-outline", tint: "#766AF6", target: 20 },
  { key: "killer", title: "Killer", subtitle: "Cage logic", icon: "extension-puzzle-outline", tint: "#F5B943", target: 25 },
  { key: "hyper", title: "Hyper", subtitle: "Fast pressure", icon: "flash-outline", tint: "#6BE5C9", target: 15 },
  { key: "x", title: "X Sudoku", subtitle: "Diagonal mastery", icon: "git-compare-outline", tint: "#FF9FC5", target: 15 },
];

function toNumber(value: number | string): number {
  if (typeof value === "number") return value;
  const parsed = Number(String(value).replace("%", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function buildLevel(summary: SummaryType) {
  const totalGames = Number(summary.totalGames) || 0;
  const currentStreak = Number(summary.currentStreak) || 0;
  const bestStreak = Number(summary.bestStreak) || 0;
  const winRate = toNumber(summary.winRate);

  const xp = totalGames * 75 + currentStreak * 120 + bestStreak * 60 + Math.round(winRate * 4);
  const level = Math.max(1, Math.floor(xp / 500) + 1);
  const progress = clamp(Math.round(((xp % 500) / 500) * 100));
  const nextXp = 500 - (xp % 500 || 500);

  return { xp, level, progress, nextXp: nextXp === 500 ? 0 : nextXp };
}

function titleForLevel(level: number) {
  if (level >= 20) return "Sudoku Legend";
  if (level >= 12) return "Sudoku Master";
  if (level >= 7) return "Puzzle Specialist";
  if (level >= 3) return "Rising Solver";
  return "New Challenger";
}

export default function ProgressScreen() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryType | null>(null);
  const [modes, setModes] = useState<Record<GameMode, ModeProgressType> | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadProgress = async () => {
      try {
        const uid = auth.currentUser?.uid;

        if (!uid) {
          if (mounted) {
            setErrorText("Could not load your progress right now.");
          }
          return;
        }

        const analytics = await getAnalytics();

        if (!mounted) return;

        setSummary(getProgressSummary(analytics));
        setModes({
          classic: getModeProgress(analytics, "classic"),
          daily: getModeProgress(analytics, "daily"),
          hyper: getModeProgress(analytics, "hyper"),
          killer: getModeProgress(analytics, "killer"),
          x: getModeProgress(analytics, "x"),
        });
      } catch (error) {
        console.log("Progress screen load failed:", error);

        if (mounted) {
          setErrorText("Something went wrong while loading progress.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadProgress();

    return () => {
      mounted = false;
    };
  }, []);

  const levelData = useMemo(() => (summary ? buildLevel(summary) : null), [summary]);

  if (loading) {
    return <StateScreen title="Progress" message="Loading your journey..." onBack={() => router.back()} />;
  }

  if (!summary || !modes || !levelData) {
    return (
      <StateScreen
        title="Progress"
        message={errorText ?? "No progress data found yet."}
        onBack={() => router.back()}
      />
    );
  }

  const totalGames = Number(summary.totalGames) || 0;
  const bestMode = MODE_ITEMS.reduce((best, item) => {
    const currentGames = modes[item.key]?.gamesPlayed ?? 0;
    const bestGames = modes[best.key]?.gamesPlayed ?? 0;
    return currentGames > bestGames ? item : best;
  }, MODE_ITEMS[0]);
  const bestModeData = modes[bestMode.key];
  const milestoneTarget = Math.max(bestMode.target, 50);
  const milestoneProgress = clamp(Math.round(((bestModeData?.gamesPlayed ?? 0) / milestoneTarget) * 100));

  return (
    <ImageBackground source={sweirkiTheme.assets.homeBackground} style={styles.background} resizeMode="cover">
      <View style={styles.overlay} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={sweirkiColors.inkStrong} />
          </Pressable>
          <Text style={styles.screenEyebrow}>PLAYER JOURNEY</Text>
        </View>

        <LinearGradient colors={sweirkiColors.heroGradient} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{levelData.level}</Text>
              <Text style={styles.levelLabel}>LEVEL</Text>
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Progress</Text>
              <Text style={styles.heroSubtitle}>{titleForLevel(levelData.level)}</Text>
              <Text style={styles.heroMeta}>{levelData.xp.toLocaleString()} XP earned</Text>
            </View>
          </View>

          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>{levelData.progress}% to next level</Text>
            <Text style={styles.progressSoft}>{levelData.nextXp} XP left</Text>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[sweirkiColors.cyan, sweirkiColors.aqua]}
              style={[styles.progressFill, { width: `${Math.max(levelData.progress, 6)}%` }]}
            />
          </View>
        </LinearGradient>

        <View style={styles.snapshotCard}>
          <Snapshot icon="game-controller-outline" value={totalGames} label="Games" />
          <Divider />
          <Snapshot icon="flame-outline" value={summary.currentStreak} label="Streak" />
          <Divider />
          <Snapshot icon="star-outline" value={summary.bestStreak} label="Best" />
          <Divider />
          <Snapshot icon="trophy-outline" value={`${summary.winRate}%`} label="Win Rate" />
        </View>

        <SectionCard title="Mode Mastery" badge="live">
          {MODE_ITEMS.map((item) => {
            const data = modes[item.key];
            const games = data?.gamesPlayed ?? 0;
            const percent = clamp(Math.round((games / item.target) * 100));

            return (
              <ModeMasteryRow
                key={item.key}
                item={item}
                games={games}
                percent={percent}
              />
            );
          })}
        </SectionCard>

        <SectionCard title="Next Milestone" badge={`${milestoneProgress}%`} compact>
          <View style={styles.milestoneRow}>
            <View style={styles.milestoneIcon}>
              <Ionicons name="flag-outline" size={22} color={sweirkiColors.cyanDeep} />
            </View>
            <View style={styles.milestoneBody}>
              <Text style={styles.milestoneTitle}>Complete {milestoneTarget} {bestMode.title} games</Text>
              <Text style={styles.milestoneSubtitle}>{bestModeData?.gamesPlayed ?? 0} / {milestoneTarget} completed</Text>
              <View style={styles.smallTrack}>
                <View style={[styles.smallFill, { width: `${Math.max(milestoneProgress, 5)}%` }]} />
              </View>
            </View>
          </View>
        </SectionCard>

        <View style={styles.bottomGrid}>
          <MiniCard label="Play Time" value={summary.totalTime} icon="time-outline" />
          <MiniCard label="Sessions" value={summary.totalSessions} icon="sparkles-outline" />
          <MiniCard label="Avg Session" value={summary.avgSessionTime} icon="pulse-outline" />
          <MiniCard label="Main Mode" value={bestMode.title} icon="diamond-outline" />
        </View>

        <Text style={styles.footer}>Progress is built from your local Sweirki Sudoku play history.</Text>
      </ScrollView>
    </ImageBackground>
  );
}

function StateScreen({ title, message, onBack }: { title: string; message: string; onBack: () => void }) {
  return (
    <ImageBackground source={sweirkiTheme.assets.homeBackground} style={styles.background} resizeMode="cover">
      <View style={styles.stateWrap}>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.stateMessage}>{message}</Text>
        <Pressable style={styles.stateButton} onPress={onBack}>
          <Text style={styles.stateButtonText}>Back</Text>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

function Divider() {
  return <View style={styles.snapshotDivider} />;
}

function Snapshot({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string | number; label: string }) {
  return (
    <View style={styles.snapshotItem}>
      <Ionicons name={icon} size={18} color={sweirkiColors.cyanDeep} />
      <Text style={styles.snapshotValue}>{value}</Text>
      <Text style={styles.snapshotLabel}>{label}</Text>
    </View>
  );
}

function SectionCard({ title, badge, compact, children }: { title: string; badge?: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.sectionCard, compact && styles.sectionCardCompact]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {badge ? <Text style={styles.sectionBadge}>{badge}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function ModeMasteryRow({ item, games, percent }: { item: ModeItem; games: number; percent: number }) {
  return (
    <View style={styles.modeRow}>
      <View style={[styles.modeIcon, { borderColor: `${item.tint}45`, backgroundColor: `${item.tint}18` }]}>
        <Ionicons name={item.icon} size={21} color={item.tint} />
      </View>

      <View style={styles.modeBody}>
        <View style={styles.modeTitleRow}>
          <View>
            <Text style={styles.modeTitle}>{item.title}</Text>
            <Text style={styles.modeSubtitle}>{item.subtitle}</Text>
          </View>
          <View style={styles.modeNumbers}>
            <Text style={styles.modePercent}>{percent}%</Text>
            <Text style={styles.modeCount}>{games}/{item.target}</Text>
          </View>
        </View>
        <View style={styles.modeTrack}>
          <View style={[styles.modeFill, { width: `${Math.max(percent, 4)}%`, backgroundColor: item.tint }]} />
        </View>
      </View>
    </View>
  );
}

function MiniCard({ label, value, icon }: { label: string; value: string | number; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.miniCard}>
      <Ionicons name={icon} size={18} color={sweirkiColors.cyanDeep} />
      <Text style={styles.miniValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: sweirkiColors.screen,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(246,251,255,0.18)",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 34,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyan,
  },
  screenEyebrow: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 13,
    letterSpacing: 3,
    color: sweirkiColors.cyanDeep,
  },
  heroCard: {
    borderRadius: sweirkiRadius.hero,
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyanStrong,
    padding: 20,
    marginBottom: 14,
    ...sweirkiShadows.hero,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  levelBadge: {
    width: 88,
    height: 88,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(53,200,244,0.13)",
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyanStrong,
    marginRight: 16,
  },
  levelNumber: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 26,
    color: sweirkiColors.inkStrong,
    lineHeight: 38,
  },
  levelLabel: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 10,
    letterSpacing: 1.8,
    color: sweirkiColors.cyanDeep,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 27,
    lineHeight: 42,
    color: sweirkiColors.inkDeep,
  },
  heroSubtitle: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 18,
    color: sweirkiColors.purple,
    marginTop: 2,
  },
  heroMeta: {
    fontFamily: sweirkiFonts.regular,
    fontSize: 15,
    color: sweirkiColors.textSoft,
    marginTop: 2,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  progressText: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 14,
    color: sweirkiColors.inkStrong,
  },
  progressSoft: {
    fontFamily: sweirkiFonts.regular,
    fontSize: 13,
    color: sweirkiColors.textSoft,
  },
  progressTrack: {
    height: 13,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: sweirkiColors.progressTrack,
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  snapshotCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: sweirkiColors.glassStrong,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyan,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 14,
    ...sweirkiShadows.glassCard,
  },
  snapshotItem: {
    flex: 1,
    alignItems: "center",
    minHeight: 68,
    justifyContent: "center",
  },
  snapshotDivider: {
    width: 1,
    height: 52,
    backgroundColor: "rgba(91,202,245,0.18)",
  },
  snapshotValue: {
    fontFamily: sweirkiFonts.bold,
    color: sweirkiColors.inkDeep,
    fontSize: 20,
    marginTop: 3,
  },
  snapshotLabel: {
    fontFamily: sweirkiFonts.regular,
    color: sweirkiColors.textSoft,
    fontSize: 12,
    marginTop: -2,
  },
  sectionCard: {
    backgroundColor: sweirkiColors.glassStrong,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyan,
    padding: 18,
    marginBottom: 14,
    ...sweirkiShadows.glassCard,
  },
  sectionCardCompact: {
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 20,
    color: sweirkiColors.inkStrong,
  },
  sectionBadge: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 12,
    color: sweirkiColors.cyanDeep,
    backgroundColor: "rgba(53,200,244,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(91,202,245,0.15)",
  },
  modeIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  modeBody: {
    flex: 1,
  },
  modeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  modeTitle: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 16,
    color: sweirkiColors.inkStrong,
  },
  modeSubtitle: {
    fontFamily: sweirkiFonts.regular,
    fontSize: 12,
    color: sweirkiColors.textSoft,
    marginTop: -2,
  },
  modeNumbers: {
    alignItems: "flex-end",
  },
  modePercent: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 16,
    color: sweirkiColors.inkStrong,
  },
  modeCount: {
    fontFamily: sweirkiFonts.regular,
    fontSize: 12,
    color: sweirkiColors.textSoft,
    marginTop: -2,
  },
  modeTrack: {
    height: 8,
    backgroundColor: "rgba(125,147,168,0.16)",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8,
  },
  modeFill: {
    height: "100%",
    borderRadius: 999,
  },
  milestoneRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  milestoneIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(53,200,244,0.12)",
  },
  milestoneBody: {
    flex: 1,
  },
  milestoneTitle: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 16,
    color: sweirkiColors.inkStrong,
  },
  milestoneSubtitle: {
    fontFamily: sweirkiFonts.regular,
    color: sweirkiColors.textSoft,
    fontSize: 12,
    marginTop: -1,
  },
  smallTrack: {
    height: 8,
    backgroundColor: "rgba(125,147,168,0.16)",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8,
  },
  smallFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: sweirkiColors.cyan,
  },
  bottomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
    marginBottom: 10,
  },
  miniCard: {
    width: "48%",
    minHeight: 92,
    backgroundColor: sweirkiColors.glassStrong,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyan,
    padding: 14,
    justifyContent: "center",
  },
  miniValue: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 18,
    color: sweirkiColors.inkStrong,
    marginTop: 4,
  },
  miniLabel: {
    fontFamily: sweirkiFonts.regular,
    fontSize: 12,
    color: sweirkiColors.textSoft,
    marginTop: -2,
  },
  footer: {
    fontFamily: sweirkiFonts.regular,
    color: sweirkiColors.textSoft,
    textAlign: "center",
    fontSize: 12,
    marginTop: 4,
  },
  stateWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  stateMessage: {
    fontFamily: sweirkiFonts.regular,
    color: sweirkiColors.textSoft,
    textAlign: "center",
    fontSize: 16,
    marginTop: 8,
    marginBottom: 18,
  },
  stateButton: {
    borderRadius: 999,
    backgroundColor: sweirkiColors.glassStrong,
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyan,
    paddingHorizontal: 26,
    paddingVertical: 11,
  },
  stateButtonText: {
    fontFamily: sweirkiFonts.bold,
    color: sweirkiColors.inkStrong,
    fontSize: 16,
  },
});
