import React, { useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ACHIEVEMENTS, useAchievementsStore } from "../stores/useAchievementsStore";
import sweirkiTheme from "../theme/sweirkiTheme";

const { colors, fonts, radius, spacing, shadows, assets } = sweirkiTheme;

type AchievementFilter = "all" | "unlocked" | "locked";

export default function AchievementsHub() {
  const [filter, setFilter] = useState<AchievementFilter>("all");
  const [selected, setSelected] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(300)).current;
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const unlocked = useAchievementsStore((s) => s.unlocked);
  const totalPoints = useAchievementsStore((s) => s.getTotalPoints());
  const achievementLevel = useAchievementsStore((s) => s.getLevel());
  const progress = useAchievementsStore((s) => s.getProgressPercent());
  const loadUnlocked = useAchievementsStore((s) => s.loadUnlocked);

  const [sparkle, setSparkle] = useState<string | null>(null);

  React.useEffect(() => {
    loadUnlocked();
  }, [loadUnlocked]);

  React.useEffect(() => {
    if (unlocked.length === 0) return;
    const id = unlocked[unlocked.length - 1];
    setSparkle(id);
    const timer = setTimeout(() => setSparkle(null), 1200);
    return () => clearTimeout(timer);
  }, [unlocked]);

  const filtered = React.useMemo(() => {
    return ACHIEVEMENTS.filter((a) => {
      if (filter === "all") return true;
      if (filter === "unlocked") return unlocked.includes(a.id);
      return !unlocked.includes(a.id);
    });
  }, [filter, unlocked]);

  const unlockedCount = unlocked.length;
  const totalCount = ACHIEVEMENTS.length;
  const safeProgress = Math.max(0, Math.min(100, progress));

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 230,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setModalVisible(false));
  };

  const openModal = (achievement: any) => {
    slideAnim.setValue(300);
    fadeAnim.setValue(0);
    setSelected(achievement);
    setModalVisible(true);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.back(1.08)),
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <View style={styles.screen}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.eyebrow}>ACHIEVEMENT JOURNEY</Text>
            <Text style={styles.title}>Achievements</Text>
            <Text style={styles.subtitle}>
              {achievementLevel} Explorer • {totalPoints} points
            </Text>
          </View>

          <View style={styles.heroIconWrap}>
            <Image source={assets.iconAchievements} style={styles.heroIcon} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.sectionTitle}>Bronze Path</Text>
              <Text style={styles.sectionSubtitle}>
                {unlockedCount} / {totalCount} unlocked
              </Text>
            </View>
            <View style={styles.pointsPill}>
              <Text style={styles.pointsText}>{totalPoints} pts</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${safeProgress}%` }]} />
          </View>
        </View>

        <View style={styles.filtersRow}>
          {(["all", "unlocked", "locked"] as AchievementFilter[]).map((t) => {
            const active = filter === t;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setFilter(t)}
                activeOpacity={0.82}
                style={[styles.filterPill, active && styles.filterPillActive]}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.grid}>
          {filtered.map((a) => {
            const isUnlocked = unlocked.includes(a.id);
            const isSparkling = sparkle === a.id;

            return (
              <TouchableOpacity
                key={a.id}
                activeOpacity={0.86}
                onPress={() => openModal(a)}
                style={[styles.badgeCard, isUnlocked ? styles.badgeUnlocked : styles.badgeLocked]}
              >
                {isSparkling && <View style={styles.sparkleGlow} />}

                <View style={[styles.badgeIconWrap, isUnlocked && styles.badgeIconWrapUnlocked]}>
                  <Text style={[styles.badgeIcon, !isUnlocked && styles.lockedIcon]}>{a.icon}</Text>
                </View>

                <Text numberOfLines={2} style={[styles.badgeTitle, !isUnlocked && styles.lockedText]}>
                  {a.title}
                </Text>

                <View style={[styles.statusPill, isUnlocked ? styles.statusUnlocked : styles.statusLocked]}>
                  <Text style={[styles.statusText, isUnlocked ? styles.statusTextUnlocked : styles.statusTextLocked]}>
                    {isUnlocked ? "Unlocked" : "Locked"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {modalVisible && (
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeModal} />
        </Animated.View>
      )}

      {modalVisible && selected && (
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.sheetHandle} />

          <View style={styles.sheetIconWrap}>
            <Text style={styles.sheetIcon}>{selected.icon}</Text>
          </View>

          <Text style={styles.sheetTitle}>{selected.title}</Text>
          <Text style={styles.sheetStatus}>
            {unlocked.includes(selected.id) ? "Achievement unlocked" : "Achievement locked"}
          </Text>

          <Text style={styles.sheetDesc}>{selected.desc}</Text>

          <View style={styles.unlockBox}>
            <Text style={styles.unlockLabel}>How to unlock</Text>
            <Text style={styles.unlockText}>{selected.how}</Text>
          </View>

          <TouchableOpacity onPress={closeModal} activeOpacity={0.85} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.screen,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: 58,
    paddingBottom: 34,
  },
  heroCard: {
    minHeight: 138,
    borderRadius: radius.hero,
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.borderCyan,
    padding: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...shadows.hero,
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: spacing.md,
  },
  eyebrow: {
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.cyanDeep,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 31,
    color: colors.inkStrong,
    lineHeight: 36,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSoft,
    marginTop: spacing.xs,
  },
  heroIconWrap: {
    width: 82,
    height: 82,
    borderRadius: 26,
    backgroundColor: "rgba(53,200,244,0.12)",
    borderWidth: 1,
    borderColor: colors.borderCyanStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: {
    width: 58,
    height: 58,
  },
  progressCard: {
    marginTop: spacing.lg,
    borderRadius: radius.card,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.borderCyan,
    padding: spacing.lg,
    ...shadows.glassCard,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.ink,
  },
  sectionSubtitle: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textSoft,
    marginTop: 1,
  },
  pointsPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: "rgba(245,185,67,0.17)",
    borderWidth: 1,
    borderColor: "rgba(245,185,67,0.32)",
  },
  pointsText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.inkStrong,
  },
  progressTrack: {
    height: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.progressTrack,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.cyan,
  },
  filtersRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  filterPill: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderCyan,
  },
  filterPillActive: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyanStrong,
  },
  filterText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.text,
  },
  filterTextActive: {
    color: colors.white,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  badgeCard: {
    width: "31.8%",
    minHeight: 128,
    borderRadius: radius.soft,
    paddingHorizontal: 8,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    overflow: "hidden",
  },
  badgeUnlocked: {
    backgroundColor: colors.white,
    borderColor: colors.borderCyanStrong,
  },
  badgeLocked: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: "rgba(125,147,168,0.18)",
  },
  sparkleGlow: {
    position: "absolute",
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    backgroundColor: "rgba(245,185,67,0.20)",
  },
  badgeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "rgba(143,121,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  badgeIconWrapUnlocked: {
    backgroundColor: "rgba(53,200,244,0.13)",
  },
  badgeIcon: {
    fontSize: 23,
  },
  lockedIcon: {
    opacity: 0.44,
  },
  badgeTitle: {
    minHeight: 32,
    fontFamily: fonts.bold,
    fontSize: 12,
    lineHeight: 15,
    textAlign: "center",
    color: colors.inkStrong,
  },
  lockedText: {
    color: colors.textMuted,
  },
  statusPill: {
    marginTop: spacing.xs,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  statusUnlocked: {
    backgroundColor: "rgba(107,229,201,0.20)",
  },
  statusLocked: {
    backgroundColor: "rgba(125,147,168,0.12)",
  },
  statusText: {
    fontFamily: fonts.bold,
    fontSize: 10,
  },
  statusTextUnlocked: {
    color: colors.cyanDeep,
  },
  statusTextLocked: {
    color: colors.textMuted,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.scrim,
    zIndex: 20,
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 30,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.modal,
    borderTopRightRadius: radius.modal,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: colors.borderCyan,
    ...shadows.hero,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: "rgba(125,147,168,0.24)",
    marginBottom: spacing.md,
  },
  sheetIconWrap: {
    alignSelf: "center",
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: "rgba(53,200,244,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  sheetIcon: {
    fontSize: 35,
  },
  sheetTitle: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.inkStrong,
    textAlign: "center",
  },
  sheetStatus: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.cyanDeep,
    textAlign: "center",
    marginTop: 2,
  },
  sheetDesc: {
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 19,
    color: colors.textSoft,
    textAlign: "center",
    marginTop: spacing.md,
  },
  unlockBox: {
    marginTop: spacing.md,
    borderRadius: radius.soft,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderCyan,
    padding: spacing.md,
  },
  unlockLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.ink,
    marginBottom: 3,
  },
  unlockText: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSoft,
  },
  closeButton: {
    height: 52,
    borderRadius: 18,
    backgroundColor: colors.cyan,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
    ...shadows.cta,
  },
  closeButtonText: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.white,
  },
});
