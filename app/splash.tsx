// app/splash.tsx
import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Progress from "react-native-progress";

const NEXT_ROUTE = "/sudokuIntro";
const SPLASH_MS = 3000;

export default function Splash() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.92)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    const start = Date.now();

    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 720,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 760,
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
          duration: 1350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1350,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();

    const tick = () => {
      if (!mounted) return;

      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / SPLASH_MS);
      setProgress(Math.pow(t, 0.78));

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
  }, [fade, glow, rise, router, scale]);

  const glowScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.42, 0.7],
  });

  return (
    <LinearGradient colors={["#F8FDFF", "#EAF8FF", "#DFF3FF"]} style={styles.root}>
      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <View style={styles.orbThree} />
      <View style={styles.gridWash} />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fade,
            transform: [{ translateY: rise }, { scale }],
          },
        ]}
      >
        <View style={styles.stage}>
          <Animated.View
            style={[
              styles.markGlow,
              {
                opacity: glowOpacity,
                transform: [{ scale: glowScale }],
              },
            ]}
          />

          <LinearGradient colors={["#FFFFFF", "#ECF9FF"]} style={styles.markCard}>
            <View style={styles.tileGrid}>
              {["7", "", "3", "", "S", "", "2", "", "9"].map((value, index) => (
                <View key={`${value}-${index}`} style={[styles.tile, value === "S" && styles.heroTile]}>
                  <Text style={[styles.tileText, value === "S" && styles.heroTileText]}>{value}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        <Text style={styles.kicker}>PREMIUM SUDOKU</Text>
        <Text style={styles.title}>Sweirki Sudoku</Text>
        <Text style={styles.tagline}>Think sharp. Play beautifully.</Text>

        <View style={styles.progressShell}>
          <Progress.Bar
            progress={progress}
            width={238}
            height={8}
            color="#157FE6"
            unfilledColor="rgba(176, 218, 248, 0.48)"
            borderWidth={0}
            borderRadius={20}
          />
        </View>

        <View style={styles.loadingPill}>
          <Text style={styles.loadingText}>Preparing your next puzzle</Text>
        </View>
      </Animated.View>

      <Text style={styles.disclaimer}>Characters and events in this game are fictitious.</Text>
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
    top: -90,
    right: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(53, 189, 244, 0.18)",
  },
  orbTwo: {
    position: "absolute",
    bottom: -120,
    left: -95,
    width: 310,
    height: 310,
    borderRadius: 155,
    backgroundColor: "rgba(21, 127, 230, 0.12)",
  },
  orbThree: {
    position: "absolute",
    top: 168,
    left: -44,
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: "rgba(255, 214, 102, 0.18)",
  },
  gridWash: {
    position: "absolute",
    width: "82%",
    height: "58%",
    borderRadius: 44,
    borderWidth: 1,
    borderColor: "rgba(203, 233, 251, 0.45)",
    backgroundColor: "rgba(255,255,255,0.18)",
    transform: [{ rotate: "-7deg" }],
  },
  content: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  stage: {
    width: 190,
    height: 190,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  markGlow: {
    position: "absolute",
    width: 168,
    height: 168,
    borderRadius: 46,
    backgroundColor: "#7DD8FF",
    shadowColor: "#157FE6",
    shadowOpacity: 0.45,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  markCard: {
    width: 152,
    height: 152,
    borderRadius: 42,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.95)",
    shadowColor: "#157FE6",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  tileGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tile: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(237, 247, 255, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(203, 233, 251, 0.8)",
  },
  heroTile: {
    backgroundColor: "#157FE6",
    borderColor: "#157FE6",
    shadowColor: "#157FE6",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  tileText: {
    fontFamily: "BalooBold",
    fontSize: 17,
    color: "#2C608A",
    lineHeight: 22,
  },
  heroTileText: {
    color: "#FFFFFF",
    fontSize: 22,
  },
  kicker: {
    fontFamily: "BalooBold",
    fontSize: 12,
    letterSpacing: 2.2,
    color: "#157FE6",
    marginBottom: 4,
  },
  title: {
    fontFamily: "BalooBold",
    fontSize: 42,
    color: "#143D66",
    textAlign: "center",
    lineHeight: 48,
  },
  tagline: {
    fontFamily: "BalooRegular",
    fontSize: 16,
    color: "#5D7F9F",
    textAlign: "center",
    marginTop: 3,
    marginBottom: 28,
  },
  progressShell: {
    padding: 5,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(203, 233, 251, 0.72)",
    shadowColor: "#157FE6",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  loadingPill: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.56)",
    borderWidth: 1,
    borderColor: "rgba(203, 233, 251, 0.58)",
  },
  loadingText: {
    fontFamily: "BalooBold",
    fontSize: 12,
    color: "#527A9D",
  },
  disclaimer: {
    position: "absolute",
    bottom: 34,
    width: "82%",
    fontSize: 11,
    color: "rgba(69, 101, 130, 0.58)",
    textAlign: "center",
    lineHeight: 15,
  },
});
