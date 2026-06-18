import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppBackButton from "./components/AppBackButton";
import { theme, getColors } from "../theme";
import { getCachedLadderData } from "./lib/ladderBridge";

export default function LegendScreen() {
  const colors = getColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const loadStats = async () => {
      const data = await getCachedLadderData();
      if (data) setStats(data);
    };
    loadStats();
  }, []);

  return (
    <ImageBackground
      source={require("../assets/bg.png")}
      style={[styles.bg, { paddingBottom: insets.bottom + 12 }]}
      blurRadius={3}
    >
      <AppBackButton />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: 59 },
        ]}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Legend</Text>

          {/* Stats overview */}
          <View style={styles.statsBlock}>
            <Text style={styles.statLine}>
              ?? Total Wins: {stats?.totalWins ?? 0}
            </Text>
            <Text style={styles.statLine}>
              ? Best Streak: {stats?.bestStreak ?? 0}
            </Text>
            <Text style={styles.statLine}>
              ? Fastest Time: {stats?.fastestTime ?? "-"} s
            </Text>
          </View>

          {/* Achievements */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>?? Achievement Badges</Text>

            {[
              {
                label: "Streak Master",
                color: "#ff9b42",
                desc: "Daily streak milestones ??",
              },
              {
                label: "Speed Demon",
                color: "#41b6ff",
                desc: "Awarded for fast solves",
              },
              {
                label: "Win Milestone",
                color: "#5cd27c",
                desc: "Awarded for total wins",
              },
              {
                label: "Special",
                color: "#a061ff",
                desc: "Special achievements",
              },
              {
                label: "? Flawless",
                color: "#d66bff",
                desc: "5+ games with avg errors < 1",
              },
            ].map((b) => (
              <View key={b.label} style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: b.color }]}>
                  <Text style={styles.badgeText}>{b.label}</Text>
                </View>
                <Text style={styles.badgeDesc}>{b.desc}</Text>
              </View>
            ))}
          </View>

          {/* Ranks */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>?? Ranks</Text>
            <Text style={styles.cardLine}>?? Bronze — 0+</Text>
            <Text style={styles.cardLine}>?? Silver — 1,000+</Text>
            <Text style={styles.cardLine}>?? Gold — 2,500+</Text>
            <Text style={styles.cardLine}>?? Platinum — 5,000+</Text>
            <Text style={styles.cardLine}>?? Diamond — 10,000+</Text>
            <Text style={styles.cardLine}>?? Master — 20,000+</Text>
            <Text style={styles.cardLine}>?? Grandmaster — 35,000+</Text>
          </View>

          {/* Errors */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>?? Errors</Text>
            <Text style={styles.cardLine}>
              Each wrong placement = +1 error
            </Text>
            <Text style={styles.cardLine}>4 errors = Game Over</Text>
            <Text style={styles.cardLine}>
              Errors reduce final score
            </Text>
          </View>

          {/* Scoring */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>?? Scoring Breakdown</Text>
            <Text style={styles.cardLine}>
              + Base Points: Easy 500, Medium 1000, Hard 1500
            </Text>
            <Text style={styles.cardLine}>
              + Time Bonus: Faster solves earn more
            </Text>
            <Text style={styles.cardLine}>
              + Streak Bonus: +100 per daily streak
            </Text>
            <Text style={styles.cardLine}>
              + Fast Solve Bonus
            </Text>
            <Text style={styles.cardLine}>
              - Hint Penalty: -50 per hint
            </Text>
            <Text style={styles.cardLine}>
              - Undo Penalty: -20 per undo
            </Text>
            <Text style={styles.cardLine}>
              - Error Penalty: -30 per error
            </Text>
          </View>
<View style={styles.card}>
  <Text style={styles.cardTitle}>?? Competitive Integrity</Text>

  <Text style={styles.cardLine}>
    All competitive results are calculated from gameplay input only.
  </Text>

  <Text style={styles.cardLine}>
    Daily and competitive modes use fixed conditions.
  </Text>

  <Text style={styles.cardLine}>
    Scores are deterministic and reproducible.
  </Text>

  <Text style={styles.cardLine}>
    Results are not modified after completion.
  </Text>

  <Text style={styles.cardLine}>
    This app does not favor devices, users, or play styles.
  </Text>
</View>
<View style={styles.card}>
  <Text style={styles.cardTitle}>?? Arena (Preview)</Text>

  <Text style={styles.cardLine}>
    Arena is a competitive environment built on the same rules as standard play.
  </Text>

  <Text style={styles.cardLine}>
    Arena runs are completed under fixed conditions.
  </Text>

  <Text style={styles.cardLine}>
    Quits, retries, or invalid runs do not produce competitive results.
  </Text>

  <Text style={styles.cardLine}>
    Arena rankings are based on verified completions only.
  </Text>

  <Text style={styles.cardLine}>
    Arena does not introduce special advantages.
  </Text>
</View>

          {/* Back */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>? Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: theme.spacing.padding,
  },
  container: {
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFD86A",
    marginBottom: 20,
    textAlign: "left",
  },
  statsBlock: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,215,100,0.3)",
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 18,
  },
  statLine: {
    color: "#FFF9E8",
    fontSize: 15,
    marginBottom: 4,
  },
  card: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,215,100,0.35)",
    padding: 14,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFD86A",
    marginBottom: 8,
  },
  cardLine: {
    fontSize: 14,
    color: "#FFF9E8",
    marginVertical: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginVertical: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "700",
  },
  badgeDesc: {
    fontSize: 13,
    color: "#FFF9E8",
  },
  backButton: {
    marginTop: 26,
    marginBottom: 10,
    backgroundColor: "#FFD86A",
    paddingVertical: 10,
    paddingHorizontal: 26,
    borderRadius: 22,
    alignSelf: "flex-start",
  },
  backText: {
    color: "#3B2A00",
    fontWeight: "700",
    fontSize: 15,
  },
});
