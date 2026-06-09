import { Image, StyleSheet, Text, View } from "react-native";
import ArenaLayout from "./ArenaLayout";
import { sweirkiTheme } from "../theme/sweirkiTheme";

const RANKED_NOTES = [
  "Fixed competitive rules with no retries.",
  "Verified ranked runs only count toward seasons.",
  "Matchmaking and global rankings arrive when Arena opens.",
];

export default function ArenaRanked() {
  return (
    <ArenaLayout>
      <View style={styles.heroCard}>
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>RANKED ARENA</Text>
          <Text style={styles.title}>Season Locked</Text>
          <Text style={styles.subtitle}>
            Competitive Sudoku is staged for a future upgrade.
          </Text>
        </View>
        <Image source={sweirkiTheme.assets.iconArena} style={styles.heroIcon} resizeMode="contain" />
      </View>

      <View style={styles.rankCard}>
        <Text style={styles.rankLabel}>Current rank</Text>
        <Text style={styles.rankTitle}>Unranked</Text>
        <Text style={styles.rankText}>Your Arena rating will unlock when the first competitive season begins.</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>How ranked will work</Text>
        {RANKED_NOTES.map((note, index) => (
          <View key={note} style={styles.noteRow}>
            <View style={styles.noteBadge}>
              <Text style={styles.noteBadgeText}>{index + 1}</Text>
            </View>
            <Text style={styles.noteText}>{note}</Text>
          </View>
        ))}
      </View>
    </ArenaLayout>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    minHeight: 182,
    borderRadius: sweirkiTheme.radius.hero,
    padding: 24,
    marginBottom: 16,
    backgroundColor: sweirkiTheme.colors.glassStrong,
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    flexDirection: "row",
    alignItems: "center",
    ...sweirkiTheme.shadows.hero,
  },
  heroText: {
    flex: 1,
    paddingRight: 10,
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
    fontSize: 35,
    lineHeight: 39,
    color: sweirkiTheme.colors.ink,
  },
  subtitle: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: sweirkiTheme.colors.textSoft,
    marginTop: 8,
  },
  heroIcon: {
    width: 94,
    height: 94,
  },
  rankCard: {
    borderRadius: sweirkiTheme.radius.card,
    padding: 20,
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
    ...sweirkiTheme.shadows.glassCard,
  },
  rankLabel: {
    fontFamily: sweirkiTheme.fonts.bold,
    color: sweirkiTheme.colors.cyanDeep,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  rankTitle: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 34,
    color: sweirkiTheme.colors.ink,
    marginTop: 6,
  },
  rankText: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    color: sweirkiTheme.colors.textSoft,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: sweirkiTheme.radius.card,
    padding: 18,
    backgroundColor: sweirkiTheme.colors.glassStrong,
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
  },
  sectionTitle: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 23,
    color: sweirkiTheme.colors.ink,
    marginBottom: 12,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  noteBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(53,200,244,0.14)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  noteBadgeText: {
    fontFamily: sweirkiTheme.fonts.bold,
    color: sweirkiTheme.colors.cyanDeep,
    fontSize: 15,
  },
  noteText: {
    flex: 1,
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 15,
    lineHeight: 20,
    color: sweirkiTheme.colors.text,
  },
});
