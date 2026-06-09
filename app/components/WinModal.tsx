import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import LottieView from "lottie-react-native";
import { getAnalytics } from "../../src/analytics/playerAnalytics";
import { auth } from "../../firebase";

interface WinModalProps {
  visible: boolean;
  onClose: () => void;
  onRestart: (level: string) => void;
  difficulty: string;
  isDaily?: boolean;
}

const { width, height } = Dimensions.get("window");

export default function WinModal({
  visible,
  onClose,
  onRestart,
  difficulty,
  isDaily = false,
}: WinModalProps) {
  const router = useRouter();
  const [recordBadge, setRecordBadge] = useState<string | null>(null);
  const confettiRef = useRef<LottieView>(null);
  /* ───────────── STATE ───────────── */
  const [showMenu, setShowMenu] = useState(false);
  const [showPreCelebrate, setShowPreCelebrate] = useState(false);
  const [isFirstWin, setIsFirstWin] = useState(false);

  /* ───────────── ANIM VALUES ───────────── */
  const fadeMenu = useRef(new Animated.Value(0)).current;
  const scaleMenu = useRef(new Animated.Value(0.94)).current;
  const particleAnim = useRef(new Animated.Value(0)).current;

  const particleLoop = useRef<Animated.CompositeAnimation | null>(null);
  const victorySound = useRef<Audio.Sound | null>(null);

  /* ───────────── FIRST WIN CHECK ───────────── */
  useEffect(() => {
    if (!visible) return;

    setRecordBadge(null);

    requestAnimationFrame(() => {
      confettiRef.current?.reset();
      confettiRef.current?.play();
    });

    (async () => {
      try {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        const a = await getAnalytics();
        // show a tiny “record” badge when streak best equals current and current > 0
        const prevActivityBestRaw = await AsyncStorage.getItem(
          "best_activity_streak_seen",
        );
        const prevActivityBest = prevActivityBestRaw
          ? Number(prevActivityBestRaw)
          : 0;

        if (a.streaks.activityBest > prevActivityBest) {
          setRecordBadge("🏆 New Activity Record!");
          await AsyncStorage.setItem(
            "best_activity_streak_seen",
            String(a.streaks.activityBest),
          );
        }

        if (isDaily) {
          const prevDailyBestRaw = await AsyncStorage.getItem(
            "best_daily_streak_seen",
          );
          const prevDailyBest = prevDailyBestRaw ? Number(prevDailyBestRaw) : 0;

          if (a.streaks.dailyBest > prevDailyBest) {
            setRecordBadge("🏆 New Daily Record!");
            await AsyncStorage.setItem(
              "best_daily_streak_seen",
              String(a.streaks.dailyBest),
            );
          }
        }
      } catch {}
    })();

    let cancelled = false;
    (async () => {
      try {
        const hasWon = await AsyncStorage.getItem("hasWonBefore");
        if (cancelled) return;

        if (!hasWon) {
          setIsFirstWin(true);
          await AsyncStorage.setItem("hasWonBefore", "true");
        } else {
          setIsFirstWin(false);
        }
      } catch {
        setIsFirstWin(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible]);

  /* ───────────── PRE-CELEBRATION + MODAL ENTRANCE ───────────── */
  useEffect(() => {
    if (!visible) return;

    // reset everything
    setShowMenu(false);
    fadeMenu.setValue(0);
    scaleMenu.setValue(0.94);
    particleAnim.setValue(0);
    particleLoop.current?.stop();

    // show WELL DONE
    setShowPreCelebrate(true);

    const t1 = setTimeout(() => {
      setShowPreCelebrate(false);
    }, 450);

    Animated.parallel([
      Animated.timing(fadeMenu, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.spring(scaleMenu, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowMenu(true);
    });

    return () => {
      clearTimeout(t1);
    };
  }, [visible]);

  /* ───────────── START PARTICLES (AFTER MODAL IS VISIBLE) ───────────── */
  useEffect(() => {
    if (!visible) return;

    let cancelled = false;

    (async () => {
      try {
        if (victorySound.current) {
          await victorySound.current.unloadAsync();
          victorySound.current = null;
        }

        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/victory.mp3"),
          { volume: 0.7 },
        );

        if (cancelled) {
          await sound.unloadAsync();
          return;
        }

        victorySound.current = sound;
        await sound.playAsync();
      } catch {
        // silent by design
      }
    })();

    return () => {
      cancelled = true;

      if (victorySound.current) {
        victorySound.current.stopAsync().catch(() => {});
        victorySound.current.unloadAsync().catch(() => {});
        victorySound.current = null;
      }
    };
  }, [visible]);
  useEffect(() => {
    if (!showMenu) return;

    particleLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(particleAnim, {
          toValue: 1,
          duration: 16000,
          useNativeDriver: true,
        }),
        Animated.timing(particleAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    particleLoop.current.start();

    return () => {
      particleLoop.current?.stop();
      particleAnim.setValue(0);
    };
  }, [showMenu]);

  /* ───────────── HANDLERS ───────────── */
  const handlePrimary = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isDaily || isFirstWin) {
      onClose();
      setTimeout(() => router.replace("/sudokuIntro"), 400);
    } else {
      // ✅ Restart ONLY — do NOT call onClose
      onRestart(difficulty);
    }
  };

  const handleSecondary = () => {
    onClose();
    setTimeout(() => router.replace("/leaderboard"), 400);
  };

  /* ───────────── PARTICLES (BACKGROUND WOW) ───────────── */
  const particles = Array.from({ length: 55 }).map(() => {
    const startY = Math.random() * height;
    const driftX = (Math.random() - 0.5) * 120;
    return {
      left: `${Math.random() * 100}%`,
      size: 6 + Math.random() * 8,
      startY,
      driftX,
    };
  });

  const modeLabel = isDaily ? "Daily" : "Classic";
  const difficultyLabel = isDaily
    ? "Challenge"
    : difficulty
      ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
      : "Sudoku";

  const outcomeTitle = recordBadge
    ? "New Record"
    : isDaily
      ? "Daily Complete"
      : isFirstWin
        ? "Achievement Unlocked"
        : "Victory Secured";

  const outcomeSubtitle = isDaily
    ? "Progress secured for today."
    : isFirstWin
      ? "First milestone reached."
      : "Another step forward.";

  /* ───────────── RENDER ───────────── */
  return (
    <Modal visible={visible} transparent animationType="fade">
      <LottieView
        ref={confettiRef}
        source={require("../../assets/animations/confetti.json")}
        autoPlay
        loop={false}
        style={[StyleSheet.absoluteFill, { zIndex: 0 }]}
      />

      {/* PRE-CELEBRATION */}
      {showPreCelebrate && (
        <View style={styles.preOverlay}>
          <View style={styles.preCard}>
            <Text style={styles.preText}>✨ Excellent</Text>
          </View>
        </View>
      )}

      {/* PARTICLES (BEHIND MODAL) */}
      {showMenu &&
        particles.map((p, i) => {
          const translateY = particleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [p.startY + height * 0.4, p.startY - height],
          });

          const translateX = particleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, p.driftX],
          });

          const opacity = particleAnim.interpolate({
            inputRange: [0, 0.2, 0.8, 1],
            outputRange: [0, 0.6, 0.6, 0],
          });

          return (
            <Animated.View
              key={i}
              style={{
                position: "absolute",
                left: p.left as `${number}%`,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: "rgba(255,220,170,0.95)",
                shadowColor: "#FFD700",
                shadowOpacity: 0.9,
                shadowRadius: 10,
                elevation: 10,
                transform: [{ translateY }, { translateX }],
                opacity,
              }}
            />
          );
        })}

      {/* WOW MODAL */}
      {showMenu && (
        <Animated.View
          style={[
            styles.overlay,
            { opacity: fadeMenu, transform: [{ scale: scaleMenu }] },
          ]}
        >
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={55}
              tint="dark"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: "rgba(0,0,0,0.55)" },
              ]}
            />
          )}

          <View style={styles.cardWrap}>
            <LinearGradient
              colors={["rgba(26,26,32,0.98)", "rgba(12,12,14,0.96)"]}
              style={[
                styles.card,
                {
                  shadowColor: "#FFD700",
                  shadowOpacity: 0.12,
                  shadowRadius: 30,
                },
              ]}
            >
              <Text style={styles.hero}>🏆</Text>

              <Text style={styles.kicker}>Victory reward</Text>
              <Text style={styles.title}>{outcomeTitle}</Text>
              <Text style={styles.subtitle}>{outcomeSubtitle}</Text>

              <View style={styles.rewardRow}>
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardValue}>{modeLabel}</Text>
                  <Text style={styles.rewardLabel}>Mode</Text>
                </View>
                <View style={styles.rewardDivider} />
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardValue}>{difficultyLabel}</Text>
                  <Text style={styles.rewardLabel}>Level</Text>
                </View>
                <View style={styles.rewardDivider} />
                <View style={styles.rewardItem}>
                  <Text style={styles.rewardValue}>Win</Text>
                  <Text style={styles.rewardLabel}>Result</Text>
                </View>
              </View>

              {recordBadge ? (
                <View style={styles.recordBadge}>
                  <Text style={styles.recordBadgeText}>{recordBadge}</Text>
                </View>
              ) : (
                <View style={styles.recordBadgeQuiet}>
                  <Text style={styles.recordBadgeQuietText}>
                    Progress updated
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handlePrimary}
              >
                <LinearGradient
                  colors={["#FFD700", "#FFF2A8"]}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.primaryText}>
                  {isDaily || isFirstWin ? "Continue" : "Play Again"}
                </Text>
              </TouchableOpacity>

              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={() => {
                    onClose();
                    setTimeout(() => router.push("/progress"), 350);
                  }}
                >
                  <Text style={styles.linkText}>View Progress</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryAction}
                  onPress={handleSecondary}
                >
                  <Text style={styles.linkText}>Leaderboard</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={onClose}>
                <Text style={styles.linkTextMuted}>Close</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </Animated.View>
      )}
    </Modal>
  );
}

