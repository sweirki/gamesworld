import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { auth } from "../firebase";
import React from "react";
import {
  getAnalytics,
  getProgressSummary,
  getModeProgress,
  GameMode,
} from "../src/analytics/playerAnalytics";

/**
 * ============================
 * Phase 8D — Progress Screen
 * Fixed loading-safe version
 * ============================
 */

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

        const summaryData = getProgressSummary(analytics);
        const modesData = {
          classic: getModeProgress(analytics, "classic"),
          daily: getModeProgress(analytics, "daily"),
          hyper: getModeProgress(analytics, "hyper"),
          killer: getModeProgress(analytics, "killer"),
          x: getModeProgress(analytics, "x"),
        };

        setSummary(summaryData);
        setModes(modesData);
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

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>Loading…</Text>
      </View>
    );
  }

  if (!summary || !modes) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Your Progress</Text>
        <Text style={styles.subtitle}>
          {errorText ?? "No progress data found yet."}
        </Text>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your Progress</Text>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Card title="Overview">
          <Row label="Total Games" value={summary.totalGames} />
          <Row label="Win Rate" value={`${summary.winRate}%`} />
          <Row label="Total Play Time" value={summary.totalTime} />
          <Row label="Current Streak" value={summary.currentStreak} />
          <Row label="Best Streak" value={summary.bestStreak} />
        </Card>

        <Card title="Sessions">
          <Row label="Total Sessions" value={summary.totalSessions} />
          <Row label="Avg Session Time" value={summary.avgSessionTime} />
        </Card>

        {Object.entries(modes as any).map(([mode, data]: any) => (
          <Card key={mode} title={mode.toUpperCase()}>
            <Row label="Games Played" value={data.gamesPlayed} />
            <Row label="Win Rate" value={`${data.winRate}%`} />
            <Row label="Best Time" value={data.bestTime} />
            <Row label="Avg Time" value={data.avgTime} />
            <Row label="Avg Errors" value={data.avgErrors} />
            <Row label="Avg Hints Used" value={data.avgHintsUsed} />
          </Card>
        ))}

        <Text style={styles.footer}>
          Progress is stored locally on this device.
        </Text>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Card({ title, children }: { title: string; children: any; key?: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0B",
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FBE7A1",
    textAlign: "center",
    marginBottom: 18,
  },

  subtitle: {
    color: "#AAAAAA",
    textAlign: "center",
    marginBottom: 20,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  cardTitle: {
    color: "#FBE7A1",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  rowLabel: {
    color: "#AAAAAA",
    fontSize: 13,
  },

  rowValue: {
    color: "#FBE7A1",
    fontSize: 14,
    fontWeight: "700",
  },

  footer: {
    textAlign: "center",
    color: "#777777",
    fontSize: 12,
    marginTop: 20,
  },

  backBtn: {
    alignSelf: "center",
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(216,178,74,0.35)",
  },

  backText: {
    color: "#FBE7A1",
    fontSize: 15,
    fontWeight: "700",
  },
});