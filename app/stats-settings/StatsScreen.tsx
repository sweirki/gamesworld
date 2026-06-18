import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { theme } from "../../theme";
import { getAchievements } from "../../lib/achievements";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";

// Rank helper
function getRank(points: number): string {
  if (points >= 35000) return "Grandmaster";
  if (points >= 20000) return "Master";
  if (points >= 10000) return "Diamond";
  if (points >= 5000) return "Platinum";
  if (points >= 2500) return "Gold";
  if (points >= 1000) return "Silver";
  if (points > 0) return "Bronze";
  return "Unranked";
}

// âœ… Fixed Streak helper
function calculateStreak(games: any[]): number {
  if (games.length === 0) return 0;

  const dates = [
    ...new Set(
      games
        .map((g) => {
          if (!g.date) return null;
          if (typeof g.date === "string") {
            return g.date.split("T")[0];
          }
          if (g.date.toDate) {
            return g.date.toDate().toISOString().split("T")[0];
          }
          return null;
        })
        .filter(Boolean)
    ),
  ].sort();

  let streak = 1,
    best = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1]);
    const curr = new Date(dates[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 3600 * 24);
    if (diff === 1) {
      streak++;
      best = Math.max(best, streak);
    } else {
      streak = 1;
    }
  }
  return best;
}

export default function StatsScreen() {
  const [stats, setStats] = useState({
    games: 0,
    points: 0,
    rank: "Unranked",
    streak: 0,
    achievements: [] as string[],
  });

  useEffect(() => {
    (async () => {
      try {
        const savedName = await AsyncStorage.getItem("username");

        // Local
        const localData = await AsyncStorage.getItem("leaderboard");
        const localGames = localData ? JSON.parse(localData) : [];

        // Global
        const snap = await getDocs(collection(db, "leaderboard"));
        const globalGames = snap.docs.map((d) => d.data());

        // Merge games
        let allGames = [...localGames, ...globalGames];

        // âœ… Only filter if username exists
        if (savedName) {
          allGames = allGames.filter((g) => g.user === savedName);
        }

        const totalPoints = allGames.reduce(
          (sum, g) => sum + (g.score || 0),
          0
        );
        const rank = getRank(totalPoints);
        const streak = calculateStreak(allGames);
        const achievements = await getAchievements(savedName || "local");

        setStats({
          games: allGames.length,
          points: totalPoints,
          rank,
          streak,
          achievements,
        });
      } catch (err) {
        console.error("StatsScreen load error:", err);
      }
    })();
  }, []);

  return (
    <ImageBackground
      source={require("../../assets/bg.png")}
      style={styles.bg}
      blurRadius={3}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.title}>Stats</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Overview</Text>
            <Text style={styles.cardLine}>Rank: {stats.rank}</Text>
            <Text style={styles.cardLine}>Games Played: {stats.games}</Text>
            <Text style={styles.cardLine}>Total Points: {stats.points}</Text>
            <Text style={styles.cardLine}>Best Streak: {stats.streak} days</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Achievements</Text>
            {stats.achievements.length > 0 ? (
              stats.achievements.map((a, i) => (
                <Text key={i} style={styles.cardLine}>
                  {a}
                </Text>
              ))
            ) : (
              <Text style={styles.cardLine}>No achievements yet.</Text>
            )}
          </View>
        </View>
      </ScrollView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    resizeMode: "cover",
    backgroundColor: theme.colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.padding,
  },
  container: { alignItems: "center", width: "100%" },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.buttonText,
    marginBottom: 20,
    textAlign: "center",
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.spacing.borderRadius,
    padding: 16,
    width: "85%",
    alignItems: "center",
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.modalTitle,
    marginBottom: 8,
  },
  cardLine: {
    fontSize: 14,
    color: theme.colors.secondaryText,
    marginVertical: 2,
  },
});

