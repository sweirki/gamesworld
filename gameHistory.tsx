import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { auth, db } from "../firebase";

type GameRow = {
  id: string;
  mode: string;
  timeTaken: number;
  hintsUsed: number;
  errors: number;
  createdAt: any;
};

const getCreatedAtMillis = (createdAt: any) => {
  if (createdAt?.toMillis) return createdAt.toMillis();
  if (createdAt?.toDate) return createdAt.toDate().getTime();
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === "number") return createdAt;
  if (typeof createdAt === "string") return Date.parse(createdAt) || 0;
  return 0;
};

const formatCreatedAt = (createdAt: any) => {
  if (createdAt?.toDate) return createdAt.toDate().toLocaleString();
  if (createdAt instanceof Date) return createdAt.toLocaleString();
  if (typeof createdAt === "number") return new Date(createdAt).toLocaleString();
  if (typeof createdAt === "string") return createdAt;
  return "";
};

export default function GameHistory() {
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchCollection = async (path: string[]): Promise<GameRow[]> => {
      try {
        const colRef = collection(db, path[0], path[1], path[2]);
        const q = query(colRef, orderBy("createdAt", "desc"), limit(50));
        const snap = await getDocs(q);

        console.log("HISTORY PATH", path.join("/"), snap.size);

        return snap.docs.map((docSnap) => {
          const data = docSnap.data();

          return {
            id: `${path.join("/")}/${docSnap.id}`,
            mode: data.mode ?? data.type ?? data.variant ?? "classic",
            timeTaken: data.timeTaken ?? data.timeSec ?? data.time ?? data.seconds ?? 0,
            hintsUsed: data.hintsUsed ?? data.hints ?? 0,
            errors: data.errors ?? data.mistakes ?? 0,
            createdAt: data.createdAt ?? data.date ?? data.completedAt ?? data.finishedAt,
          };
        });
      } catch (err) {
        console.warn("History source failed:", path.join("/"), err);
        return [];
      }
    };

    const fetchGames = async () => {
      try {
        const user = auth.currentUser;

        if (!user) {
          console.log("HISTORY USER", "not signed in");
          setGames([]);
          return;
        }

        console.log("HISTORY USER", user.uid, user.email);

        const sources: string[][] = [
          ["users", user.uid, "history"],
          ["users", user.uid, "games"],
        ];

        if (user.email) {
          sources.push(["users", user.email, "games"]);
          sources.push(["users", user.email, "history"]);
        }

        const results = await Promise.all(sources.map(fetchCollection));
        console.log("HISTORY SOURCES", results.map((r) => r.length));

        const merged = results
          .flat()
          .sort((a, b) => getCreatedAtMillis(b.createdAt) - getCreatedAtMillis(a.createdAt))
          .slice(0, 50);

        console.log("HISTORY MERGED", merged.length);

        setGames(merged);
      } catch (err) {
        console.error("Failed to fetch game history:", err);
        setGames([]);
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.noData}>Loading history...</Text>
      </View>
    );
  }

  if (games.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.noData}>No games played yet.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <Text style={styles.title}>Game History</Text>
      <Text style={styles.subtitle}>Your recent games and personal records</Text>

      <FlatList
        data={games}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.mode}>{String(item.mode).toUpperCase()}</Text>
            <Text style={styles.stat}>Time: {item.timeTaken}s</Text>
            <Text style={styles.stat}>Errors: {item.errors}</Text>
            <Text style={styles.stat}>Hints: {item.hintsUsed}</Text>
            <Text style={styles.date}>{formatCreatedAt(item.createdAt)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    color: "#FFEFA3",
    fontSize: 26,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    textAlign: "center",
    marginBottom: 24,
  },
  noData: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 16,
  },
  list: {
    paddingBottom: 40,
  },
  card: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(0,0,0,0.34)",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  mode: {
    color: "#FFEFA3",
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 8,
  },
  stat: {
    color: "#FFFFFF",
    fontSize: 14,
    marginBottom: 4,
  },
  date: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
    marginTop: 8,
  },
});
