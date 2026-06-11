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
const CONTENT_WIDTH = Math.min(402, width * 0.92);

const HOME_BG = require("../assets/branding/home-background.png");
const ICON_DAILY = require("./assets/home/daily-hero.png");
const ICON_MODES = require("./assets/home/modes-hub.png");
const ICON_ARENA = require("./assets/home/arena-hub.png");
const ICON_ACHIEVEMENTS = require("./assets/home/achievements-hub.png");
const TIER_STANDARD = require("../assets/branding/tier-standard-light-transparent.png");
const TIER_PREMIUM = require("../assets/branding/tier-premium-light.png");

function dailyKey(key: string) {
  const uid = auth.currentUser?.uid || "guest";
  return `${key}:${uid}`;
}

type HubItem = {
  label: string;
  subtitle: string;
  path: string;
  image: number;
  accent: string;
};

const HUB_ITEMS: HubItem[] = [
  {
    label: "Modes",
    subtitle: "Classic, Hyper, Killer, X",
    path: "/variantHub",
    image: ICON_MODES,
    accent: "#27C7F4",
  },
  {
    label: "Arena",
    subtitle: "Competition hub",
    path: "/arena",
    image: ICON_ARENA,
    accent: "#8E79FF",
  },
  {
    label: "Achievements",
    subtitle: "Badges and progress",
    path: "/achievements",
    image: ICON_ACHIEVEMENTS,
    accent: "#F4B844",
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
              setDailyStatus("Daily complete");
            } else if (streak && parseInt(streak, 10) > 0) {
              setDailyStatus(`${streak}-day streak ready`);
            } else {
              setDailyStatus("Today's board is ready");
            }
          } catch {
            if (active) setDailyStatus(null);
          }

          try {
            const { mult, streak } = await getXpMultiplier();

            if (!active) return;

            if (streak > 0) {
              setActivityStreakLine(`${streak}-day Activity Streak  x${mult.toFixed(2)} XP`);
            } else {
              setActivityStreakLine("Start a streak and boost your XP");
            }
          } catch {
            if (active) setActivityStreakLine(null);
          }

          try {
            const weeklyGames = await AsyncStorage.getItem(dailyKey("weeklyGames"));

            if (!active) return;

            if (weeklyGames && parseInt(weeklyGames, 10) > 0) {
              setWeeklyStatus(`Weekly standing updated  ${weeklyGames} games`);
            } else {
              setWeeklyStatus("New week. Climb the ladder.");
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

  const openHubItem = async (path: string) => {
    if (isGuest) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    go(path);
  };

  const dailyComplete = dailyStatus === "Daily complete";
  const tierLabel = isPremium ? "PREMIUM LEAGUE" : "STANDARD LEAGUE";

  return (
    <View style={styles.root}>
      <ImageBackground source={HOME_BG} style={styles.bg} resizeMode="cover">
        <LinearGradient
          pointerEvents="none"
          colors={["rgba(248,253,255,0.72)", "rgba(255,255,255,0.46)", "rgba(222,244,255,0.62)"]}
          locations={[0, 0.48, 1]}
          style={styles.bgMuteLayer}
        />
        <View pointerEvents="none" style={styles.bgTopGlow} />
        <View pointerEvents="none" style={styles.bgMiddleWash} />
        <View pointerEvents="none" style={styles.bgBottomLift} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.topBlock}>
            <Text style={styles.eyebrow}>PLAY TODAY</Text>
            <Text style={styles.brandTitle}>Sweirki Sudoku</Text>
            <Text style={styles.brandSubline}>A brighter daily Sudoku ritual</Text>
          </View>

          <TouchableOpacity activeOpacity={0.9} onPress={handleDailyButton} style={styles.heroTouch}>
            <LinearGradient
              colors={["rgba(255,255,255,0.98)", "rgba(223,248,255,0.96)", "rgba(239,235,255,0.94)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroCard}
            >
              <View style={styles.heroGlowOne} />
              <View style={styles.heroGlowTwo} />

              <View style={styles.heroHeaderRow}>
                <View>
                  <Text style={styles.heroKicker}>DAILY CHALLENGE</Text>
                  <Text style={styles.heroTitle}>{dailyStatus ?? "Today's board is ready"}</Text>
                </View>

                <View style={styles.dailyArtWrap}>
                  <Image source={ICON_DAILY} style={styles.dailyHeroImage} />
                </View>
              </View>

              <Text style={styles.heroBody}>
                Solve one polished board, protect your streak, and keep your weekly climb alive.
              </Text>

              <View style={styles.rewardRail}>
                <View style={styles.rewardPill}>
                  <Text style={styles.rewardPillText}>{weeklyStatus ?? "New week. Climb the ladder."}</Text>
                </View>
                <View style={styles.rewardPillStrong}>
                  <Text style={styles.rewardPillStrongText}>{activityStreakLine ?? "XP boost ready"}</Text>
                </View>
              </View>

              {progressHint ? <Text style={styles.progressHint}>{progressHint}</Text> : null}

              <LinearGradient
                colors={dailyComplete ? ["#AFC8D8", "#C8DCE8"] : ["#2FBFF2", "#64E4C7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                <Text style={styles.primaryButtonText}>{dailyComplete ? "View Other Modes" : "Play Daily Now"}</Text>
              </LinearGradient>

              {dailyComplete && nextDailyCountdown ? (
                <Text style={styles.nextDailyText}>{nextDailyCountdown}</Text>
              ) : null}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.quickRow}>
            <TouchableOpacity
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
                isGuest ? go("/login") : go("/variantHub");
              }}
              activeOpacity={0.85}
              style={styles.quickButton}
            >
              <Text style={styles.quickButtonText}>Start New Game</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
                isGuest ? go("/login") : go("/leaderboard");
              }}
              activeOpacity={0.85}
              style={styles.quickButtonGhost}
            >
              <Text style={styles.quickButtonGhostText}>Leaderboards</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Explore</Text>
            <Text style={styles.sectionCaption}>Modes, progress, competition</Text>
          </View>

          <View style={styles.hubGrid}>
            {HUB_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.hubCard, isGuest && styles.disabledItem]}
                activeOpacity={isGuest ? 1 : 0.82}
                disabled={isGuest}
                onPress={() => openHubItem(item.path)}
              >
                <View style={[styles.hubAccent, { backgroundColor: item.accent }]} />
                <View style={[styles.hubImageShell, { shadowColor: item.accent }]}> 
                  <Image source={item.image} style={styles.hubImage} />
                </View>
                <Text style={styles.hubLabel}>{item.label}</Text>
                <Text style={styles.hubSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!isGuest ? (
            <View style={styles.tierCard}>
              <View style={styles.tierTextBlock}>
                <Text style={styles.tierKicker}>CURRENT TIER</Text>
                <Text style={styles.tierTitle}>{tierLabel}</Text>
                <Text style={styles.tierSubline}>
                  {isPremium ? "All variants and leaderboards unlocked." : "Classic and Daily unlocked. Premium modes are waiting."}
                </Text>
              </View>

              <View style={styles.tierBadgeWrap}>
                <Image
                  source={isPremium ? TIER_PREMIUM : TIER_STANDARD}
                  style={isPremium ? styles.tierBadgePremium : styles.tierBadgeStandard}
                />
              </View>
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
            <TouchableOpacity onPress={() => setDailyLockedVisible(false)} activeOpacity={0.85}>
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
    backgroundColor: "#F5FBFF",
  },
  bgMuteLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  bgTopGlow: {
    position: "absolute",
    top: -90,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.54)",
  },
  bgMiddleWash: {
    position: "absolute",
    left: -80,
    right: -80,
    top: 430,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(255,255,255,0.34)",
  },
  bgBottomLift: {
    position: "absolute",
    left: -70,
    right: -70,
    bottom: -120,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(199,235,255,0.32)",
  },
  scroll: {
    alignItems: "center",
    paddingTop: 84,
    paddingBottom: 42,
  },
  topBlock: {
    width: CONTENT_WIDTH,
    alignItems: "center",
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.8,
    color: "#38BEEA",
    marginBottom: 2,
  },
  brandTitle: {
    fontFamily: "BalooBold",
    fontSize: 34,
    lineHeight: 42,
    color: "#14385F",
    textAlign: "center",
    letterSpacing: 0.1,
    textShadowColor: "rgba(255,255,255,0.95)",
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 2 },
  },
  brandSubline: {
    marginTop: -2,
    fontFamily: "BalooRegular",
    fontSize: 13,
    color: "#6E8BA6",
    textAlign: "center",
  },
  heroTouch: {
    width: CONTENT_WIDTH,
    borderRadius: 30,
    shadowColor: "#31BFEF",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 13 },
    elevation: 5,
  },
  heroCard: {
    width: "100%",
    borderRadius: 30,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(91,202,245,0.36)",
  },
  heroGlowOne: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    right: -46,
    top: -52,
    backgroundColor: "rgba(64,205,246,0.16)",
  },
  heroGlowTwo: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    left: -56,
    bottom: -74,
    backgroundColor: "rgba(246,187,67,0.12)",
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroKicker: {
    fontSize: 11,
    fontWeight: "900",
    color: "#28B8E9",
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: "BalooBold",
    fontSize: 28,
    lineHeight: 32,
    color: "#12395F",
    maxWidth: 230,
  },
  dailyArtWrap: {
    width: 108,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    marginRight: -8,
    marginTop: -8,
    shadowColor: "#35C8F4",
    shadowOpacity: 0.26,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  dailyHeroImage: {
    width: 136,
    height: 136,
    resizeMode: "contain",
  },
  heroBody: {
    marginTop: 6,
    fontFamily: "BalooRegular",
    fontSize: 13,
    lineHeight: 18,
    color: "#6E8CA6",
    maxWidth: 290,
  },
  rewardRail: {
    marginTop: 10,
    gap: 6,
  },
  rewardPill: {
    alignSelf: "flex-start",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(58,191,238,0.18)",
  },
  rewardPillText: {
    fontFamily: "BalooBold",
    fontSize: 12,
    color: "#5A7893",
  },
  rewardPillStrong: {
    alignSelf: "flex-start",
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(220,252,246,0.76)",
    borderWidth: 1,
    borderColor: "rgba(95,223,204,0.24)",
  },
  rewardPillStrongText: {
    fontFamily: "BalooBold",
    fontSize: 12,
    color: "#1D94C9",
  },
  progressHint: {
    marginTop: 8,
    fontFamily: "BalooRegular",
    fontSize: 12,
    color: "#6F89A2",
  },
  primaryButton: {
    height: 48,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    shadowColor: "#31BFEF",
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  nextDailyText: {
    marginTop: 9,
    textAlign: "center",
    fontFamily: "BalooBold",
    fontSize: 12,
    color: "#5E819E",
  },
  quickRow: {
    width: CONTENT_WIDTH,
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  quickButton: {
    flex: 1,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(90,196,235,0.34)",
  },
  quickButtonText: {
    color: "#255579",
    fontSize: 13,
    fontWeight: "900",
  },
  quickButtonGhost: {
    flex: 1,
    height: 42,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(232,249,255,0.62)",
    borderWidth: 1,
    borderColor: "rgba(90,196,235,0.22)",
  },
  quickButtonGhostText: {
    color: "#4B7899",
    fontSize: 13,
    fontWeight: "900",
  },
  sectionHeaderRow: {
    width: CONTENT_WIDTH,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 7,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontFamily: "BalooBold",
    fontSize: 20,
    color: "#14385F",
  },
  sectionCaption: {
    fontFamily: "BalooRegular",
    fontSize: 11,
    color: "#7D96AC",
    marginBottom: 4,
  },
  hubGrid: {
    width: CONTENT_WIDTH,
    gap: 8,
  },
  hubCard: {
    height: 84,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 1,
    borderColor: "rgba(91,202,245,0.30)",
    shadowColor: "#65D1F3",
    shadowOpacity: 0.16,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  disabledItem: {
    opacity: 0.45,
  },
  hubAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    opacity: 0.82,
  },
  hubImageShell: {
    width: 106,
    height: 78,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  hubImage: {
    width: 108,
    height: 82,
    resizeMode: "contain",
  },
  hubLabel: {
    position: "absolute",
    left: 134,
    top: 14,
    fontFamily: "BalooBold",
    fontSize: 18,
    color: "#173B60",
  },
  hubSubtitle: {
    position: "absolute",
    left: 134,
    top: 42,
    right: 14,
    fontFamily: "BalooRegular",
    fontSize: 12,
    color: "#7A94AA",
  },
  tierCard: {
    width: CONTENT_WIDTH,
    minHeight: 92,
    borderRadius: 26,
    paddingLeft: 18,
    paddingVertical: 12,
    paddingRight: 8,
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(91,202,245,0.28)",
  },
  tierTextBlock: {
    flex: 1,
    paddingRight: 8,
  },
  tierKicker: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.7,
    color: "#35BCEB",
    marginBottom: 4,
  },
  tierTitle: {
    fontFamily: "BalooBold",
    fontSize: 19,
    color: "#183D62",
  },
  tierSubline: {
    marginTop: 2,
    fontFamily: "BalooRegular",
    fontSize: 12,
    lineHeight: 16,
    color: "#718CA4",
  },
  tierBadgeWrap: {
    width: 104,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#35C8F4",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  tierBadgeStandard: {
    width: 112,
    height: 78,
    resizeMode: "contain",
  },
  tierBadgePremium: {
    width: 82,
    height: 76,
    resizeMode: "contain",
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
