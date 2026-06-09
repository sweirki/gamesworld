import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../firebase";
import { useRevenueCat } from "../src/hooks/useRevenueCat";
import { sweirkiAssets, sweirkiColors, sweirkiFonts, sweirkiLayout, sweirkiRadius, sweirkiShadows, sweirkiSpacing } from "./theme";

type ModeKey = "classic" | "killer" | "hyper" | "x" | "ladder";

type Mode = {
  key: ModeKey;
  title: string;
  eyebrow: string;
  description: string;
  route: string;
  premium: boolean;
  icon: any;
  accent: string;
};

const MODES: Mode[] = [
  {
    key: "classic",
    title: "Classic",
    eyebrow: "Learn & Play",
    description: "Clean boards, pure focus, daily progress.",
    route: "/sudoku",
    premium: false,
    icon: require("../assets/branding/modes/classic-mode.png"),
    accent: sweirkiColors.cyan,
  },
  {
    key: "killer",
    title: "Killer",
    eyebrow: "Strategic",
    description: "Cages, sums, and sharper decisions.",
    route: "/killerSudoku",
    premium: true,
    icon: require("../assets/branding/modes/killer-mode.png"),
    accent: sweirkiColors.gold,
  },
  {
    key: "hyper",
    title: "Hyper",
    eyebrow: "Advanced",
    description: "Extra regions for deeper mastery.",
    route: "/hyperSudoku",
    premium: true,
    icon: require("../assets/branding/modes/hyper-mode.png"),
    accent: sweirkiColors.purple,
  },
  {
    key: "x",
    title: "X Sudoku",
    eyebrow: "Diagonal",
    description: "Two diagonals. One elegant challenge.",
    route: "/xSudoku",
    premium: true,
    icon: require("../assets/branding/modes/x-mode.png"),
    accent: sweirkiColors.aqua,
  },
  {
    key: "ladder",
    title: "Ladder Mode",
    eyebrow: "Progression",
    description: "Climb through levels and prove consistency.",
    route: "/leaderboard",
    premium: false,
    icon: require("../assets/branding/modes/ladder-mode.png"),
    accent: sweirkiColors.cyanDeep,
  },
];

export default function VariantHub() {
  const { isPremium } = useRevenueCat();
  const router = useRouter();
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Player");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/login");
      }
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    AsyncStorage.getItem("lastPlayedMode").then(setLastPlayed);
    AsyncStorage.getItem("username").then((name) => {
      if (name) setUserName(name);
    });
  }, []);

  const handlePress = async (mode: Mode) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (mode.premium && !isPremium) {
      router.push("/upgrade");
      return;
    }

    await AsyncStorage.setItem("lastPlayedMode", mode.key);
    router.push(mode.route);
  };

  const firstInitial = userName[0]?.toUpperCase() ?? "P";

  return (
    <View style={styles.root}>
      <ImageBackground source={sweirkiAssets.homeBackground} style={styles.background} resizeMode="cover">
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.shell}>
            <View style={styles.header}>
              <Pressable style={styles.profileButton} onPress={() => router.push("/profile")}> 
                <LinearGradient
                  colors={["rgba(255,255,255,0.98)", "rgba(231,250,255,0.92)"]}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarText}>{firstInitial}</Text>
                </LinearGradient>
                <View>
                  <Text style={styles.welcomeText}>Ready,</Text>
                  <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
                </View>
              </Pressable>

              <Pressable style={styles.settingsButton} onPress={() => router.push("/settings")}> 
                <Text style={styles.settingsIcon}>⚙</Text>
              </Pressable>
            </View>

            <View style={styles.heroCard}>
              <View style={styles.heroCopy}>
                <Text style={styles.kicker}>SWEIRKI MODES</Text>
                <Text style={styles.title}>Choose Your Challenge</Text>
                <Text style={styles.subtitle}>5 Sudoku experiences, one mastery journey.</Text>
              </View>
              <Image source={sweirkiAssets.iconModes} style={styles.heroIcon} resizeMode="contain" />
            </View>

            <View style={styles.grid}>
              <View style={styles.row}>
                <ModeCard mode={MODES[0]} isPremium={isPremium} lastPlayed={lastPlayed} onPress={handlePress} />
                <ModeCard mode={MODES[1]} isPremium={isPremium} lastPlayed={lastPlayed} onPress={handlePress} />
              </View>

              <View style={styles.row}>
                <ModeCard mode={MODES[2]} isPremium={isPremium} lastPlayed={lastPlayed} onPress={handlePress} />
                <ModeCard mode={MODES[3]} isPremium={isPremium} lastPlayed={lastPlayed} onPress={handlePress} />
              </View>

              <ModeCard mode={MODES[4]} isPremium={isPremium} lastPlayed={lastPlayed} onPress={handlePress} wide />
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

