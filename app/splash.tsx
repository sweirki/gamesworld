// app/splash.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Image, ImageBackground } from "react-native";
import { useRouter } from "expo-router";
import * as Progress from "react-native-progress";

const NEXT_ROUTE = "/sudokuIntro";

export default function Splash() {
  const router = useRouter();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let mounted = true;
    const totalMs = 2200;
    const start = Date.now();

    const tick = () => {
      if (!mounted) return;

      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / totalMs);
      setProgress(Math.pow(t, 0.85));

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
  }, [router]);

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("../assets/branding/splash-artwork.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <View style={styles.lightWash} />

        <View style={styles.content}>
          <Image
            source={require("../assets/branding/logo-symbol.png")}
            style={styles.symbol}
            resizeMode="contain"
          />

          <Image
            source={require("../assets/branding/sweirki-home-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />

          <Text style={styles.tagline}>A brighter way to play Sudoku</Text>

          <View style={styles.progressShell}>
            <Progress.Bar
              progress={progress}
              width={230}
              height={7}
              color="#35BDF4"
              unfilledColor="rgba(163, 218, 255, 0.28)"
              borderWidth={0}
              borderRadius={20}
            />
          </View>

          <Text style={styles.disclaimer}>Characters and events in this game are fictitious.</Text>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7FCFF",
  },
  background: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  lightWash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  content: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 40,
  },
  symbol: {
    width: 118,
    height: 118,
    marginBottom: 6,
  },
  logo: {
    width: 310,
    height: 118,
    marginBottom: 2,
  },
  tagline: {
    fontFamily: "BalooRegular",
    fontSize: 15,
    color: "#4F6F8F",
    textAlign: "center",
    letterSpacing: 0.2,
    marginBottom: 26,
  },
  progressShell: {
    padding: 4,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.72)",
    shadowColor: "#50C8FF",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  disclaimer: {
    marginTop: 22,
    width: "82%",
    fontSize: 11,
    color: "rgba(55, 85, 115, 0.62)",
    textAlign: "center",
    lineHeight: 15,
  },
});
