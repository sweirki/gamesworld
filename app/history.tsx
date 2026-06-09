import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  ImageBackground,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import { auth, db } from "../firebase";

/* ================= TYPES ================= */

type GameEntry = {
  id: string;
  mode: string;
  win: boolean;
  time: number;
  errors: number;
  date: string;
};

/* ================= HELPERS ================= */

function historyKey() {
  const uid = auth.currentUser?.uid || "guest";
  return `gameHistory:${uid}`;
}

function asNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function dateFromAny(value: any) {
  if (value?.toDate) return value.toDate().toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  return new Date().toISOString();
}

function normalizeFirestoreGame(id: string, data: any): GameEntry {
  return {
    id,
    mode: String(data.mode ?? data.gameMode ?? data.type ?? "classic"),
    win: data.win ?? data.won ?? (data.result ? data.result === "win" : true),
    time: asNumber(
      data.time,
      asNumber(data.timeTaken, asNumber(data.timeSec, asNumber(data.seconds, 0)))
    ),
    errors: asNumber(data.errors, asNumber(data.mistakes, 0)),
    date: dateFromAny(data.date ?? data.createdAt ?? data.completedAt ?? data.timestamp),
  };
}

function normalizeLocalGame(item: any, index: number): GameEntry {
  return {
    id: `local-${index}`,
    mode: String(item.mode ?? "classic"),
    win: item.win ?? true,
    time: asNumber(item.time, asNumber(item.timeTaken, 0)),
    errors: asNumber(item.errors, 0),
    date: dateFromAny(item.date ?? item.createdAt),
  };
}

function formatTime(sec: number) {
  const safe = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown date";

  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 0) return d.toLocaleDateString();
  return `${diff}d ago`;
}

function modeIcon(mode: string) {
  switch (mode) {
    case "classic":
      return "🧩";
    case "daily":
      return "📅";
    case "hyper":
      return "⚡";
    case "killer":
      return "☠️";
    case "x":
      return "❌";
    default:
      return "🎮";
  }
}

function fastestWin(history: GameEntry[]) {
  const wins = history.filter((game) => game.win && game.time > 0).map((game) => game.time);
  return wins.length ? formatTime(Math.min(...wins)) : "--";
}

function fewestErrors(history: GameEntry[]) {
  const wins = history.filter((game) => game.win).map((game) => game.errors);
  return wins.length ? Math.min(...wins) : "--";
}

/* ================= SCREEN ================= */

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<GameEntry[]>([]);

  useEffect(() => {
    const fetchFirestoreSource = async (path: string[]): Promise<GameEntry[]> => {
      const pathText = path.join("/");

      try {
        const snap = await getDocs(query(collection(db, path[0], path[1], path[2]), limit(50)));

        return snap.docs.map((docSnap) =>
          normalizeFirestoreGame(`${pathText}/${docSnap.id}`, docSnap.data())
        );
      } catch (err) {
        console.warn("History source failed:", pathText, err);
        return [];
      }
    };

    const load = async () => {
      try {
        const user = auth.currentUser;
        const raw = await AsyncStorage.getItem(historyKey());
        const localParsed = raw ? JSON.parse(raw) : [];
        const localHistory = Array.isArray(localParsed)
          ? localParsed.map(normalizeLocalGame)
          : [];

        const sources: string[][] = [];

        if (user?.uid) {
          sources.push(["users", user.uid, "history"]);
          sources.push(["users", user.uid, "games"]);
        }

        if (user?.email) {
          sources.push(["users", user.email, "games"]);
          sources.push(["users", user.email, "history"]);
        }

        const results = await Promise.all(sources.map(fetchFirestoreSource));

        const byId = new Map<string, GameEntry>();
        [...localHistory, ...results.flat()].forEach((entry) => byId.set(entry.id, entry));

        const merged = Array.from(byId.values())
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 50);

        setHistory(merged);
      } catch (err) {
        console.error("Failed to fetch game history:", err);
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FBE7A1" />
      </View>
    );
  }

  return (
    <ImageBackground source={require("../assets/bg.png")} style={styles.bg} blurRadius={3}>
      <LinearGradient
        colors={["rgba(0,0,40,0.75)", "transparent"]}
        style={StyleSheet.absoluteFillObject}
      />

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Game History</Text>
            <Text style={styles.subtitle}>Your recent games and personal records</Text>

            {history.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No games played yet</Text>
              </View>
            ) : (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>Personal Bests</Text>

                  <StatRow label="Fastest Win" value={fastestWin(history)} />
                  <StatRow label="Fewest Errors" value={fewestErrors(history)} />
                </View>

                <Text style={styles.sectionTitle}>Recent Games</Text>
              </>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.mode}>
                {modeIcon(item.mode)} {item.mode.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.date,
                  formatDate(item.date) === "Today" && {
                    color: "#FBE7A1",
                  },
                ]}
              >
                {formatDate(item.date)}
              </Text>
            </View>

            <View style={styles.result}>
              <Text
                style={[
                  styles.time,
                  { color: item.win ? "#2ECC71" : "#E74C3C" },
                ]}
              >
                {formatTime(item.time)}
              </Text>

              <Text
                style={[
                  styles.errors,
                  {
                    color:
                      item.errors === 0
                        ? "#2ECC71"
                        : item.errors <= 2
                        ? "#F1C40F"
                        : "#E67E22",
                  },
                ]}
              >
                {item.errors} errors
              </Text>
            </View>
          </View>
        )}
      />
    </ImageBackground>
  );
}

/* ================= SMALL COMPONENT ================= */

function StatRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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

  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FBE7A1",
    marginBottom: 10,
  },

  empty: {
    marginTop: 60,
    alignItems: "center",
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

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  mode: {
    fontSize: 14,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 4,
  },

  date: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },

  result: {
    alignItems: "flex-end",
  },

  time: {
    fontSize: 15,
    fontWeight: "800",
  },

  errors: {
    fontSize: 12,
    marginTop: 2,
  },
});
