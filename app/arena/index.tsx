import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import ArenaLayout from "./ArenaLayout";
import { sweirkiTheme } from "../theme/sweirkiTheme";

const ARENA_ITEMS = [
  {
    title: "Ranked Arena",
    eyebrow: "Coming soon",
    desc: "Competitive Sudoku seasons, skill ratings, and verified ranked runs.",
    path: "/arena/ranked",
  },
  {
    title: "Rules & Fairness",
    eyebrow: "Arena code",
    desc: "Learn how fair play, no-retry runs, and competitive results will work.",
    path: "/arena/rules",
  },
  {
    title: "Arena History",
    eyebrow: "Future record",
    desc: "Your ranked results, season records, and performance archive will live here.",
    path: "/arena/history",
  },
];

export default function ArenaHub() {
  return (
    <ArenaLayout>
      <View style={styles.heroCard}>
        <View style={styles.heroText}>
          <Text style={styles.eyebrow}>COMPETITIVE HUB</Text>
          <Text style={styles.title}>Arena</Text>
          <Text style={styles.subtitle}>
            Ranked Sudoku competition is being prepared for a future upgrade.
          </Text>
        </View>
        <Image source={sweirkiTheme.assets.iconArena} style={styles.heroIcon} resizeMode="contain" />
      </View>

      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Arena status</Text>
        <Text style={styles.statusTitle}>Pre-season setup</Text>
        <Text style={styles.statusText}>
          The arena is a themed placeholder for now. Matchmaking, seasons, and rankings will arrive later.
        </Text>
      </View>

      <View style={styles.list}>
        {ARENA_ITEMS.map((item) => (
          <Pressable
            key={item.title}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(item.path as any)}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardEyebrow}>{item.eyebrow}</Text>
              <Text style={styles.chevron}>›</Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardDesc}>{item.desc}</Text>
          </Pressable>
        ))}
      </View>
    </ArenaLayout>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    minHeight: 186,
    borderRadius: sweirkiTheme.radius.hero,
    padding: 24,
    marginBottom: 18,
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
    letterSpacing: 5,
    color: sweirkiTheme.colors.cyanDeep,
    marginBottom: 8,
  },
  title: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 26,
    color: sweirkiTheme.colors.ink,
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: sweirkiTheme.colors.textSoft,
    marginTop: 8,
  },
  heroIcon: {
    width: 100,
    height: 100,
  },
  statusCard: {
    borderRadius: sweirkiTheme.radius.card,
    padding: 18,
    marginBottom: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
  },
  statusLabel: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 12,
    letterSpacing: 2.5,
    color: sweirkiTheme.colors.cyanDeep,
    textTransform: "uppercase",
  },
  statusTitle: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 22,
    color: sweirkiTheme.colors.ink,
    marginTop: 4,
  },
  statusText: {
    fontFamily: sweirkiTheme.fonts.regular,
    fontSize: 12,
    lineHeight: 18,
    color: sweirkiTheme.colors.textSoft,
    marginTop: 4,
  },
  list: {
    gap: 12,
  },
  card: {
    borderRadius: sweirkiTheme.radius.card,
    padding: 18,
    backgroundColor: sweirkiTheme.colors.glassStrong,
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyan,
    ...sweirkiTheme.shadows.glassCard,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.86,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardEyebrow: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 12,
    color: sweirkiTheme.colors.cyanDeep,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  chevron: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 28,
    color: sweirkiTheme.colors.cyanDeep,
    lineHeight: 28,
  },
  cardTitle: {
    fontFamily: sweirkiTheme.fonts.bold,
    color: sweirkiTheme.colors.ink,
    fontSize: 22,
  },
  cardDesc: {
    fontFamily: sweirkiTheme.fonts.regular,
    color: sweirkiTheme.colors.textSoft,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
