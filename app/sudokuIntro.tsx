import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Image,
  Dimensions,
  Modal,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import { getXpMultiplier } from "../src/analytics/playerAnalytics";
import { useRevenueCat } from "../src/hooks/useRevenueCat";
import { useProgression } from "../hooks/useProgression";

const { width } = Dimensions.get("window");
const CONTENT_WIDTH = Math.min(400, width * 0.92);
const CTA_WIDTH = Math.min(330, width * 0.84);

const HOME_BG = require("../assets/branding/home-background.png");
const ICON_MODES = require("../assets/branding/icon-modes.png");
const ICON_ARENA = require("../assets/branding/icon-arena.png");
const ICON_ACHIEVEMENTS = require("../assets/branding/icon-achievements.png");
const TIER_STANDARD = require("../assets/branding/tier-standard-light-transparent.png");
const TIER_PREMIUM = require("../assets/branding/tier-premium-light.png");

function dailyKey(key: string) {
  const uid = auth.currentUser?.uid || "guest";
  return `${key}:${uid}`;
}

type DepthItem = {
  label: string;
  path: string;
  image: number;
  accent: string;
};

const DEPTH_ITEMS: DepthItem[] = [
  {
    label: "Multiple Modes",
    path: "/variantHub",
    image: ICON_MODES,
    accent: "#28C7F3",
  },
  {
    label: "Arena",
    path: "/arena",
    image: ICON_ARENA,
    accent: "#8F79FF",
  },
  {
    label: "Achievements",
    path: "/achievements",
    image: ICON_ACHIEVEMENTS,
    accent: "#F5B943",
  },
];


