import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { auth } from "../firebase";
import {
  getAnalytics,
  getProgressSummary,
  getModeProgress,
} from "../src/analytics/playerAnalytics";

const backgroundAsset = require("../assets/branding/home-background.png");
const heroAsset = require("../assets/branding/multiple_modes_hero.png");
const emptyAsset = require("../assets/branding/profile/stats-icon.png");
const classicAsset = require("../assets/branding/modes/classic-mode.png");
const dailyAsset = require("../assets/branding/daily-challenge-card.png");
const hyperAsset = require("../assets/branding/modes/hyper-mode.png");
const killerAsset = require("../assets/branding/modes/killer-mode.png");
const xAsset = require("../assets/branding/modes/x-mode.png");

/* ================= HELPERS ================= */

function displayValue(value: any, fallback = "0") {
  if (value === undefined || value === null || value === "") return fallback;
  return value;
}

function displayBestTime(value: any) {
  if (value === undefined || value === null || value === "") return "--";
  return value;
}

function getGamesPlayed(mode: any) {
  return Number(mode?.gamesPlayed ?? 0);
}

/* ================= SCREEN ================= */

export default function StatsScreen() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [classic, setClassic] = useState<any>(null);
  const [daily, setDaily] = useState<any>(null);
  const [hyper, setHyper] = useState<any>(null);
  const [killer, setKiller] = useState<any>(null);
  const [xMode, setXMode] = useState<any>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const analytics = await getAnalytics();

        setSummary(getProgressSummary(analytics));
        setClassic(getModeProgress(analytics, "classic"));
        setDaily(getModeProgress(analytics, "daily"));
        setHyper(getModeProgress(analytics, "hyper"));
        setKiller(getModeProgress(analytics, "killer"));
        setXMode(getModeProgress(analytics, "x"));
      } catch (err) {
        console.log("Stats load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const mostPlayedMode = useMemo(() => {
    const modes = [
      { name: "Classic", games: getGamesPlayed(classic) },
      { name: "Daily", games: getGamesPlayed(daily) },
      { name: "Hyper", games: getGamesPlayed(hyper) },
      { name: "Killer", games: getGamesPlayed(killer) },
      { name: "X Sudoku", games: getGamesPlayed(xMode) },
    ];

    const winner = modes.sort((a, b) => b.games - a.games)[0];
    return winner?.games > 0 ? winner.name : "Start playing";
  }, [classic, daily, hyper, killer, xMode]);

  if (loading) {
    return (
      <ImageBackground source={backgroundAsset} style={styles.bg} resizeMode="cover">
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#35B8F4" />
          <Text style={styles.loadingText}>Loading your progress...</Text>
        </View>
      </ImageBackground>
    );
  }

  if (!summary) {
    return (
      <ImageBackground source={backgroundAsset} style={styles.bg} resizeMode="cover">
        <View style={styles.center}>
          <Image source={emptyAsset} style={styles.emptyIcon} resizeMode="contain" />
          <Text style={styles.emptyTitle}>No stats yet</Text>
          <Text style={styles.emptyText}>Play a few games and your progress will appear here.</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={backgroundAsset} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={["rgba(255,255,255,0.72)", "rgba(232,246,255,0.38)", "rgba(255,255,255,0.66)"]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
            <Text style={styles.title}>Statistics</Text>
            <Text style={styles.subtitle}>Track your Sudoku mastery across every mode.</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeLabel}>Most played</Text>
              <Text style={styles.heroBadgeValue}>{mostPlayedMode}</Text>
            </View>
          </View>
          <Image source={heroAsset} style={styles.heroImage} resizeMode="contain" />
        </View>

        <View style={styles.summaryGrid}>
          <MetricCard label="Games" value={displayValue(summary.totalGames)} />
          <MetricCard label="Wins" value={displayValue(summary.totalWins)} />
          <MetricCard label="Win Rate" value={`${displayValue(summary.winRate)}%`} highlight />
          <MetricCard label="Play Time" value={displayValue(summary.totalTime, "0m")} />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Overall Record</Text>
            <Text style={styles.sectionBadge}>All modes</Text>
          </View>

          <StatRow label="Games Played" value={displayValue(summary.totalGames)} />
          <StatRow label="Wins" value={displayValue(summary.totalWins)} />
          <StatRow label="Losses" value={displayValue(summary.totalLosses)} />
          <StatRow label="Win Rate" value={`${displayValue(summary.winRate)}%`} />
          <StatRow label="Total Play Time" value={displayValue(summary.totalTime, "0m")} />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mode Breakdown</Text>
            <Text style={styles.sectionBadge}>Best times</Text>
          </View>

          <ModeRow title="Classic" subtitle="Original Sudoku" asset={classicAsset} data={classic} accent="#35B8F4" />
          <ModeRow title="Daily" subtitle="Daily challenge" asset={dailyAsset} data={daily} accent="#766AF6" />
          <ModeRow title="Hyper" subtitle="Fast pressure" asset={hyperAsset} data={hyper} accent="#2FD4C6" />
          <ModeRow title="Killer" subtitle="Cage logic" asset={killerAsset} data={killer} accent="#FFB547" />
          <ModeRow title="X Sudoku" subtitle="Diagonal mastery" asset={xAsset} data={xMode} accent="#FF6F91" last />
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

/* ================= COMPONENTS ================= */

function MetricCard({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <View style={[styles.metricCard, highlight && styles.metricCardHighlight]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{displayValue(value)}</Text>
    </View>
  );
}

function ModeRow({
  title,
  subtitle,
  asset,
  data,
  accent,
  last,
}: {
  title: string;
  subtitle: string;
  asset: any;
  data: any;
  accent: string;
  last?: boolean;
}) {
  const gamesPlayed = displayValue(data?.gamesPlayed);
  const bestTime = displayBestTime(data?.bestTime);

  return (
    <View style={[styles.modeRow, last && styles.modeRowLast]}>
      <View style={[styles.modeIconWrap, { borderColor: `${accent}55` }]}>
        <Image source={asset} style={styles.modeIcon} resizeMode="contain" />
      </View>

      <View style={styles.modeCopy}>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.modeStats}>
        <Text style={styles.modeStatValue}>{gamesPlayed}</Text>
        <Text style={styles.modeStatLabel}>Games</Text>
        <Text style={styles.modeBest}>Best {bestTime}</Text>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#EAF7FF",
  },

  container: {
    paddingHorizontal: 18,
    paddingTop: 54,
    paddingBottom: 34,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 34,
  },

  loadingText: {
    marginTop: 14,
    fontFamily: "BalooRegular",
    fontSize: 15,
    color: "#5D7896",
  },

  emptyIcon: {
    width: 92,
    height: 92,
    marginBottom: 16,
  },

  emptyTitle: {
    fontFamily: "BalooBold",
    fontSize: 26,
    color: "#153D66",
    marginBottom: 6,
  },

  emptyText: {
    fontFamily: "BalooRegular",
    fontSize: 16,
    lineHeight: 22,
    color: "#66819E",
    textAlign: "center",
  },

  heroCard: {
    minHeight: 164,
    borderRadius: 32,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(170,220,255,0.9)",
    shadowColor: "#7CC8F8",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },

  heroCopy: {
    flex: 1,
    paddingRight: 10,
  },

  eyebrow: {
    fontFamily: "BalooBold",
    fontSize: 11,
    letterSpacing: 1.4,
    color: "#35A8E6",
    marginBottom: 2,
  },

  title: {
    fontFamily: "BalooBold",
    fontSize: 26,
    color: "#153D66",
    marginBottom: 4,
  },

  subtitle: {
    fontFamily: "BalooRegular",
    fontSize: 12,
    lineHeight: 16,
    color: "#63809F",
  },

  heroBadge: {
    alignSelf: "flex-start",
    marginTop: 12,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(225,246,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(111,202,245,0.35)",
  },

  heroBadgeLabel: {
    fontFamily: "BalooRegular",
    fontSize: 10,
    color: "#6F8CAA",
    marginBottom: -3,
  },

  heroBadgeValue: {
    fontFamily: "BalooBold",
    fontSize: 11,
    color: "#153D66",
  },

  heroImage: {
    width: 128,
    height: 104,
    marginRight: -18,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  metricCard: {
    width: "48.5%",
    minHeight: 86,
    borderRadius: 24,
    paddingVertical: 15,
    paddingHorizontal: 16,
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(188,225,250,0.95)",
  },

  metricCardHighlight: {
    backgroundColor: "rgba(230,248,255,0.94)",
    borderColor: "rgba(53,184,244,0.45)",
  },

  metricValue: {
    fontFamily: "BalooBold",
    fontSize: 16,
    color: "#153D66",
  },

  metricLabel: {
    marginTop: -2,
    fontFamily: "BalooRegular",
    fontSize: 13,
    color: "#6E89A5",
  },

  card: {
    width: "100%",
    borderRadius: 28,
    padding: 18,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(187,224,249,0.95)",
    shadowColor: "#A8D9FA",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  sectionTitle: {
    fontFamily: "BalooBold",
    fontSize: 17,
    color: "#153D66",
  },

  sectionBadge: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontFamily: "BalooBold",
    fontSize: 11,
    color: "#2F95CE",
    backgroundColor: "rgba(219,244,255,0.9)",
  },

  statRow: {
    minHeight: 44,
    borderRadius: 18,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(242,249,255,0.92)",
  },

  statLabel: {
    fontFamily: "BalooRegular",
    color: "#6A86A3",
    fontSize: 13,
  },

  statValue: {
    fontFamily: "BalooBold",
    color: "#153D66",
    fontSize: 14,
  },

  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(196,224,244,0.75)",
  },

  modeRowLast: {
    borderBottomWidth: 0,
  },

  modeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(243,250,255,0.95)",
    borderWidth: 1,
  },

  modeIcon: {
    width: 34,
    height: 34,
  },

  modeCopy: {
    flex: 1,
  },

  modeTitle: {
    fontFamily: "BalooBold",
    fontSize: 15,
    color: "#153D66",
  },

  modeSubtitle: {
    marginTop: -2,
    fontFamily: "BalooRegular",
    fontSize: 11,
    color: "#7A93AD",
  },

  modeStats: {
    alignItems: "flex-end",
    marginLeft: 8,
  },

  modeStatValue: {
    fontFamily: "BalooBold",
    fontSize: 15,
    color: "#153D66",
  },

  modeStatLabel: {
    marginTop: -3,
    fontFamily: "BalooRegular",
    fontSize: 11,
    color: "#83A0B9",
  },

  modeBest: {
    marginTop: 2,
    fontFamily: "BalooBold",
    fontSize: 11,
    color: "#35A8E6",
  },
});
