// app/splash.tsx
import React, { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

const NEXT_ROUTE = "/sudokuIntro";
const SPLASH_MS = 4000;

const splashAssets = {
  main: require("../assets/branding/splash/splash-main.png"),
  classic: require("../assets/branding/splash/splash-classic.png"),
  killer: require("../assets/branding/splash/splash-killer.png"),
  hyper: require("../assets/branding/splash/splash-hyper.png"),
  x: require("../assets/branding/splash/splash-x.png"),
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const COMPACT = SCREEN_HEIGHT < 720;

export default function Splash() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const start = Date.now();

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 680,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 9,
        bounciness: 7,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1300,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 1700,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    const tick = () => {
      if (!mounted) return;

      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / SPLASH_MS);
      setProgress(Math.pow(t, 0.76));

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        router.replace(NEXT_ROUTE);
      }
    };

    requestAnimationFrame(tick);

    return () => {
      mounted = false;
    };
  }, [drift, fade, glow, rise, router, scale]);

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1.08],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.48, 0.78],
  });

  const floatUp = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });

  const floatDown = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 6],
  });

  const progressWidth = `${Math.max(5, progress * 100)}%`;

  return (
    <LinearGradient colors={["#F8FDFF", "#EAF8FF", "#DFF4FF"]} style={styles.root}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <View style={styles.orbThree} />
      <View style={styles.softPanel} />
      <View style={styles.dottedAura} />

      <Animated.Image
        source={splashAssets.classic}
        resizeMode="contain"
        style={[styles.ghostIcon, styles.ghostClassic, { transform: [{ translateY: floatUp }, { rotate: "-10deg" }] }]}
      />
      <Animated.Image
        source={splashAssets.hyper}
        resizeMode="contain"
        style={[styles.ghostIcon, styles.ghostHyper, { transform: [{ translateY: floatDown }, { rotate: "9deg" }] }]}
      />
      <Animated.Image
        source={splashAssets.killer}
        resizeMode="contain"
        style={[styles.ghostIcon, styles.ghostKiller, { transform: [{ translateY: floatDown }, { rotate: "8deg" }] }]}
      />
      <Animated.Image
        source={splashAssets.x}
        resizeMode="contain"
        style={[styles.ghostIcon, styles.ghostX, { transform: [{ translateY: floatUp }, { rotate: "-8deg" }] }]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fade,
            transform: [{ translateY: rise }, { scale }],
          },
        ]}
      >
        <View style={styles.heroStage}>
          <Animated.View
            style={[
              styles.heroGlow,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />
          <View style={styles.heroHalo} />
          <Image source={splashAssets.main} style={styles.mainMark} resizeMode="contain" />
        </View>

        <Text style={styles.kicker}>PREMIUM DAILY SUDOKU</Text>
        <Text style={styles.title}>Sweirki Sudoku</Text>
        <Text style={styles.tagline}>Play • Progress • Master</Text>

        <View style={styles.loadingCard}>
          <View style={styles.loadingHeader}>
            <Text style={styles.loadingLabel}>Preparing your puzzle</Text>
            <Text style={styles.loadingPercent}>{Math.round(progress * 100)}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
            <View style={styles.progressShine} />
          </View>

          <View style={styles.stepRow}>
            {[
              { asset: splashAssets.classic, active: progress >= 0.12 },
              { asset: splashAssets.killer, active: progress >= 0.36 },
              { asset: splashAssets.hyper, active: progress >= 0.6 },
              { asset: splashAssets.x, active: progress >= 0.82 },
              { asset: splashAssets.main, active: progress >= 0.96, crown: true },
            ].map((step, index) => (
              <View key={index} style={[styles.stepDot, step.active && styles.stepDotActive, step.crown && styles.crownStep]}>
                <Image source={step.asset} resizeMode="contain" style={[styles.stepIcon, step.crown && styles.crownStepIcon]} />
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  orbOne: {
    position: "absolute",
    top: -108,
    right: -92,
    width: 288,
    height: 288,
    borderRadius: 144,
    backgroundColor: "rgba(72, 201, 248, 0.22)",
  },
  orbTwo: {
    position: "absolute",
    bottom: -138,
    left: -118,
    width: 342,
    height: 342,
    borderRadius: 171,
    backgroundColor: "rgba(21, 127, 230, 0.14)",
  },
  orbThree: {
    position: "absolute",
    top: "20%",
    left: -52,
    width: 142,
    height: 142,
    borderRadius: 71,
    backgroundColor: "rgba(255, 214, 102, 0.18)",
  },
  softPanel: {
    position: "absolute",
    width: "88%",
    height: "66%",
    borderRadius: 54,
    borderWidth: 1,
    borderColor: "rgba(189, 232, 253, 0.48)",
    backgroundColor: "rgba(255,255,255,0.2)",
    transform: [{ rotate: "-6deg" }],
  },
  dottedAura: {
    position: "absolute",
    top: 58,
    right: 34,
    width: 126,
    height: 126,
    borderRadius: 28,
    borderWidth: 12,
    borderColor: "rgba(255,255,255,0.26)",
    opacity: 0.55,
  },
  ghostIcon: {
    position: "absolute",
    width: COMPACT ? 138 : 166,
    height: COMPACT ? 138 : 166,
    opacity: 0.2,
  },
  ghostClassic: {
    top: COMPACT ? 66 : 82,
    left: -36,
  },
  ghostHyper: {
    top: COMPACT ? 100 : 122,
    right: -46,
  },
  ghostKiller: {
    bottom: COMPACT ? 78 : 104,
    left: -42,
  },
  ghostX: {
    bottom: COMPACT ? 92 : 120,
    right: -48,
  },
  content: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  heroStage: {
    width: COMPACT ? 262 : 302,
    height: COMPACT ? 242 : 282,
    alignItems: "center",
    justifyContent: "center",
    marginTop: COMPACT ? -8 : -18,
    marginBottom: COMPACT ? -2 : 2,
  },
  heroGlow: {
    position: "absolute",
    width: COMPACT ? 218 : 254,
    height: COMPACT ? 184 : 212,
    borderRadius: 90,
    backgroundColor: "rgba(95, 205, 255, 0.64)",
    shadowColor: "#157FE6",
    shadowOpacity: 0.44,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    elevation: 15,
  },
  heroHalo: {
    position: "absolute",
    width: COMPACT ? 244 : 282,
    height: COMPACT ? 196 : 232,
    borderRadius: 96,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  mainMark: {
    width: COMPACT ? 286 : 330,
    height: COMPACT ? 286 : 330,
  },
  kicker: {
    fontFamily: "BalooBold",
    fontSize: 12,
    letterSpacing: 2.4,
    color: "#17A9E8",
    marginTop: COMPACT ? -4 : 0,
    marginBottom: 4,
  },
  title: {
    fontFamily: "BalooBold",
    fontSize: COMPACT ? 39 : 44,
    color: "#143D66",
    textAlign: "center",
    lineHeight: COMPACT ? 45 : 50,
  },
  tagline: {
    fontFamily: "BalooRegular",
    fontSize: 16,
    color: "#6687A7",
    textAlign: "center",
    marginTop: 2,
    marginBottom: COMPACT ? 24 : 30,
  },
  loadingCard: {
    width: "86%",
    maxWidth: 348,
    borderRadius: 28,
    paddingHorizontal: 15,
    paddingTop: 13,
    paddingBottom: 12,
    backgroundColor: "rgba(255,255,255,0.76)",
    borderWidth: 1,
    borderColor: "rgba(180, 226, 251, 0.82)",
    shadowColor: "#157FE6",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 9,
  },
  loadingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  loadingLabel: {
    fontFamily: "BalooBold",
    fontSize: 13,
    color: "#527A9D",
  },
  loadingPercent: {
    fontFamily: "BalooBold",
    fontSize: 13,
    color: "#157FE6",
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(193, 230, 250, 0.56)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.92)",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#20BCEC",
    borderRightWidth: 2,
    borderRightColor: "rgba(255,255,255,0.85)",
  },
  progressShine: {
    position: "absolute",
    top: 2,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
  stepRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(236, 248, 255, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(184, 226, 249, 0.72)",
    opacity: 0.46,
  },
  stepDotActive: {
    opacity: 1,
    backgroundColor: "#FFFFFF",
    borderColor: "rgba(64, 190, 244, 0.9)",
    shadowColor: "#157FE6",
    shadowOpacity: 0.18,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  crownStep: {
    borderColor: "rgba(246, 189, 65, 0.82)",
  },
  stepIcon: {
    width: 34,
    height: 34,
  },
  crownStepIcon: {
    width: 40,
    height: 40,
  },
});