/* ───────────── STYLES ───────────── */

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  cardWrap: {
    width: Math.min(width * 0.82, 380),
  },

  card: {
    borderRadius: 26,
    paddingVertical: 30,
    paddingHorizontal: 24,
    alignItems: "center",

    borderWidth: 1.5,
    borderColor: "rgba(255,215,0,0.18)",

    shadowColor: "#000",
    shadowOpacity: 0.85,
    shadowRadius: 22,
    elevation: 18,
  },

  hero: {
    fontSize: 44,
    marginBottom: 10,
    textShadowColor: "rgba(255,215,0,0.35)",
    textShadowRadius: 14,
  },

  kicker: {
    fontSize: 11,
    fontWeight: "900",
    color: "rgba(255,215,0,0.82)",
    letterSpacing: 2.4,
    marginBottom: 8,
    textAlign: "center",
    textTransform: "uppercase",
  },

  title: {
    fontSize: 23,
    fontWeight: "900",
    color: "rgba(245,245,247,0.94)",
    marginBottom: 6,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "rgba(220,220,226,0.76)",
    marginBottom: 18,
    textAlign: "center",
  },

  rewardRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },

  rewardItem: {
    flex: 1,
    alignItems: "center",
  },

  rewardValue: {
    fontSize: 14,
    fontWeight: "900",
    color: "rgba(255,255,255,0.94)",
    marginBottom: 4,
  },

  rewardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(200,205,215,0.62)",
  },

  rewardDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  recordBadge: {
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,215,0,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.25)",
  },

  recordBadgeText: {
    color: "#FFD700",
    fontWeight: "900",
    fontSize: 12,
  },

  recordBadgeQuiet: {
    marginBottom: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.055)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },

  recordBadgeQuietText: {
    color: "rgba(230,232,238,0.78)",
    fontWeight: "800",
    fontSize: 12,
  },

  primaryBtn: {
    width: "100%",
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 12,
    overflow: "hidden",
  },

  primaryText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111",
  },

  secondaryRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },

  secondaryAction: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.075)",
  },

  linkText: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(245,245,250,0.88)",
    textAlign: "center",
  },

  linkTextMuted: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(180,180,185,0.6)",
    textAlign: "center",
  },

  tertiaryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(180,180,185,0.55)",
  },

  preOverlay: {
    position: "absolute",
    inset: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },

  preCard: {
    backgroundColor: "rgba(0,0,0,0.78)",
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 28,
  },

  preText: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFD700",
  },
});
