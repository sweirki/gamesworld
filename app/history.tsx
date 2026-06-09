import React, { useEffect, useMemo, useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../firebase";
import { sweirkiTheme } from "./theme/sweirkiTheme";

/* ================= TYPES ================= */

type GameEntry = {
  id: string;
  mode: string;
  win: boolean;
  time: number;
  errors: number;
  date: string;
};

/* ================= THEME ================= */

const T = sweirkiTheme;
const C = T.colors;
const F = T.fonts;
const R = T.radius;
const S = T.spacing;

/* ================= ASSETS ================= */

const bgAsset = T.assets.homeBackground;

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

function normalizeMode(mode: string) {
  const clean = mode.toLowerCase().trim();
  if (clean === "xsudoku" || clean === "x-sudoku") return "x";
  if (clean === "daily challenge") return "daily";
  return clean || "classic";
}

function modeTitle(mode: string) {
  const clean = normalizeMode(mode);
  switch (clean) {
    case "classic":
      return "Classic";
    case "daily":
      return "Daily";
    case "hyper":
      return "Hyper";
    case "killer":
      return "Killer";
    case "x":
      return "X Sudoku";
    default:
      return clean.charAt(0).toUpperCase() + clean.slice(1);
  }
}

function modeSubtitle(mode: string) {
  const clean = normalizeMode(mode);
  switch (clean) {
    case "classic":
      return "Original Sudoku";
    case "daily":
      return "Daily challenge";
    case "hyper":
      return "Fast pressure";
    case "killer":
      return "Cage logic";
    case "x":
      return "Diagonal mastery";
    default:
      return "Sudoku session";
  }
}

function modeVisual(mode: string): {
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  border: string;
  color: string;
} {
  const clean = normalizeMode(mode);
  switch (clean) {
    case "daily":
      return { icon: "calendar-clear-outline", bg: "#F2ECFF", border: "#D8C9FF", color: C.purple };
    case "hyper":
      return { icon: "flash-outline", bg: "#F0ECFF", border: "#D7CCFF", color: C.purple };
    case "killer":
      return { icon: "grid-outline", bg: "#FFF6E4", border: "#F8DCA5", color: C.gold };
    case "x":
      return { icon: "git-compare-outline", bg: "#EAFBF8", border: "#BDEEE5", color: "#38BFA7" };
    default:
      return { icon: "apps-outline", bg: "#EAF8FF", border: "#BDEBFF", color: C.cyanDeep };
  }
}

function formatTime(sec: number) {
  const safe = Math.max(0, Math.floor(sec || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;

  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown";

  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 0) return d.toLocaleDateString();
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function fastestWin(history: GameEntry[]) {
  const wins = history.filter((game) => game.win && game.time > 0).map((game) => game.time);
  return wins.length ? formatTime(Math.min(...wins)) : "--";
}

function fewestErrors(history: GameEntry[]) {
  const wins = history.filter((game) => game.win).map((game) => game.errors);
  return wins.length ? Math.min(...wins) : "--";
}

function totalPlayTime(history: GameEntry[]) {
  const total = history.reduce((sum, game) => sum + Math.max(0, game.time || 0), 0);
  return total ? formatTime(total) : "--";
}

function winCount(history: GameEntry[]) {
  return history.filter((game) => game.win).length;
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

  const summaryLine = useMemo(() => {
    if (!history.length) return "Your latest completed games will appear here.";
    return `${history.length} games • ${winCount(history)} wins • Best ${fastestWin(history)}`;
  }, [history]);

  if (loading) {
    return (
      <ImageBackground source={bgAsset} style={styles.bg} resizeMode="cover">
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.cyanStrong} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={bgAsset} style={styles.bg} resizeMode="cover">
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <>
            <LinearGradient colors={C.heroGradient as any} style={styles.heroCard}>
              <View style={styles.heroCopy}>
                <Text style={styles.kicker}>RECENT RUNS</Text>
                <Text style={styles.title}>History</Text>
                <Text style={styles.subtitle}>{summaryLine}</Text>
              </View>

              <View style={styles.heroBadge}>
                <Ionicons name="time-outline" size={34} color={C.cyanDeep} />
              </View>
            </LinearGradient>

            {history.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyBadge}>
                  <Ionicons name="sparkles-outline" size={32} color={C.cyanDeep} />
                </View>
                <Text style={styles.emptyTitle}>No games yet</Text>
                <Text style={styles.emptyText}>Finish a Sudoku run and your recent results will appear here.</Text>
              </View>
            ) : (
              <>
                <View style={styles.compactStatsCard}>
                  <CompactStat icon="grid-outline" label="Games" value={history.length} />
                  <CompactStat icon="trophy-outline" label="Wins" value={winCount(history)} />
                  <CompactStat icon="flash-outline" label="Best" value={fastestWin(history)} />
                  <CompactStat icon="stopwatch-outline" label="Time" value={totalPlayTime(history)} />
                </View>

                <View style={styles.bestStrip}>
                  <View style={styles.bestItem}>
                    <Text style={styles.bestLabel}>Fewest errors</Text>
                    <Text style={styles.bestValue}>{fewestErrors(history)}</Text>
                  </View>
                  <View style={styles.bestDivider} />
                  <View style={styles.bestItem}>
                    <Text style={styles.bestLabel}>Showing</Text>
                    <Text style={styles.bestValue}>Last 50</Text>
                  </View>
                </View>

                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Games</Text>
                  <Text style={styles.sectionMeta}>{history.length} runs</Text>
                </View>
              </>
            )}
          </>
        }
        renderItem={({ item }) => <HistoryRow item={item} />}
      />
    </ImageBackground>
  );
}

