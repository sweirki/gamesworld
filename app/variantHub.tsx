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
import { sweirkiAssets, sweirkiColors, sweirkiFonts, sweirkiLayout, sweirkiRadius, sweirkiShadows } from "./theme";
import AppBackButton from "./components/AppBackButton";

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
  softAccent: string;
  cardGradient: readonly [string, string];
  iconGradient: readonly [string, string];
};

const MODES: Mode[] = [
  {
    key: "classic",
    title: "Classic",
    eyebrow: "Learn & Play",
    description: "Daily Sudoku",
    route: "/sudoku",
    premium: false,
    icon: require("../assets/branding/modes/classic-mode.png"),
    accent: sweirkiColors.cyanDeep,
    softAccent: "rgba(53,200,244,0.22)",
    cardGradient: ["rgba(255,255,255,0.99)", "rgba(232,249,255,0.96)"],
    iconGradient: ["rgba(255,255,255,0.98)", "rgba(215,246,255,0.9)"],
  },
  {
    key: "killer",
    title: "Killer",
    eyebrow: "Strategic",
    description: "Strategic cage puzzles",
    route: "/killerSudoku",
    premium: true,
    icon: require("../assets/branding/modes/killer-mode.png"),
    accent: sweirkiColors.gold,
    softAccent: "rgba(245,185,67,0.28)",
    cardGradient: ["rgba(255,255,255,0.99)", "rgba(255,247,225,0.94)"],
    iconGradient: ["rgba(255,255,255,0.98)", "rgba(255,237,181,0.88)"],
  },
  {
    key: "hyper",
    title: "Hyper",
    eyebrow: "Advanced",
    description: "Extra-region challenge",
    route: "/hyperSudoku",
    premium: true,
    icon: require("../assets/branding/modes/hyper-mode.png"),
    accent: sweirkiColors.purple,
    softAccent: "rgba(143,112,255,0.24)",
    cardGradient: ["rgba(255,255,255,0.99)", "rgba(243,239,255,0.95)"],
    iconGradient: ["rgba(255,255,255,0.98)", "rgba(231,224,255,0.9)"],
  },
  {
    key: "x",
    title: "X Sudoku",
    eyebrow: "Diagonal",
    description: "Diagonal mastery",
    route: "/xSudoku",
    premium: true,
    icon: require("../assets/branding/modes/x-mode.png"),
    accent: sweirkiColors.aqua,
    softAccent: "rgba(56,218,195,0.24)",
    cardGradient: ["rgba(255,255,255,0.99)", "rgba(226,251,248,0.95)"],
    iconGradient: ["rgba(255,255,255,0.98)", "rgba(205,248,242,0.9)"],
  },
  {
    key: "ladder",
    title: "Ladder Mode",
    eyebrow: "Progression",
    description: "Climb levels. Prove consistency.",
    route: "/leaderboard",
    premium: false,
    icon: require("../assets/branding/modes/ladder-mode.png"),
    accent: sweirkiColors.cyanDeep,
    softAccent: "rgba(53,200,244,0.24)",
    cardGradient: ["rgba(255,255,255,0.99)", "rgba(229,248,255,0.96)"],
    iconGradient: ["rgba(255,255,255,0.98)", "rgba(219,246,255,0.92)"],
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
        <AppBackButton />
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
              <View style={styles.heroGlow} />
              <View style={styles.heroCopy}>
                <Text style={styles.kicker}>SWEIRKI MODES</Text>
                <Text style={styles.title}>Choose Your Challenge</Text>
                <Text style={styles.subtitle}>5 modes. One mastery path.</Text>
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
          colors={mode.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.modeCard,
            wide && styles.wideCard,
            isLastPlayed && styles.lastPlayedCard,
            { borderColor: isLastPlayed ? sweirkiColors.cyanStrong : mode.softAccent },
          ]}
        >
          <View style={[styles.cardWash, { backgroundColor: mode.softAccent }]} />

          <LinearGradient colors={mode.iconGradient} style={[styles.iconPlate, wide && styles.wideIconPlate]}>
            <View style={[styles.iconGlow, { backgroundColor: mode.softAccent }]} />
            <Image source={mode.icon} style={[styles.modeIcon, wide && styles.wideModeIcon, locked && styles.lockedIcon]} resizeMode="contain" />
          </LinearGradient>

          <View style={[styles.modeTextWrap, wide && styles.wideTextWrap]}>
            <Text style={[styles.modeEyebrow, { color: mode.accent }]}>{mode.eyebrow}</Text>
            <Text style={[styles.modeTitle, wide && styles.wideTitle]}>{mode.title}</Text>
            <Text style={[styles.modeDescription, wide && styles.wideDescription]}>{mode.description}</Text>

            <View style={styles.badgeRow}>
              {isLastPlayed && <Text style={styles.lastPlayedBadge}>Last played</Text>}
              {locked && <Text style={styles.lockBadge}>★ Premium</Text>}
            </View>
          </View>

          {wide && (
            <View style={styles.arrowButton}>
              <Text style={styles.arrowText}>›</Text>
            </View>
          )}
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
    paddingTop: 59,
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
    minHeight: 132,
    borderRadius: sweirkiRadius.hero,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 14,
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
  heroGlow: {
    position: "absolute",
    right: -22,
    top: -12,
    width: 164,
    height: 164,
    borderRadius: 82,
    backgroundColor: "rgba(53,200,244,0.1)",
  },
  heroCopy: {
    flex: 1,
    paddingRight: 6,
  },
  kicker: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 11,
    letterSpacing: 2.2,
    color: sweirkiColors.cyanDeep,
    marginBottom: 7,
  },
  title: {
    maxWidth: 218,
    fontFamily: sweirkiFonts.bold,
    fontSize: 28,
    lineHeight: 33,
    color: sweirkiColors.inkStrong,
  },
  subtitle: {
    maxWidth: 190,
    marginTop: 8,
    fontFamily: sweirkiFonts.regular,
    fontSize: 14,
    lineHeight: 19,
    color: sweirkiColors.textSoft,
  },
  heroIcon: {
    width: 146,
    height: 146,
    marginRight: -14,
    marginBottom: -8,
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
    height: 190,
    borderRadius: sweirkiRadius.card,
    paddingHorizontal: 10,
    paddingTop: 13,
    paddingBottom: 10,
    backgroundColor: sweirkiColors.glassStrong,
    borderWidth: 1,
    overflow: "hidden",
    ...sweirkiShadows.glassCard,
  },
  wideCard: {
    minHeight: 108,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 12,
  },
  lastPlayedCard: {
    borderWidth: 1.5,
  },
  cardWash: {
    position: "absolute",
    right: -30,
    bottom: -34,
    width: 108,
    height: 108,
    borderRadius: 54,
    opacity: 0.52,
  },
  iconPlate: {
    alignSelf: "flex-start",
    width: 88,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.86)",
    ...sweirkiShadows.splashBadge,
  },
  wideIconPlate: {
    width: 104,
    height: 86,
    marginBottom: 0,
    marginRight: 14,
  },
  iconGlow: {
    position: "absolute",
    width: 72,
    height: 42,
    borderRadius: 22,
    opacity: 0.75,
  },
  modeIcon: {
    width: 104,
    height: 104,
  },
  wideModeIcon: {
    width: 118,
    height: 118,
  },
  lockedIcon: {
    opacity: 0.58,
  },
  modeTextWrap: {
    flex: 1,
  },
  wideTextWrap: {
    paddingRight: 6,
  },
  modeEyebrow: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 10,
    letterSpacing: 1.45,
    textTransform: "uppercase",
    marginBottom: 3,
    opacity: 0.92,
  },
  modeTitle: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 20,
    lineHeight: 23,
    color: sweirkiColors.inkStrong,
  },
  wideTitle: {
    fontSize: 21,
    lineHeight: 25,
  },
  modeDescription: {
    marginTop: 5,
    fontFamily: sweirkiFonts.regular,
    fontSize: 12,
    lineHeight: 15,
    color: sweirkiColors.textSoft,
  },
  wideDescription: {
    fontSize: 12.5,
    lineHeight: 16,
  },
  badgeRow: {
    minHeight: 19,
    marginTop: 7,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "rgba(255,244,213,0.9)",
    borderWidth: 1,
    borderColor: "rgba(245,185,67,0.52)",
    fontFamily: sweirkiFonts.bold,
    fontSize: 10,
    color: "#A86F05",
  },
  arrowButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: sweirkiColors.borderCyan,
    ...sweirkiShadows.splashBadge,
  },
  arrowText: {
    marginTop: -3,
    fontFamily: sweirkiFonts.bold,
    fontSize: 36,
    lineHeight: 40,
    color: sweirkiColors.cyanDeep,
  },
});

