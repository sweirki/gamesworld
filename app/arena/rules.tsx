import { StyleSheet, Text, View } from "react-native";
import ArenaLayout from "./ArenaLayout";
import { sweirkiTheme } from "../theme/sweirkiTheme";

const RULES = [
  ["Scoring", "XP is earned through fair, valid wins."],
  ["Wins", "A completed valid board without assistance."],
  ["Daily", "Daily challenges are limited to once per day."],
  ["Offline", "Progress syncs automatically when online."],
  ["Fair Play", "No pay-to-win. Skill only."],
];

export default function ArenaRules() {
  return (
    <ArenaLayout>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>ARENA CODE</Text>
        <Text style={styles.title}>Rules & Fairness</Text>
        <Text style={styles.subtitle}>The competitive layer will be built around clean, skill-first Sudoku play.</Text>
      </View>

      <View style={styles.rulesCard}>
        {RULES.map(([heading, text], index) => (
          <View key={heading} style={[styles.ruleRow, index === RULES.length - 1 && styles.lastRuleRow]}>
            <View style={styles.ruleBadge}>
              <Text style={styles.ruleBadgeText}>{index + 1}</Text>
            </View>
            <View style={styles.ruleCopy}>
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
  heroCard: {
    borderRadius: sweirkiTheme.radius.hero,
    padding: 24,
    marginBottom: 16,
    backgroundColor: sweirkiTheme.colors.glassStrong,
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    ...sweirkiTheme.shadows.hero,
  },
  eyebrow: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 13,
    letterSpacing: 4.5,
    color: sweirkiTheme.colors.cyanDeep,
    marginBottom: 8,
  },
  title: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 34,
    lineHeight: 38,
    color: sweirkiTheme.colors.ink,
  },
  subtitle: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: sweirkiTheme.colors.textSoft,
    marginTop: 8,
  },
  rulesCard: {
    borderRadius: sweirkiTheme.radius.card,
    padding: 18,
    backgroundColor: sweirkiTheme.colors.glassStrong,
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
    ...sweirkiTheme.shadows.glassCard,
  },
  ruleRow: {
    flexDirection: "row",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(91,202,245,0.2)",
  },
  lastRuleRow: {
    borderBottomWidth: 0,
  },
  ruleBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "rgba(53,200,244,0.14)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
  },
  ruleBadgeText: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 15,
    color: sweirkiTheme.colors.cyanDeep,
  },
  ruleCopy: {
    flex: 1,
  },
  ruleHeading: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 18,
    color: sweirkiTheme.colors.ink,
  },
  ruleText: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: sweirkiTheme.colors.textSoft,
    marginTop: 2,
  },
});
