import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getColors } from "../theme";

export default function DailyLeaderboard() {
  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const colors = getColors();
  const themedStyles = styles(colors);

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        const ref = doc(db, "dailyLeaderboard", today);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setScores(data.scores || []);
        } else {
          setScores([]);
        }
      } catch (e) {
        console.error("âŒ Error loading daily leaderboard:", e);
        setScores([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, []);

  if (loading) {
    return (
      <View style={[themedStyles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.buttonPrimaryBg} />
      </View>
    );
  }

  if (scores.length === 0) {
    return (
      <View style={[themedStyles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textPrimary }}>No scores yet today.</Text>
      </View>
    );
  }

  return (
    <View style={[themedStyles.container, { backgroundColor: colors.background }]}>
      <Text style={themedStyles.title}>ðŸ“… Daily Leaderboard</Text>
      <FlatList
        data={scores.sort((a, b) => a.time - b.time)} // âœ… sort by fastest time
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item, index }) => (
          <View style={themedStyles.row}>
            <Text style={themedStyles.rank}>{index + 1}</Text>
            <Text style={themedStyles.user}>{item.user}</Text>
            <Text style={themedStyles.score}>{item.score}</Text>
            <Text style={themedStyles.time}>{item.time}s</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
    },
    center: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    title: {
      fontSize: 22,
      fontWeight: "800",
      color: colors.modalTitle,
      marginBottom: 16,
      textAlign: "center",
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    rank: {
      width: 30,
      fontWeight: "700",
      color: colors.secondaryText,
    },
    user: {
      flex: 1,
      color: colors.textPrimary,
    },
    score: {
      width: 60,
      textAlign: "right",
      color: colors.textPrimary,
    },
    time: {
      width: 60,
      textAlign: "right",
      color: colors.textPrimary,
    },
  });