export default function SudokuIntro() {
  const router = useRouter();
  const { isPremium } = useRevenueCat();
  const progression = useProgression();

  const [nextDailyCountdown, setNextDailyCountdown] = useState<string | null>(null);
  const [dailyLockedVisible, setDailyLockedVisible] = useState(false);
  const [isGuest, setIsGuest] = useState(true);
  const [dailyStatus, setDailyStatus] = useState<string | null>(null);
  const [weeklyStatus, setWeeklyStatus] = useState<string | null>(null);
  const [progressHint, setProgressHint] = useState<string | null>(null);
  const [activityStreakLine, setActivityStreakLine] = useState<string | null>(null);

  const go = (path: string) => router.push(path as any);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/login");
        return;
      }
      setIsGuest(false);
    });

    return unsubscribe;
  }, [router]);

  useEffect(() => {
    (async () => {
      const name = (await AsyncStorage.getItem("username")) || null;
      const current = auth.currentUser;
      setIsGuest(!(current?.email || name));
    })();
  }, []);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);

      const diff = tomorrow.getTime() - now.getTime();
      if (diff <= 0) return;

      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      setNextDailyCountdown(
        `Next Daily in ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;

      requestAnimationFrame(() => {
        if (!active) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);

        (async () => {
          try {
            const today = new Date().toISOString().split("T")[0];
            const played = await AsyncStorage.getItem(dailyKey("dailyPlayed"));
            const streak = await AsyncStorage.getItem(dailyKey("dailyStreak"));

            if (!active) return;

            if (played === today) {
              setDailyStatus("Daily completed — streak continues");
            } else if (streak && parseInt(streak, 10) > 0) {
              setDailyStatus(`${streak}-day Daily streak`);
            } else {
              setDailyStatus("Today's Daily Challenge is ready");
            }
          } catch {
            if (active) setDailyStatus(null);
          }

          try {
            const { mult, streak } = await getXpMultiplier();

            if (!active) return;

            if (streak > 0) {
              setActivityStreakLine(`${streak}-day Activity Streak · x${mult.toFixed(2)} XP`);
            } else {
              setActivityStreakLine("Start a streak to earn XP boosts");
            }
          } catch {
            if (active) setActivityStreakLine(null);
          }

          try {
            const weeklyGames = await AsyncStorage.getItem(dailyKey("weeklyGames"));

            if (!active) return;

            if (weeklyGames && parseInt(weeklyGames, 10) > 0) {
              setWeeklyStatus(`Weekly standing updated · ${weeklyGames} games`);
            } else {
              setWeeklyStatus("New week — climb the ladder");
            }
          } catch {
            if (active) setWeeklyStatus(null);
          }

          try {
            const p = progression as any;

            if (!active) return;

            if (p?.nextTier != null && p?.tier != null) {
              setProgressHint(`Next rank: ${p.nextTier as string}`);
            } else {
              setProgressHint(null);
            }
          } catch {
            if (active) setProgressHint(null);
          }
        })();
      });

      return () => {
        active = false;
      };
    }, [progression])
  );

  const handleContinue = async () => {
    const today = new Date().toISOString().split("T")[0];
    const played = await AsyncStorage.getItem(dailyKey("dailyPlayed"));

    if (played !== today) {
      go("/daily");
    } else {
      go("/variantHub");
    }
  };

  const handleDailyButton = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);

    if (isGuest) {
      go("/login");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const played = await AsyncStorage.getItem(dailyKey("dailyPlayed"));

    if (played === today) {
      setDailyLockedVisible(true);
      return;
    }

    go("/daily");
  };

  return (
    <View style={styles.root}>
      <ImageBackground source={HOME_BG} style={styles.bg} resizeMode="cover">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.brandBlock}>
            <Text style={styles.brandTitle}>Sweirki Sudoku</Text>
            <Text style={styles.brandSubline}>A brighter way to play every day</Text>
          </View>

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>
              {dailyStatus ?? "Today counts toward your league journey"}
            </Text>
            {weeklyStatus && !dailyStatus?.includes("completed") && !dailyStatus?.includes("streak") ? (
              <Text style={styles.statusSub}>{weeklyStatus}</Text>
            ) : null}
            {progressHint && !dailyStatus?.includes("completed") && !dailyStatus?.includes("streak") ? (
              <Text style={styles.statusSub}>{progressHint}</Text>
            ) : null}
            {activityStreakLine ? (
              <Text style={styles.streakText}>{activityStreakLine}</Text>
            ) : null}
            {dailyStatus?.includes("completed") && nextDailyCountdown ? (
              <Text style={styles.statusSub}>{nextDailyCountdown}</Text>
            ) : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleDailyButton}
            style={styles.dailyFeatureTouchable}
          >
            <LinearGradient
              colors={["rgba(255,255,255,0.96)", "rgba(231,250,255,0.94)", "rgba(243,239,255,0.92)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.dailyFeatureCard}
            >
              <View style={styles.dailyCopy}>
                <Text style={styles.kicker}>FEATURED TODAY</Text>
                <Text style={styles.dailyTitle}>Daily Challenge</Text>
                <Text style={styles.dailyDescription}>
                  Tap to solve today's board, protect your streak, and keep climbing.
                </Text>
              </View>

              <View style={styles.dailyMarkWrap}>
                <View style={styles.dailyRing}>
                  <Text style={styles.dailyCrystal}>◆</Text>
                </View>
                <Text style={styles.dailyArrow}>›</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.secondaryButtons}>
            <TouchableOpacity
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
                isGuest ? go("/login") : go("/variantHub");
              }}
              activeOpacity={0.82}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Start a New Game</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.depthStrip}>
            {DEPTH_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.depthItem, isGuest && styles.disabledItem]}
                activeOpacity={isGuest ? 1 : 0.78}
                disabled={isGuest}
                onPress={async () => {
                  if (isGuest) return;
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
                  go(item.path);
                }}
              >
                <View style={[styles.depthImageShell, { shadowColor: item.accent }]}>
                  <Image source={item.image} style={styles.depthImage} />
                </View>
                <Text style={styles.depthLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!isGuest ? (
            <View style={styles.tierSection}>
              <View style={styles.tierBadgeGlow}>
                <Image
                  source={isPremium ? TIER_PREMIUM : TIER_STANDARD}
                  style={isPremium ? styles.tierBadgePremium : styles.tierBadgeStandard}
                />
              </View>
              <Text style={styles.tierLabel}>{isPremium ? "PREMIUM" : "STANDARD"}</Text>
            </View>
          ) : null}
        </ScrollView>
      </ImageBackground>

      <Modal
        transparent
        visible={dailyLockedVisible}
        animationType="fade"
        onRequestClose={() => setDailyLockedVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Daily Complete</Text>
            <Text style={styles.modalBody}>
              You already completed today's Daily Challenge.{"\n"}Come back tomorrow for a new board.
            </Text>
            <TouchableOpacity
              onPress={() => setDailyLockedVisible(false)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#35C8F4", "#6BE5C9"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.modalButton}
              >
                <Text style={styles.modalButtonText}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F6FBFF",
  },
  bg: {
    flex: 1,
  },
  scroll: {
    alignItems: "center",
    paddingTop: 92,
    paddingBottom: 56,
  },
  brandBlock: {
    width: CONTENT_WIDTH,
    alignItems: "center",
    marginBottom: 18,
  },
  brandTitle: {
    fontFamily: "BalooBold",
    fontSize: 36,
    color: "#14385F",
    textAlign: "center",
    letterSpacing: 0.2,
    textShadowColor: "rgba(255,255,255,0.9)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 2 },
  },
  brandSubline: {
    marginTop: -2,
    fontFamily: "BalooRegular",
    fontSize: 13,
    color: "#6C8AA6",
    textAlign: "center",
  },
  statusCard: {
    width: CONTENT_WIDTH,
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(91,202,245,0.28)",
    shadowColor: "#61D0F7",
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  statusTitle: {
    fontFamily: "BalooBold",
    fontSize: 16,
    color: "#163A5F",
    textAlign: "center",
    lineHeight: 20,
  },
  statusSub: {
    marginTop: 4,
    fontFamily: "BalooRegular",
    fontSize: 12,
    color: "#7D93A8",
    textAlign: "center",
  },
  streakText: {
    marginTop: 7,
    fontFamily: "BalooBold",
    fontSize: 13,
    color: "#248DCE",
    textAlign: "center",
  },
  dailyFeatureTouchable: {
    width: CONTENT_WIDTH,
    marginTop: 14,
    borderRadius: 25,
    shadowColor: "#39BFEF",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  dailyFeatureCard: {
    width: "100%",
    minHeight: 142,
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(91,202,245,0.28)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  dailyCopy: {
    flex: 1,
    paddingRight: 12,
    zIndex: 2,
  },
  kicker: {
    fontSize: 11,
    fontWeight: "900",
    color: "#2EB9E9",
    letterSpacing: 1.7,
    marginBottom: 4,
  },
  dailyTitle: {
    fontFamily: "BalooBold",
    fontSize: 29,
    lineHeight: 32,
    color: "#14385F",
  },
  dailyDescription: {
    marginTop: 5,
    fontFamily: "BalooRegular",
    fontSize: 13,
    lineHeight: 18,
    color: "#7891A8",
  },
  dailyMarkWrap: {
    width: 104,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 4,
    paddingRight: 22,
  },
  dailyRing: {
    width: 66,
    height: 66,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(53,200,244,0.32)",
    shadowColor: "#35C8F4",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
  },
  dailyCrystal: {
    fontSize: 34,
    color: "#35C8F4",
    textShadowColor: "rgba(245,185,67,0.55)",
    textShadowRadius: 8,
  },
  dailyArrow: {
    position: "absolute",
    right: -8,
    fontSize: 34,
    color: "#53A8D6",
    fontWeight: "800",
  },
  secondaryButtons: {
    width: CTA_WIDTH,
    gap: 12,
    marginTop: 16,
    marginBottom: 18,
  },
  secondaryButton: {
    height: 48,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(90,196,235,0.36)",
    backgroundColor: "rgba(255,255,255,0.78)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#2C587D",
    fontSize: 13,
    fontWeight: "800",
  },
  depthStrip: {
    width: CONTENT_WIDTH,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.84)",
    borderWidth: 1,
    borderColor: "rgba(91,202,245,0.28)",
    shadowColor: "#5CCDF3",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  depthItem: {
    flex: 1,
    alignItems: "center",
  },
  disabledItem: {
    opacity: 0.45,
  },
  depthImageShell: {
    width: 110,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
  depthImage: {
    width: 104,
    height: 82,
    resizeMode: "contain",
  },
  depthLabel: {
    color: "#245073",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  tierSection: {
    alignItems: "center",
    marginTop: 16,
  },
  tierBadgeGlow: {
    width: 184,
    height: 126,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#35C8F4",
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
  },
  tierBadgeStandard: {
    width: 182,
    height: 122,
    resizeMode: "contain",
  },
  tierBadgePremium: {
    width: 118,
    height: 104,
    resizeMode: "contain",
  },
  tierLabel: {
    marginTop: -4,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2.2,
    color: "#41627E",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,45,75,0.36)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 330,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 26,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(91,202,245,0.32)",
  },
  modalTitle: {
    fontFamily: "BalooBold",
    fontSize: 22,
    color: "#14385F",
    marginBottom: 8,
    textAlign: "center",
  },
  modalBody: {
    fontFamily: "BalooRegular",
    fontSize: 14,
    lineHeight: 20,
    color: "#6F879B",
    textAlign: "center",
    marginBottom: 18,
  },
  modalButton: {
    minWidth: 126,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
});
