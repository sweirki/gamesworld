import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ImageBackground,
  ScrollView,
} from "react-native";

import { auth } from "../firebase";
import { LinearGradient } from "expo-linear-gradient";

import {
  getAnalytics,
  getProgressSummary,
  getModeProgress,
} from "../src/analytics/playerAnalytics";

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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FBE7A1" />
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          No stats yet. Play some games!
        </Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require("../assets/bg.png")}
      style={styles.bg}
      blurRadius={3}
    >
      <LinearGradient
        colors={["rgba(0,0,40,0.75)", "transparent"]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Stats</Text>
        <Text style={styles.subtitle}>
          Your performance across all games
        </Text>

        {/* OVERALL */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Overall</Text>

          <StatRow label="Games Played" value={summary.totalGames} />
          <StatRow label="Wins" value={summary.totalWins} />
          <StatRow label="Losses" value={summary.totalLosses} />
          <StatRow label="Win Rate" value={`${summary.winRate}%`} />
          <StatRow label="Total Play Time" value={summary.totalTime} />
        </View>

        {/* BY MODE */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>By Mode</Text>

          <ModeRow label="🧩 CLASSIC" data={classic} />
          <ModeRow label="📅 DAILY" data={daily} />
          <ModeRow label="⚡ HYPER" data={hyper} />
          <ModeRow label="☠️ KILLER" data={killer} />
          <ModeRow label="❌ X" data={xMode} />
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

/* ================= COMPONENTS ================= */

function StatRow({ label, value }: { label: string; value: any }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ModeRow({
  label,
  data,
}: {
  label: string;
  data: any;
}) {
  if (!data) return null;

  return (
    <View style={styles.modeRow}>
      <Text style={styles.mode}>{label}</Text>

      <View style={styles.modeStats}>
        <Text style={styles.modeStat}>
          Games: {data.gamesPlayed}
        </Text>
        <Text style={styles.modeStat}>
          Best: {data.bestTime}
        </Text>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  bg: { flex: 1 },

  container: {
    padding: 20,
    paddingTop: 40,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#061B3A",
  },

  title: {
    fontFamily: "BalooBold",
    fontSize: 24,
    color: "#FBE7A1",
    textAlign: "center",
    marginBottom: 6,
  },

  subtitle: {
    fontFamily: "BalooRegular",
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginBottom: 24,
  },

  emptyText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
  },

  card: {
    width: "100%",
    backgroundColor: "rgba(0,0,40,0.6)",
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FBE7A1",
    marginBottom: 12,
  },

  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  statLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
  },

  statValue: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  modeRow: {
    marginBottom: 14,
  },

  mode: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  modeStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  modeStat: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
});
