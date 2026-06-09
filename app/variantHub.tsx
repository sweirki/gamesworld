import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Animated,
  ImageBackground,
} from "react-native";

import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import * as Haptics from "expo-haptics";
import { useRevenueCat } from "../src/hooks/useRevenueCat";

const BUTTON_BASE = require("../assets/buttons/variants/btn_base_gold.png");
const MODE_BUTTONS: Record<string, any> = {
  classic: require("../assets/buttons/variants/icon_classic.png"),
  killer: require("../assets/buttons/variants/icon_killer.png"),
  hyper: require("../assets/buttons/variants/icon_hyper.png"),
  x: require("../assets/buttons/variants/icon_x.png"),
  ladder: require("../assets/buttons/variants/icon_ladder.png"),
};




const MODES = [
  { key: "classic", label: "Classic\nSudoku", route: "/sudoku", premium: false },
  { key: "killer", label: "Killer\nSudoku", route: "/killerSudoku", premium: true },
  { key: "hyper", label: "Hyper\nSudoku", route: "/hyperSudoku", premium: true },
  { key: "x", label: "X\nSudoku", route: "/xSudoku", premium: true },
  { key: "ladder", label: "Ladder", route: "/leaderboard", premium: false },
];



type Mode = {
  key: string;
  label: string;
  route: string;
  icon?: any;
  premium: boolean;
};

export default function VariantHub() {
 
const { isPremium } = useRevenueCat();
  const router = useRouter();

  // AUTH GUARD: do not allow cached AsyncStorage profile to bypass Firebase login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser) {
        router.replace("/login");
      }
    });

    return unsubscribe;
  }, [router]);
  const [lastPlayed, setLastPlayed] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Player");

  useEffect(() => {
    AsyncStorage.getItem("lastPlayedMode").then(setLastPlayed);
    AsyncStorage.getItem("username").then((n) => n && setUserName(n));
  }, []);

  const handlePress = async (mode: Mode) => {
    await AsyncStorage.setItem("lastPlayedMode", mode.key);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(mode.route);
  };

  return (
  <View style={{ flex: 1, backgroundColor: "#000" }}>
    <ImageBackground
      source={require("../assets/bg.png")}
      style={styles.bg}
      blurRadius={4}
      resizeMode="cover"
    >
      <View style={styles.container}>

      {/* ===== Header (Minimal) ===== */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.profile}
          onPress={() => router.push("/profile")}
          activeOpacity={0.85}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userName[0]?.toUpperCase() ?? "P"}
            </Text>
          </View>
          <Text style={styles.userName}>{userName}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/settings")}
          activeOpacity={0.85}
        >
          <Text style={styles.settings}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* ===== Title ===== */}
      <Text style={styles.title}>Choose Your Challenge</Text>
<Text style={styles.subtitle}>
  Your progress is tracked across all modes
</Text>

      {/* ===== Grid ===== */}
   {/* ===== Grid ===== */}
<View style={styles.row}>
  <AnimatedTile
    mode={MODES[0]}
    lastPlayed={lastPlayed}
    onPress={handlePress}
    isPremium={isPremium}
  />
  <AnimatedTile
    mode={MODES[1]}
    lastPlayed={lastPlayed}
    onPress={handlePress}
    isPremium={isPremium}
  />
</View>

<View style={styles.row}>
  <AnimatedTile
    mode={MODES[2]}
    lastPlayed={lastPlayed}
    onPress={handlePress}
    isPremium={isPremium}
  />
  <AnimatedTile
    mode={MODES[3]}
    lastPlayed={lastPlayed}
    onPress={handlePress}
    isPremium={isPremium}
  />
</View>

<View style={styles.centerRow}>
  <AnimatedTile
    mode={MODES[4]}
    lastPlayed={lastPlayed}
    onPress={handlePress}
    isPremium={isPremium}
  />
</View>


         </View>
    </ImageBackground>
  </View>
);

}

/* ===== Tile ===== */

