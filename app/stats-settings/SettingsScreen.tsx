import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ImageBackground,
  TextInput,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { theme } from "../../theme";

// ðŸ”¹ Ladder + Achievements imports
import { getAchievements } from "../../lib/achievements";
import { calculateScore } from "../../ladder"; // from scoreEngine/index
// If you have a tier helper, import getRank from ladder too

// Simple rank function (fallback if ladder doesnâ€™t expose one)
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

// Helper: calculate streak (days in a row)
function calculateStreak(games: any[]): number {
  if (games.length === 0) return 0;
  const dates = [...new Set(games.map((g) => g.date.split("T")[0]))].sort();
  let streak = 1, best = 1;
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

export default function ProfileScreen() {
  const [username, setUsername] = useState<string>("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  const [stats, setStats] = useState({
    games: 0,
    points: 0,
    rank: "Unranked",
    streak: 0,
    achievements: [] as string[],
  });

  useEffect(() => {
    (async () => {
      const savedName = await AsyncStorage.getItem("username");
      const savedAvatar = await AsyncStorage.getItem("avatarUri");
      if (savedName) setUsername(savedName);
      if (savedAvatar) setAvatarUri(savedAvatar);

      try {
        const data = await AsyncStorage.getItem("leaderboard");
        const games = data ? JSON.parse(data) : [];

        const totalPoints = games.reduce((sum, g) => sum + (g.score || 0), 0);
        const rank = getRank(totalPoints);
        const streak = calculateStreak(games);
        const achievements = await getAchievements(savedName || username || "local");

        setStats({
          games: games.length,
          points: totalPoints,
          rank,
          streak,
          achievements,
        });
      } catch (err) {
        console.error("Profile stats load error:", err);
      }
    })();
  }, []);

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await AsyncStorage.setItem("avatarUri", uri);
    }
  };

  const pickFromCamera = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      await AsyncStorage.setItem("avatarUri", uri);
    }
  };

  const resetAvatar = async () => {
    setAvatarUri(null);
    await AsyncStorage.removeItem("avatarUri");
  };

  const saveUsername = async (name: string) => {
    setUsername(name);
    await AsyncStorage.setItem("username", name);
  };

  return (
    <ImageBackground source={require("../../assets/bg.png")} style={styles.bg} blurRadius={3}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.container}>
          <Text style={styles.title}>Profile</Text>

          {/* Avatar */}
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>+</Text>
            </View>
          )}

          {/* Username */}
          <TextInput
            style={styles.input}
            value={username}
            placeholder="Enter Username"
            placeholderTextColor={theme.colors.secondaryText}
            onChangeText={saveUsername}
          />

          {/* Avatar Actions */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.actionButton} onPress={pickFromGallery}>
              <Text style={styles.actionText}>Pick from Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={pickFromCamera}>
              <Text style={styles.actionText}>Use Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.red]} onPress={resetAvatar}>
              <Text style={styles.actionText}>Reset Avatar</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Stats</Text>
            <Text style={styles.cardLine}>Rank: {stats.rank}</Text>
            <Text style={styles.cardLine}>Games Played: {stats.games}</Text>
            <Text style={styles.cardLine}>Total Points: {stats.points}</Text>
            <Text style={styles.cardLine}>Best Streak: {stats.streak} days</Text>
          </View>

          {/* Achievements */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Achievements</Text>
            {stats.achievements.length > 0 ? (
              stats.achievements.map((a, i) => (
                <Text key={i} style={styles.cardLine}>{a}</Text>
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
  bg: { flex: 1, resizeMode: "cover", backgroundColor: theme.colors.background },
  scroll: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: theme.spacing.padding },
  container: { alignItems: "center", width: "100%" },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: theme.colors.buttonText,
    marginBottom: 20,
    textAlign: "center",
    textShadowColor: "#000",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  avatar: { width: 120, height: 120, borderRadius: 60, marginBottom: 12 },
  avatarPlaceholder: {
    backgroundColor: theme.colors.card,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 32, color: theme.colors.modalTitle },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.borderRadius,
    padding: 10,
    width: "80%",
    marginBottom: 20,
    backgroundColor: theme.colors.card,
    color: theme.colors.primaryText,
    textAlign: "center",
  },
  actions: { marginBottom: 20, width: "80%" },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: theme.spacing.borderRadius,
    backgroundColor: theme.colors.buttonBg,
    alignItems: "center",
    marginVertical: 6,
  },
  red: { backgroundColor: theme.colors.menuRed },
  actionText: { color: theme.colors.buttonText, fontWeight: "700", fontSize: 15 },
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
  cardLine: { fontSize: 14, color: theme.colors.secondaryText, marginVertical: 2 },
});

