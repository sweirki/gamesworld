import { useCallback, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import ArenaLayout from "./ArenaLayout";
import { sweirkiTheme } from "../theme/sweirkiTheme";
import { ArenaSnapshot, formatArenaTime, getArenaSnapshot } from "../../src/arena/arenaEngine";

export default function ArenaHistory() {
  const [snapshot, setSnapshot] = useState<ArenaSnapshot | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      getArenaSnapshot().then((next) => alive && setSnapshot(next));
      return () => { alive = false; };
    }, [])
  );

  const history = snapshot?.history ?? [];

  return (
    <ArenaLayout title="History" subtitle="Arena Record">
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}><Ionicons name="pulse-outline" size={28} color={sweirkiTheme.colors.cyanDeep} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryTitle}>{history.length ? "Arena record active" : "No Arena runs yet"}</Text>
          <Text style={styles.summaryText}>Ranked duels, survival streaks, and cup attempts will be archived here.</Text>
        </View>
      </View>

      <View style={styles.list}>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Start your first duel</Text>
            <Text style={styles.emptyText}>Open Ranked Duel and complete a board to create your first Arena result.</Text>
            <Pressable style={styles.emptyButton} onPress={() => router.push("/arena/ranked" as any)}>
              <Text style={styles.emptyButtonText}>Go to Ranked</Text>
            </Pressable>
          </View>
        ) : (
          history.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View style={[styles.outcomeBadge, item.win ? styles.winBadge : styles.lossBadge]}>
                <Ionicons name={item.win ? "checkmark" : "close"} size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.historyTitle}>{item.win ? "Victory" : "Defeat"} vs {item.opponentName}</Text>
                <Text style={styles.historyMeta}>{item.mode.toUpperCase()} • {item.stageName ?? "Arena"} • {formatArenaTime(item.playerTimeSec)} • {item.errors} errors</Text>
              </View>
              <Text style={[styles.delta, item.ratingDelta >= 0 ? styles.deltaUp : styles.deltaDown]}>{item.ratingDelta >= 0 ? "+" : ""}{item.ratingDelta}</Text>
            </View>
          ))
        )}
      </View>
    </ArenaLayout>
  );
}

const styles = StyleSheet.create({
  summaryCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 28, padding: 18, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.hero },
  summaryIcon: { width: 58, height: 58, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(53,200,244,0.14)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  summaryTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 22, color: sweirkiTheme.colors.ink },
  summaryText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 12, lineHeight: 17, color: sweirkiTheme.colors.textSoft, marginTop: 2 },
  list: { gap: 11 },
  emptyCard: { alignItems: "center", borderRadius: 28, padding: 24, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan, ...sweirkiTheme.shadows.glassCard },
  emptyTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 23, color: sweirkiTheme.colors.ink },
  emptyText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 18, color: sweirkiTheme.colors.textSoft, textAlign: "center", marginTop: 5 },
  emptyButton: { marginTop: 16, height: 46, paddingHorizontal: 22, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: sweirkiTheme.colors.cyanDeep },
  emptyButtonText: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 15, color: "#FFFFFF" },
  historyCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 23, padding: 14, backgroundColor: "rgba(255,255,255,0.94)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan },
  outcomeBadge: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  winBadge: { backgroundColor: sweirkiTheme.colors.cyanDeep },
  lossBadge: { backgroundColor: "#CF7046" },
  historyTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 16, color: sweirkiTheme.colors.ink },
  historyMeta: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 11, color: sweirkiTheme.colors.textSoft },
  delta: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 18 },
  deltaUp: { color: sweirkiTheme.colors.cyanDeep },
  deltaDown: { color: "#C46245" },
});
