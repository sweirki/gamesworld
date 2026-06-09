import React, { useState, useEffect } from "react";
import Svg, { Rect } from "react-native-svg";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getColors } from "../theme";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../firebase";

interface Entry {
  username?: string;
  user?: string;
  uid?: string;
  score: number;
  time: number;
  difficulty: string;
  date: string;
  errors?: number;
  achievements?: string[];
  streak?: number;
}

export default function WeeklyLeaderboard() {
  const colors = getColors();
  const [tab, setTab] = useState<"global" | "local" | "friends">("local");
  const [difficulty, setDifficulty] = useState("easy");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [localEntries, setLocalEntries] = useState<Entry[]>([]);
  const [friendEntries, setFriendEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  // Weekly reset logic (local)
  useEffect(() => {
    const resetCheck = async () => {
      const lastReset = await AsyncStorage.getItem("weeklyReset");
      const now = new Date();

      if (lastReset) {
        const diffDays =
          (now.getTime() - new Date(lastReset).getTime()) /
          (1000 * 3600 * 24);

        if (diffDays >= 7) {
          await AsyncStorage.removeItem("weeklyLeaderboard");
          await AsyncStorage.setItem("weeklyReset", now.toISOString());
        }
      } else {
        await AsyncStorage.setItem("weeklyReset", now.toISOString());
      }
    };
    resetCheck();
  }, []);

  // Fetch Local
  useEffect(() => {
    const fetchLocal = async () => {
      const saved = await AsyncStorage.getItem("weeklyLeaderboard");
      if (saved) {
        const parsed: Entry[] = JSON.parse(saved);
        const filtered = parsed.filter((e) => e.difficulty === difficulty);
        filtered.sort((a, b) => b.score - a.score);
        setLocalEntries(filtered);
      }
    };
    fetchLocal();
  }, [difficulty]);

  // Fetch Global
  useEffect(() => {
    if (tab === "global") {
      setLoading(true);
      const q = query(
        collection(db, "weeklyLeaderboard"),
        where(
          "difficulty",
          "==",
          difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
        ),
        orderBy("score", "desc")
      );

      const unsub = onSnapshot(q, (snap) => {
        const data: Entry[] = snap.docs.map((doc) => doc.data() as Entry);
        setEntries(data);
        setLoading(false);
      });

      return () => unsub();
    }
  }, [tab, difficulty]);

  // Fetch Friends
  useEffect(() => {
    if (tab === "friends" && auth.currentUser) {
      (async () => {
        const uid = auth.currentUser.uid;
        const snap = await getDocs(collection(db, "friends", uid, "list"));
        const friendUIDs = snap.docs.map((d) => d.id);

        if (friendUIDs.length === 0) {
          setFriendEntries([]);
          return;
        }

        const q = query(
          collection(db, "weeklyLeaderboard"),
          where("uid", "in", friendUIDs),
          where(
            "difficulty",
            "==",
            difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
          ),
          orderBy("score", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
          const data: Entry[] = snap.docs.map((doc) => doc.data() as Entry);
          setFriendEntries(data);
        });

        return () => unsub();
      })();
    }
  }, [tab, difficulty]);

  const getBadgeStyle = (a: string) => {
    if (a.toLowerCase().includes("streak")) return styles(colors).badgeStreak;
    if (a.toLowerCase().includes("speed")) return styles(colors).badgeSpeed;
    if (a.toLowerCase().includes("win")) return styles(colors).badgeWin;
    return styles(colors).badgeDefault;
  };

  const renderItem = ({ item, index }: { item: Entry; index: number }) => {
    const bg =
      index === 0
        ? colors.gold
        : index === 1
        ? colors.silver
        : index === 2
        ? colors.bronze
        : (colors as any).rankDefault;

    return (
      <View style={[styles(colors).entryBox, { backgroundColor: bg }]}>
        <Text style={styles(colors).username}>
          {index + 1}. {item.username || item.user}{" "}
          {item.streak && item.streak > 0 ? `🔥 ${item.streak}d` : ""}
        </Text>

        <Text style={styles(colors).score}>
          {item.score} pts — {item.time}s
        </Text>

        {item.errors !== undefined && item.errors > 0 && (
          <Text style={styles(colors).errors}>⚠️ {item.errors} errors</Text>
        )}

        {item.achievements && item.achievements.length > 0 && (
          <View style={styles(colors).achievementsRow}>
            {item.achievements.map((ach, i) => (
              <View key={i} style={[styles(colors).badge, getBadgeStyle(ach)]}>
                <Text style={styles(colors).badgeText}>{ach}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <ImageBackground
      source={require("../assets/bg.png")}
      style={styles(colors).bg}
      resizeMode="cover"
    >
      <View style={styles(colors).overlay}>
        {/* Tabs */}
        <View style={styles(colors).tabRow}>
          <TouchableOpacity
            style={[
              styles(colors).tab,
              tab === "global" && styles(colors).tabActive,
            ]}
            onPress={() => setTab("global")}
          >
            <Text
              style={[
                styles(colors).tabText,
                tab === "global" && styles(colors).tabTextActive,
              ]}
            >
              Global
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles(colors).tab,
              tab === "local" && styles(colors).tabActive,
            ]}
            onPress={() => setTab("local")}
          >
            <Text
              style={[
                styles(colors).tabText,
                tab === "local" && styles(colors).tabTextActive,
              ]}
            >
              Local
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles(colors).tab,
              tab === "friends" && styles(colors).tabActive,
            ]}
            onPress={() => setTab("friends")}
          >
            <Text
              style={[
                styles(colors).tabText,
                tab === "friends" && styles(colors).tabTextActive,
              ]}
            >
              Friends
            </Text>
          </TouchableOpacity>
        </View>

        {/* Difficulty */}
        <View style={styles(colors).tabRow}>
          {["easy", "medium", "hard"].map((d) => (
            <TouchableOpacity
              key={d}
              style={[
                styles(colors).tab,
                difficulty === d && styles(colors).tabActive,
              ]}
              onPress={() => setDifficulty(d)}
            >
              <Text
                style={[
                  styles(colors).tabText,
                  difficulty === d && styles(colors).tabTextActive,
                ]}
              >
                {d.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "global" && loading ? (
          <ActivityIndicator size="large" color={colors.buttonPrimaryBg} />
        ) : (
          <FlatList
            data={
              tab === "global"
                ? entries
                : tab === "local"
                ? localEntries
                : friendEntries
            }
            keyExtractor={(_, i) => i.toString()}
            renderItem={renderItem}
            style={styles(colors).list}
          />
        )}
      </View>
    </ImageBackground>
  );
}

const styles = (colors: any) =>
  StyleSheet.create({
    bg: {
      flex: 1,
      width: "100%",
      height: "100%",
    },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.3)",
      padding: 10,
    },
    tabRow: {
      flexDirection: "row",
      justifyContent: "center",
      marginBottom: 8,
      marginTop: 20,
    },
    tab: {
      borderWidth: 1,
      borderColor: colors.primary,
      borderRadius: 18,
      paddingVertical: 4,
      paddingHorizontal: 10,
      marginHorizontal: 3,
      backgroundColor: colors.card,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    tabText: {
      fontSize: 10,
      fontWeight: "600",
      color: colors.text,
    },
    tabTextActive: {
      color: "#fff",
    },
    list: {
      flex: 1,
    },
    entryBox: {
      borderRadius: 10,
      padding: 6,
      marginVertical: 3,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    username: {
      fontWeight: "700",
      color: colors.text,
      fontSize: 12,
      lineHeight: 14,
    },
    score: {
      fontSize: 10,
      color: colors.subText,
      lineHeight: 12,
    },
    errors: {
      fontSize: 9,
      color: "red",
      lineHeight: 11,
    },
    achievementsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 3,
    },
    badge: {
      borderRadius: 8,
      paddingHorizontal: 5,
      paddingVertical: 2,
      marginRight: 4,
      marginBottom: 3,
    },
    badgeText: {
      fontSize: 8,
      color: "#fff",
    },
    badgeStreak: { backgroundColor: "#ff9800" },
    badgeSpeed: { backgroundColor: "#2196f3" },
    badgeWin: { backgroundColor: "#4caf50" },
    badgeDefault: { backgroundColor: "#9c27b0" },
  });