function AnimatedTile({
  mode,
  onPress,
  lastPlayed,
  isPremium,
}: {
  mode: Mode & { premium: boolean };
  onPress: (mode: Mode) => void;
  lastPlayed: string | null;
  isPremium: boolean;
}) {

  const scale = useRef(new Animated.Value(1)).current;
  const isLastPlayed = lastPlayed === mode.key && mode.key !== "ladder";

  const locked = mode.premium && !isPremium;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <Animated.View
      style={[
        styles.tileWrapper,
        isLastPlayed && styles.lastPlayedGlow,
        { transform: [{ scale }] },
      ]}
    >
      <TouchableOpacity
      onPress={() => {
  onPress(mode);
}}

        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.9}
      >
<View style={styles.tile}>
  {/* BUTTON IMAGE FIRST */}
  <Image
    source={MODE_BUTTONS[mode.key]}
    style={[styles.buttonImg, locked && { opacity: 0.45 }]}
  />

  {/* LABEL */}
  <View style={styles.labelWrap}>
    <Text style={styles.label}>{mode.label}</Text>
  </View>

  {/* LAST PLAYED */}
  {isLastPlayed && (
    <Text style={styles.lastPlayedText}>Last played</Text>
  )}

  {/* 🔒 LOCK BADGE — MUST BE LAST */}
  {locked && (
    <View style={styles.lockBadge}>
      <Text style={styles.lockText}>🔒 Premium</Text>
    </View>
  )}

</View>




      </TouchableOpacity>
    </Animated.View>
  );
}

/* ===== Styles ===== */

const styles = StyleSheet.create({

  bg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },


  container: {
  flex: 1,
  width: "100%",
  paddingTop: 64,
  alignItems: "center",
},


  header: {
    width: "92%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },

  profile: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
   backgroundColor: "#FFD76F",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  avatarText: {
    color: "#061B3A",
    fontWeight: "900",
    fontSize: 16,
  },


lockBadge: {
  position: "absolute",
  bottom: 10,
  alignSelf: "center",
  backgroundColor: "rgba(0,0,0,0.05)",
  paddingHorizontal: 32,
  paddingVertical: 2,
  borderRadius: 10,
},
lockText: {
  fontSize: 8,
  color: "#F3C969",

},

premiumHint: {
  marginTop: 12,
  fontSize: 12,
  color: "rgba(255,249,232,0.75)",
  textAlign: "center",
},

 userName: {
  fontFamily: "BalooBold",
  color: "rgba(255,249,232,0.92)",
  fontSize: 16,
},

  settings: {
    fontSize: 20,
    opacity: 0.9,
  },

  title: {
  fontFamily: "BalooBold",
  fontSize: 28,
  color: "#FBE7A1",
  textAlign: "center",
  marginBottom: 28,
  textShadowColor: "rgba(216,178,74,0.55)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 10,
},

subtitle: {
  fontFamily: "BalooRegular",
  fontSize: 13,
  color: "rgba(255,249,232,0.75)",
  textAlign: "center",
  marginBottom: 22,
},


 row: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: -18,
},

centerRow: {
  flexDirection: "row",
  justifyContent: "center",
  marginTop: 0,    // 👈 pull it up
  marginBottom: 0,
},


 tileWrapper: {
  marginVertical: -6,
  marginHorizontal: -10,
},



  lastPlayedGlow: {
    shadowColor: "#F6C76B",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },

  icon: {
    width: 140,
    height: 140,
    resizeMode: "contain",
  },

 lastPlayedText: {
  position: "absolute",
  bottom: 14,           // 👈 closer to tile
  alignSelf: "center",
  fontSize: 9,         // 👈 subtler
  fontWeight: "600",
  color: "#FFD873",
  opacity: 0.85,        // 👈 less shouty
},


buttonImg: {
  width: 190,
  height: 190,
  position: "absolute",   // 🔑 REQUIRED
  top: 0,
  left: 0,
},

tile: {
  width: 190,
  height: 200,
  position: "relative",   // 🔑 REQUIRED
  overflow: "visible", // 🔑 REQUIRED
},

labelWrap: {
  position: "absolute",
  top: 0,
  bottom: 0,
  width: "100%",
  alignItems: "center",
  justifyContent: "center",

  // optical tweak (very small, intentional)
  paddingTop: 4,
},


label: {
  textAlign: "center",
  fontSize: 16,
  fontWeight: "800",
  color: "#061B3A",
  lineHeight: 20,        // 🔑 gives X vertical mass
  letterSpacing: 0.3,   // 🔑 optical balance
},




});







