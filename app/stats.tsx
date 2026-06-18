
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

import AppBackButton from "./components/AppBackButton";

const backgroundAsset = require("../assets/branding/home-background.png");
const heroAsset = require("../assets/branding/heroes/stats-hero.png");
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

  const winRateNumber = Number(summary?.winRate ?? 0);
  const masteryLabel = winRateNumber >= 75 ? "Elite rhythm" : winRateNumber >= 50 ? "Rising mastery" : "Building streak";

  if (loading) {
    return (
      <ImageBackground source={backgroundAsset} style={styles.bg} resizeMode="cover">
        <LinearGradient
          colors={["rgba(255,255,255,0.78)", "rgba(232,246,255,0.44)", "rgba(255,255,255,0.7)"]}
          style={StyleSheet.absoluteFillObject}
        />
        <AppBackButton />
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
        <LinearGradient
          colors={["rgba(255,255,255,0.78)", "rgba(232,246,255,0.44)", "rgba(255,255,255,0.7)"]}
          style={StyleSheet.absoluteFillObject}
        />
        <AppBackButton />
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
        colors={["rgba(255,255,255,0.74)", "rgba(232,246,255,0.38)", "rgba(255,255,255,0.68)"]}
        style={StyleSheet.absoluteFillObject}
      />
      <AppBackButton />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroGlowOne} />
          <View style={styles.heroGlowTwo} />

          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
            <Text style={styles.title}>Statistics</Text>
            <Text style={styles.subtitle}>Your progress, rhythm, and mastery across every Sudoku mode.</Text>

            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeLabel}>Most played</Text>
                <Text style={styles.heroBadgeValue}>{mostPlayedMode}</Text>
              </View>
              <View style={styles.heroBadgeGold}>
                <Text style={styles.heroBadgeLabelGold}>Form</Text>
                <Text style={styles.heroBadgeValueGold}>{masteryLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroImageWrap}>
            <Image source={heroAsset} style={styles.heroImage} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <MetricCard label="Games" value={displayValue(summary.totalGames)} />
          <MetricCard label="Wins" value={displayValue(summary.totalWins)} />
          <MetricCard label="Win Rate" value={`${displayValue(summary.winRate)}%`} highlight />
          <MetricCard label="Play Time" value={displayValue(summary.totalTime, "0m")} />
        </View>

        <View style={styles.recordCard}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Overall Record</Text>
              <Text style={styles.sectionSubtitle}>Lifetime performance</Text>
            </View>
            <Text style={styles.sectionBadge}>All modes</Text>
          </View>

          <View style={styles.recordGrid}>
            <RecordPill label="Played" value={displayValue(summary.totalGames)} />
            <RecordPill label="Wins" value={displayValue(summary.totalWins)} />
            <RecordPill label="Losses" value={displayValue(summary.totalLosses)} />
            <RecordPill label="Win Rate" value={`${displayValue(summary.winRate)}%`} accent />
          </View>

          <View style={styles.timeStrip}>
            <Text style={styles.timeStripLabel}>Total Play Time</Text>
            <Text style={styles.timeStripValue}>{displayValue(summary.totalTime, "0m")}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Mode Breakdown</Text>
              <Text style={styles.sectionSubtitle}>Games played and best times</Text>
            </View>
            <Text style={styles.sectionBadge}>Best times</Text>
          </View>

          <ModeRow title="Classic" subtitle="Pure Sudoku focus" asset={classicAsset} data={classic} accent="#35B8F4" />
          <ModeRow title="Daily" subtitle="Daily challenge" asset={dailyAsset} data={daily} accent="#766AF6" />
          <ModeRow title="Hyper" subtitle="Extra-region challenge" asset={hyperAsset} data={hyper} accent="#9B70FF" />
          <ModeRow title="Killer" subtitle="Strategic cage puzzles" asset={killerAsset} data={killer} accent="#FFB547" />
          <ModeRow title="X Sudoku" subtitle="Diagonal mastery" asset={xAsset} data={xMode} accent="#2FD4C6" last />
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

/* ================= COMPONENTS ================= */

