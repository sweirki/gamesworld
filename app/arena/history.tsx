import { Image, StyleSheet, Text, View } from "react-native";
import ArenaLayout from "./ArenaLayout";
import { sweirkiTheme } from "../theme/sweirkiTheme";

export default function ArenaHistory() {
  return (
    <ArenaLayout>
      <View style={styles.heroCard}>
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>ARENA RECORD</Text>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Ranked results and season runs will appear here.</Text>
        </View>
        <Image source={sweirkiTheme.assets.iconAchievements} style={styles.heroIcon} resizeMode="contain" />
      </View>

      <View style={styles.emptyCard}>
        <View style={styles.emptyIcon}>
          <Text style={styles.emptyIconText}>0</Text>
        </View>
        <Text style={styles.emptyTitle}>No arena runs yet</Text>
        <Text style={styles.emptyText}>
          Your competitive match history will activate when Arena seasons launch.
        </Text>
      </View>
    </ArenaLayout>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    minHeight: 178,
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
    fontSize: 42,
    color: sweirkiTheme.colors.ink,
    lineHeight: 46,
  },
  subtitle: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 16,
    lineHeight: 22,
    color: sweirkiTheme.colors.textSoft,
    marginTop: 8,
  },
  heroIcon: {
    width: 92,
    height: 92,
  },
  emptyCard: {
    borderRadius: sweirkiTheme.radius.card,
    padding: 22,
    backgroundColor: sweirkiTheme.colors.glassStrong,
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
    alignItems: "center",
    ...sweirkiTheme.shadows.glassCard,
  },
  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(53,200,244,0.14)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    marginBottom: 14,
  },
  emptyIconText: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 34,
    color: sweirkiTheme.colors.cyanDeep,
  },
  emptyTitle: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 24,
    color: sweirkiTheme.colors.ink,
  },
  emptyText: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    color: sweirkiTheme.colors.textSoft,
    marginTop: 6,
  },
});