function ModeCard({
  mode,
  isPremium,
  lastPlayed,
  onPress,
  wide = false,
}: {
  mode: Mode;
  isPremium: boolean;
  lastPlayed: string | null;
  onPress: (mode: Mode) => void;
  wide?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const locked = mode.premium && !isPremium;
  const isLastPlayed = lastPlayed === mode.key && mode.key !== "ladder";

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 7,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[styles.cardMotion, wide && styles.wideMotion, { transform: [{ scale }] }]}>
      <Pressable onPress={() => onPress(mode)} onPressIn={onPressIn} onPressOut={onPressOut}>
        <LinearGradient
          colors={wide ? ["rgba(255,255,255,0.98)", "rgba(232,249,255,0.94)"] : sweirkiColors.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.modeCard, wide && styles.wideCard, isLastPlayed && styles.lastPlayedCard]}
        >
          <View style={[styles.accentDot, { backgroundColor: mode.accent }]} />

          <View style={[styles.iconPlate, wide && styles.wideIconPlate]}>
            <Image source={mode.icon} style={[styles.modeIcon, locked && styles.lockedIcon]} resizeMode="contain" />
          </View>

          <View style={[styles.modeTextWrap, wide && styles.wideTextWrap]}>
            <Text style={styles.modeEyebrow}>{mode.eyebrow}</Text>
            <Text style={styles.modeTitle}>{mode.title}</Text>
            <Text style={styles.modeDescription}>{mode.description}</Text>
          </View>

          <View style={styles.badgeRow}>
            {isLastPlayed && <Text style={styles.lastPlayedBadge}>Last played</Text>}
            {locked && <Text style={styles.lockBadge}>Premium</Text>}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: sweirkiColors.screen,
  },
  background: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 34,
  },
  shell: {
    width: sweirkiLayout.contentWidth,
  },
  header: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  profileButton: {
    maxWidth: "76%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyanStrong,
    ...sweirkiShadows.splashBadge,
  },
  avatarText: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 20,
    color: sweirkiColors.inkStrong,
    marginTop: -1,
  },
  welcomeText: {
    fontFamily: sweirkiFonts.regular,
    fontSize: 12,
    lineHeight: 16,
    color: sweirkiColors.textSoft,
  },
  userName: {
    maxWidth: 190,
    fontFamily: sweirkiFonts.bold,
    fontSize: 18,
    lineHeight: 22,
    color: sweirkiColors.inkStrong,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: sweirkiColors.glassStrong,
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyan,
    ...sweirkiShadows.splashBadge,
  },
  settingsIcon: {
    fontSize: 20,
    color: sweirkiColors.inkStrong,
  },
  heroCard: {
    minHeight: 112,
    borderRadius: sweirkiRadius.hero,
    padding: 12,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: sweirkiColors.glassStrong,
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyanStrong,
    overflow: "hidden",
    ...sweirkiShadows.hero,
  },
  heroCopy: {
    flex: 1,
    paddingRight: 10,
  },
  kicker: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 11,
    letterSpacing: 1.6,
    color: sweirkiColors.cyanDeep,
    marginBottom: 4,
  },
  title: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 25,
    lineHeight: 29,
    color: sweirkiColors.inkStrong,
  },
  subtitle: {
    marginTop: 5,
    fontFamily: sweirkiFonts.regular,
    fontSize: 13,
    lineHeight: 17,
    color: sweirkiColors.textSoft,
  },
  heroIcon: {
    width: 124,
    height: 124,
    marginRight: -10,
  },
  grid: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  cardMotion: {
    flex: 1,
  },
  wideMotion: {
    flex: 0,
    width: "100%",
  },
  modeCard: {
    minHeight: 160,
    borderRadius: sweirkiRadius.card,
    padding: 10,
    backgroundColor: sweirkiColors.glassStrong,
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyan,
    overflow: "hidden",
    ...sweirkiShadows.glassCard,
  },
  wideCard: {
    minHeight: 118,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  lastPlayedCard: {
    borderColor: sweirkiColors.cyanStrong,
  },
  accentDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    opacity: 0.75,
  },
  iconPlate: {
    alignSelf: "center",
    width: 92,
    height: 78,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 5,
    backgroundColor: "rgba(255,255,255,0.58)",
    borderWidth: 1,
    borderColor: "rgba(91,202,245,0.18)",
  },
  wideIconPlate: {
    width: 98,
    height: 90,
    marginTop: 0,
    marginBottom: 0,
    marginRight: 12,
  },
  modeIcon: {
    width: 88,
    height: 88,
  },
  lockedIcon: {
    opacity: 0.52,
  },
  modeTextWrap: {
    flex: 1,
  },
  wideTextWrap: {
    paddingRight: 4,
  },
  modeEyebrow: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: sweirkiColors.cyanDeep,
    marginBottom: 2,
  },
  modeTitle: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 19,
    lineHeight: 22,
    color: sweirkiColors.inkStrong,
  },
  modeDescription: {
    marginTop: 4,
    fontFamily: sweirkiFonts.regular,
    fontSize: 11.5,
    lineHeight: 14,
    color: sweirkiColors.textSoft,
  },
  badgeRow: {
    minHeight: 21,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  lastPlayedBadge: {
    overflow: "hidden",
    borderRadius: sweirkiRadius.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(53,200,244,0.12)",
    fontFamily: sweirkiFonts.bold,
    fontSize: 10,
    color: sweirkiColors.cyanDeep,
  },
  lockBadge: {
    overflow: "hidden",
    borderRadius: sweirkiRadius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "rgba(245,185,67,0.22)",
    borderWidth: 1,
    borderColor: "rgba(245,185,67,0.28)",
    fontFamily: sweirkiFonts.bold,
    fontSize: 10.5,
    color: "#A86F05",
  },
});