/* ================= SMALL COMPONENTS ================= */

function CompactStat({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.compactStat}>
      <View style={styles.compactIcon}>
        <Ionicons name={icon} size={17} color={C.cyanDeep} />
      </View>
      <View>
        <Text style={styles.compactValue}>{value}</Text>
        <Text style={styles.compactLabel}>{label}</Text>
      </View>
    </View>
  );
}

function HistoryRow({ item }: { item: GameEntry }) {
  const cleanMode = normalizeMode(item.mode);
  const cleanWin = item.win;
  const cleanErrors = Math.max(0, item.errors || 0);
  const visual = modeVisual(cleanMode);

  return (
    <View style={styles.row}>
      <View style={[styles.modeIconBox, { backgroundColor: visual.bg, borderColor: visual.border }]}>
        <Ionicons name={visual.icon} size={24} color={visual.color} />
      </View>

      <View style={styles.rowMiddle}>
        <View style={styles.rowTitleLine}>
          <Text style={styles.mode}>{modeTitle(cleanMode)}</Text>
          <View style={[styles.resultBadge, cleanWin ? styles.winBadge : styles.lossBadge]}>
            <Text style={[styles.resultBadgeText, cleanWin ? styles.winText : styles.lossText]}>
              {cleanWin ? "Win" : "Loss"}
            </Text>
          </View>
        </View>
        <Text style={styles.modeSub} numberOfLines={1}>{modeSubtitle(cleanMode)}</Text>
        <Text style={[styles.date, formatDate(item.date) === "Today" && styles.todayText]}>
          {formatDate(item.date)}
        </Text>
      </View>

      <View style={styles.result}>
        <Text style={styles.time}>{formatTime(item.time)}</Text>
        <Text style={[styles.errors, cleanErrors === 0 && styles.cleanErrors]}>
          {cleanErrors === 0 ? "Clean" : `${cleanErrors} ${cleanErrors === 1 ? "error" : "errors"}`}
        </Text>
      </View>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  bg: { flex: 1 },

  container: {
    paddingHorizontal: T.layout.screenPaddingX,
    paddingTop: 70,
    paddingBottom: T.layout.screenPaddingBottom,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: S.md,
    fontFamily: F.regular,
    color: C.textSoft,
    fontSize: 15,
  },

  heroCard: {
    minHeight: 140,
    borderRadius: R.hero,
    borderWidth: 1.2,
    borderColor: C.borderCyanStrong,
    paddingVertical: 20,
    paddingHorizontal: 22,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...T.shadows.glassCard,
  },

  heroCopy: {
    flex: 1,
    paddingRight: 12,
  },

  kicker: {
    fontFamily: F.bold,
    fontSize: 11,
    letterSpacing: 3,
    color: C.cyanDeep,
    marginBottom: 6,
  },

  title: {
    fontFamily: F.bold,
    fontSize: 34,
    lineHeight: 38,
    color: C.inkDeep,
    marginBottom: 5,
  },

  subtitle: {
    fontFamily: F.regular,
    fontSize: 14,
    lineHeight: 20,
    color: C.text,
  },

  heroBadge: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: "rgba(234,248,255,0.92)",
    borderWidth: 1,
    borderColor: C.borderCyanStrong,
    alignItems: "center",
    justifyContent: "center",
  },

  compactStatsCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: C.glassStrong,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.borderCyan,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },

  compactStat: {
    width: "50%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  compactIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: "rgba(221,247,255,0.82)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  compactValue: {
    fontFamily: F.bold,
    fontSize: 20,
    lineHeight: 22,
    color: C.inkDeep,
  },

  compactLabel: {
    fontFamily: F.regular,
    fontSize: 12,
    color: C.textSoft,
    marginTop: -1,
  },

  bestStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: R.soft,
    borderWidth: 1,
    borderColor: "rgba(91,202,245,0.20)",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 18,
  },

  bestItem: {
    flex: 1,
  },

  bestLabel: {
    fontFamily: F.regular,
    fontSize: 12,
    color: C.textSoft,
  },

  bestValue: {
    fontFamily: F.bold,
    fontSize: 16,
    color: C.inkDeep,
    marginTop: -1,
  },

  bestDivider: {
    width: 1,
    alignSelf: "stretch",
    backgroundColor: "rgba(91,202,245,0.22)",
    marginHorizontal: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  sectionTitle: {
    fontFamily: F.bold,
    fontSize: 23,
    lineHeight: 26,
    color: C.inkDeep,
  },

  sectionMeta: {
    fontFamily: F.bold,
    fontSize: 12,
    color: C.cyanDeep,
  },

  emptyCard: {
    backgroundColor: C.glassStrong,
    borderRadius: R.card,
    borderWidth: 1.2,
    borderColor: C.borderCyanStrong,
    padding: 24,
    alignItems: "center",
  },

  emptyBadge: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: "rgba(221,247,255,0.86)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },

  emptyTitle: {
    fontFamily: F.bold,
    fontSize: 23,
    color: C.inkDeep,
    marginBottom: 5,
  },

  emptyText: {
    fontFamily: F.regular,
    color: C.text,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(91,202,245,0.22)",
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 9,
  },

  modeIconBox: {
    width: 46,
    height: 46,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  rowMiddle: {
    flex: 1,
    minWidth: 0,
  },

  rowTitleLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },

  mode: {
    fontFamily: F.bold,
    fontSize: 18,
    lineHeight: 21,
    color: C.inkDeep,
    marginRight: 7,
  },

  modeSub: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 16,
    color: C.text,
    marginBottom: 0,
  },

  date: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 15,
    color: C.textMuted,
  },

  todayText: {
    color: C.cyanDeep,
    fontFamily: F.bold,
  },

  resultBadge: {
    borderRadius: R.pill,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },

  winBadge: {
    backgroundColor: "#DFF8EF",
  },

  lossBadge: {
    backgroundColor: "#FFECEC",
  },

  resultBadgeText: {
    fontFamily: F.bold,
    fontSize: 10,
    lineHeight: 14,
  },

  winText: {
    color: "#1E9F68",
  },

  lossText: {
    color: "#D85C5C",
  },

  result: {
    alignItems: "flex-end",
    minWidth: 62,
    marginLeft: 8,
  },

  time: {
    fontFamily: F.bold,
    fontSize: 18,
    lineHeight: 21,
    color: C.inkDeep,
  },

  errors: {
    fontFamily: F.bold,
    fontSize: 12,
    lineHeight: 16,
    color: "#D98916",
    marginTop: 1,
  },

  cleanErrors: {
    color: "#1E9F68",
  },
});