function MetricCard({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <View style={[styles.metricCard, highlight && styles.metricCardHighlight]}>
      <View style={styles.metricShine} />
      <Text style={[styles.metricValue, highlight && styles.metricValueHighlight]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function RecordPill({ label, value, accent }: { label: string; value: any; accent?: boolean }) {
  return (
    <View style={[styles.recordPill, accent && styles.recordPillAccent]}>
      <Text style={[styles.recordValue, accent && styles.recordValueAccent]}>{value}</Text>
      <Text style={styles.recordLabel}>{label}</Text>
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
      <View style={[styles.modeIconWrap, { borderColor: `${accent}55`, shadowColor: accent }]}>
        <View style={[styles.modeAccentGlow, { backgroundColor: `${accent}18` }]} />
        <Image source={asset} style={styles.modeIcon} resizeMode="contain" />
      </View>

      <View style={styles.modeCopy}>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeSubtitle}>{subtitle}</Text>
      </View>

      <View style={styles.modeStats}>
        <Text style={styles.modeStatValue}>{gamesPlayed}</Text>
        <Text style={styles.modeStatLabel}>Games</Text>
        <Text style={[styles.modeBest, { color: accent }]}>Best {bestTime}</Text>
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
    paddingTop: 59,
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
    width: 110,
    height: 110,
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
    minHeight: 188,
    borderRadius: 34,
    padding: 20,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(161,218,255,0.95)",
    shadowColor: "#65C4F8",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 8,
  },

  heroGlowOne: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    right: -52,
    top: -46,
    backgroundColor: "rgba(64,196,255,0.16)",
  },

  heroGlowTwo: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    right: 38,
    bottom: -72,
    backgroundColor: "rgba(255,197,72,0.13)",
  },

  heroCopy: {
    flex: 1,
    paddingRight: 6,
    zIndex: 2,
  },

  eyebrow: {
    fontFamily: "BalooBold",
    fontSize: 11,
    letterSpacing: 1.45,
    color: "#35A8E6",
    marginBottom: 2,
  },

  title: {
    fontFamily: "BalooBold",
    fontSize: 28,
    color: "#153D66",
    marginBottom: 3,
  },

  subtitle: {
    maxWidth: 185,
    fontFamily: "BalooRegular",
    fontSize: 12,
    lineHeight: 16,
    color: "#63809F",
  },

  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 13,
  },

  heroBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(225,246,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(111,202,245,0.42)",
  },

  heroBadgeGold: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(255,247,225,0.94)",
    borderWidth: 1,
    borderColor: "rgba(245,184,67,0.42)",
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

  heroBadgeLabelGold: {
    fontFamily: "BalooRegular",
    fontSize: 10,
    color: "#9B7A31",
    marginBottom: -3,
  },

  heroBadgeValueGold: {
    fontFamily: "BalooBold",
    fontSize: 11,
    color: "#6E4E10",
  },

  heroImageWrap: {
    width: 142,
    height: 154,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -20,
    zIndex: 1,
  },

  heroImage: {
    width: 176,
    height: 176,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  metricCard: {
    width: "48.5%",
    minHeight: 92,
    borderRadius: 26,
    paddingVertical: 16,
    paddingHorizontal: 16,
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(188,225,250,0.95)",
    shadowColor: "#A8D9FA",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },

  metricCardHighlight: {
    backgroundColor: "rgba(229,248,255,0.96)",
    borderColor: "rgba(53,184,244,0.55)",
  },

  metricShine: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 48,
    right: -45,
    top: -44,
    backgroundColor: "rgba(53,184,244,0.1)",
  },

  metricValue: {
    fontFamily: "BalooBold",
    fontSize: 18,
    color: "#153D66",
  },

  metricValueHighlight: {
    color: "#158BD0",
  },

  metricLabel: {
    marginTop: -2,
    fontFamily: "BalooRegular",
    fontSize: 13,
    color: "#6E89A5",
  },

  recordCard: {
    width: "100%",
    borderRadius: 30,
    padding: 18,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(187,224,249,0.96)",
    shadowColor: "#A8D9FA",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  card: {
    width: "100%",
    borderRadius: 30,
    padding: 18,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(187,224,249,0.96)",
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
    fontSize: 18,
    color: "#153D66",
  },

  sectionSubtitle: {
    marginTop: -3,
    fontFamily: "BalooRegular",
    fontSize: 12,
    color: "#7A93AD",
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

  recordGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },

  recordPill: {
    width: "48.4%",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 13,
    backgroundColor: "rgba(242,249,255,0.94)",
    borderWidth: 1,
    borderColor: "rgba(207,232,250,0.86)",
  },

  recordPillAccent: {
    backgroundColor: "rgba(232,248,255,0.96)",
    borderColor: "rgba(53,184,244,0.42)",
  },

  recordValue: {
    fontFamily: "BalooBold",
    fontSize: 16,
    color: "#153D66",
  },

  recordValueAccent: {
    color: "#158BD0",
  },

  recordLabel: {
    marginTop: -2,
    fontFamily: "BalooRegular",
    fontSize: 12,
    color: "#6E89A5",
  },

  timeStrip: {
    marginTop: 10,
    minHeight: 46,
    borderRadius: 20,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,247,226,0.8)",
    borderWidth: 1,
    borderColor: "rgba(244,190,77,0.28)",
  },

  timeStripLabel: {
    fontFamily: "BalooRegular",
    fontSize: 13,
    color: "#8B743A",
  },

  timeStripValue: {
    fontFamily: "BalooBold",
    fontSize: 15,
    color: "#6E4E10",
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
    width: 54,
    height: 54,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
    backgroundColor: "rgba(243,250,255,0.96)",
    borderWidth: 1,
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  modeAccentGlow: {
    position: "absolute",
    width: 58,
    height: 58,
    borderRadius: 29,
    right: -24,
    top: -24,
  },

  modeIcon: {
    width: 44,
    height: 44,
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
  },
});
