import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ArenaLayout from "./ArenaLayout";
import { sweirkiTheme } from "../theme/sweirkiTheme";

const RULES = [
  ["Verified starts", "Arena creates a pending competitive run before sending the player to the puzzle."],
  ["Verified wins", "A win must be fast enough and clean enough to beat the generated target."],
  ["Rating movement", "Arena rating rises after wins and drops after failed competitive runs."],
  ["Season rewards", "Arena XP, Arena Points, badges, cup wins, and profile records are banked after official results."],
  ["Goal board", "Daily and weekly goals create return reasons without changing the core Sudoku fairness rules."],
  ["Economy guard", "High-volume farming soft-caps rewards so Arena progression stays meaningful."],
  ["League identity", "Bronze, Silver, Gold, Elite, and Master badges are based on rating and season performance."],
  ["No pay-to-win", "Premium modes can change format, but skill decides Arena outcomes."],
];

export default function ArenaRules() {
  return (
    <ArenaLayout title="Rules" subtitle="Arena Code">
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}><Ionicons name="shield-checkmark" size={34} color={sweirkiTheme.colors.cyanDeep} /></View>
        <Text style={styles.heroTitle}>Fair, clean, competitive Sudoku.</Text>
        <Text style={styles.heroText}>Arena uses saved sessions, clear rules, and official results so every run feels competitive.</Text>
      </View>

      <View style={styles.rulesCard}>
        {RULES.map(([heading, text], index) => (
          <View key={heading} style={[styles.ruleRow, index === RULES.length - 1 && styles.lastRuleRow]}>
            <View style={styles.ruleBadge}><Text style={styles.ruleBadgeText}>{index + 1}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ruleHeading}>{heading}</Text>
              <Text style={styles.ruleText}>{text}</Text>
            </View>
          </View>
        ))}
      </View>
    </ArenaLayout>
  );
}

const styles = StyleSheet.create({
  heroCard: { alignItems: "center", borderRadius: 32, padding: 24, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.96)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong, ...sweirkiTheme.shadows.hero },
  heroIcon: { width: 74, height: 74, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 12, backgroundColor: "rgba(53,200,244,0.14)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyanStrong },
  heroTitle: { fontFamily: sweirkiTheme.fonts.bold, fontSize: 25, color: sweirkiTheme.colors.ink, textAlign: "center" },
  heroText: { fontFamily: sweirkiTheme.fonts.regular, fontSize: 13, lineHeight: 18, color: sweirkiTheme.colors.textSoft, textAlign: "center", marginTop: 5 },
  rulesCard: { borderRadius: 26, padding: 18, backgroundColor: "rgba(255,255,255,0.95)", borderWidth: 1, borderColor: sweirkiTheme.colors.borderCyan, ...sweirkiTheme.shadows.glassCard },
  ruleRow: { flexDirection: "row", gap: 13, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: "rgba(91,202,245,0.18)" },
  lastRuleRow: { borderBottomWidth: 0 },
  ruleBadge: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(53,200,244,0.14)" },
  ruleBadgeText: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.cyanDeep, fontSize: 15 },
  ruleHeading: { fontFamily: sweirkiTheme.fonts.bold, color: sweirkiTheme.colors.ink, fontSize: 17 },
  ruleText: { fontFamily: sweirkiTheme.fonts.regular, color: sweirkiTheme.colors.textSoft, fontSize: 12, lineHeight: 17, marginTop: 2 },
});

