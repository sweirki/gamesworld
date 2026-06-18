import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { getColors } from "../theme";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import AppBackButton from "./components/AppBackButton";

export default function ChooseDifficulty() {
  const colors = getColors();
  const router = useRouter();

  return (
    <ImageBackground
      source={require("../assets/bg.png")}
      style={styles(colors).bg}
      blurRadius={3}
    >
      <AppBackButton />

      <View style={styles(colors).bannerWrapper}>
        <Image
          source={require("../assets/topBanner.png")}
          style={styles(colors).banner}
          resizeMode="cover"
        />
        <LinearGradient
          colors={["rgba(0,0,0,0)", "rgba(0,0,30,0.9)"]}
          style={styles(colors).bannerGradient}
        />
      </View>

      <View style={styles(colors).menuCard}>
        {/* Title */}
        <MotiView
          from={{ opacity: 0, translateY: -50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 200, duration: 600 }}
        >
          <Text style={styles(colors).title}>Select Difficulty</Text>
        </MotiView>

        {/* Easy */}
        <MotiView
          from={{ opacity: 0, translateX: -80 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ delay: 600, duration: 600 }}
        >
          <TouchableOpacity
            style={[styles(colors).mainButton, styles(colors).blueButton]}
            onPress={() =>
              router.push({ pathname: "/sudoku", params: { level: "easy" } })
            }
            activeOpacity={0.8}
          >
            <Text style={styles(colors).buttonText}>EASY</Text>
          </TouchableOpacity>
        </MotiView>

        {/* Medium */}
        <MotiView
          from={{ opacity: 0, translateX: 80 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ delay: 900, duration: 600 }}
        >
          <TouchableOpacity
            style={[styles(colors).mainButton, styles(colors).blueButton]}
            onPress={() =>
              router.push({ pathname: "/sudoku", params: { level: "medium" } })
            }
            activeOpacity={0.8}
          >
            <Text style={styles(colors).buttonText}>MEDIUM</Text>
          </TouchableOpacity>
        </MotiView>

        {/* Hard */}
        <MotiView
          from={{ opacity: 0, translateX: -80 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ delay: 1200, duration: 600 }}
        >
          <TouchableOpacity
            style={[styles(colors).mainButton, styles(colors).blueButton]}
            onPress={() =>
              router.push({ pathname: "/sudoku", params: { level: "hard" } })
            }
            activeOpacity={0.8}
          >
            <Text style={styles(colors).buttonText}>HARD</Text>
          </TouchableOpacity>
        </MotiView>

        {/* Cancel */}
        <MotiView
          from={{ opacity: 0, translateY: 50 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ delay: 1500, duration: 600 }}
        >
          <TouchableOpacity
            style={[styles(colors).mainButton, styles(colors).redButton]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles(colors).buttonText}>Cancel</Text>
          </TouchableOpacity>
        </MotiView>
      </View>
    </ImageBackground>
  );
}

const styles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    bg: {
      flex: 1,
      resizeMode: "cover",
      justifyContent: "center",
      alignItems: "center",
    },
    bannerWrapper: {
      width: "100%",
      height: 120,
      position: "absolute",
      top: 0,
      overflow: "hidden",
    },
    banner: {
      width: "100%",
      height: "100%",
      opacity: 0.7,
    },
    bannerGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 60,
    },
    menuCard: {
      borderRadius: 20,
      padding: 20,
      alignItems: "center",
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: "#ffffff",
      marginBottom: 12,
      textShadowColor: "rgba(0,0,0,0.6)",
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 3,
    },
    mainButton: {
      justifyContent: "center",
      alignItems: "center",
      borderRadius: 20,
      marginVertical: 6,
      width: 200,
      height: 40,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    buttonText: {
      fontSize: 14,
      fontWeight: "700",
      color: colors.buttonPrimaryText,
    },
    blueButton: {
      backgroundColor: "#3a7bd5",
    },
    redButton: {
      backgroundColor: "#e74c3c",
    },
  });

