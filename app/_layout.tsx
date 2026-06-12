import { Stack, useRouter } from "expo-router";
import { initRevenueCat } from "../src/lib/revenuecat";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState, useRef } from "react";
import { View, ActivityIndicator, Platform, TouchableOpacity, Text } from "react-native";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { bumpActivityOnSessionStart, } from "../src/analytics/playerAnalytics";
import * as Font from "expo-font";

import * as Linking from "expo-linking";
import { onAuthStateChanged } from "firebase/auth";
import Purchases from "react-native-purchases";
import { AppState } from "react-native";
import {
  getAnalytics,
} from "../src/analytics/playerAnalytics";

import { auth } from "../firebase";
import { handleReferral } from "../utils/inviteUtils";
import { safeFirestoreCall } from "../src/utils/firestoreSafe";
import { resetSeasonXPIfNeeded } from "./lib/ladderBridge";

import RankUpPopup from "./components/RankUpPopup";
import ForceUpdateGate from "../src/components/ForceUpdateGate";

export default function Layout() {
  const [loading, setLoading] = useState(true);
  const [fontsReady, setFontsReady] = useState(false);

  const [user, setUser] = useState(auth.currentUser);
 const sessionStartRef = useRef<number | null>(null);
  const router = useRouter();
  // 📅 Normalize timestamps into calendar-day keys
const getDayKey = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};


  /* ================= FONT LOADING ================= */
useEffect(() => {
  (async () => {
    try {
      await Font.loadAsync({
        BalooBold: require("../assets/fonts/Baloo2-Bold.ttf"),
        BalooRegular: require("../assets/fonts/Baloo2-Regular.ttf"),
      });
    } catch (e) {
      console.warn("Font load failed", e);
    } finally {
      setFontsReady(true);
    }
  })();
}, []);

  /* ================= AUTH LISTENER ================= */
 useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (u) => {
    setUser(u);
    setLoading(false);

    if (u) {
      // Phase 2: bind RevenueCat identity to Firebase user
      Purchases.logIn(u.uid).catch(() => {});
    }
  });

  return unsubscribe;
}, []);

/* ================= SEASON FINALIZATION (STEP 5B) ================= */
useEffect(() => {
  if (!user) return;

  const finalizeSeason = async () => {
    try {
      // 1️⃣ Reset season XP if rollover happened
      await resetSeasonXPIfNeeded();

      // 2️⃣ Show season summary once
      const last = await AsyncStorage.getItem("lastSeasonEnded");
      if (last) {
        // TODO: replace with real Season Summary UI later
        console.log("🏁 Season ended:", last);

        // for now just clear the flag
        await AsyncStorage.removeItem("lastSeasonEnded");
      }
    } catch {}
  };

  finalizeSeason();
}, [user]);


/* ================= SESSION TRACKING (Phase 8B) ================= */
useEffect(() => {
  if (!user) return;

  let mounted = true;
  sessionStartRef.current = Date.now();

  const start = async () => {
    // activity streak bump (authoritative, cloud + cached)
    await bumpActivityOnSessionStart();
    sessionStartRef.current = Date.now();
  };

  const end = async () => {
    if (!sessionStartRef.current) return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const durationSec = Math.floor((Date.now() - sessionStartRef.current) / 1000);
    sessionStartRef.current = null;

    try {
      const analytics = await getAnalytics();

      // increment sessions
      const prevN = analytics.sessions.totalSessions;
      const nextN = prevN + 1;

      const prevAvg = analytics.sessions.avgSessionTimeSec || 0;
      analytics.sessions.avgSessionTimeSec = (prevAvg * prevN + durationSec) / nextN;

      analytics.sessions.totalSessions = nextN;
      analytics.sessions.lastSessionAt = Date.now();

      // persist
      await AsyncStorage.setItem(`analytics:${uid}`, JSON.stringify(analytics));
      // also write to cloud (non-blocking)
      await setDoc(
        doc(db, "users", uid, "meta", "analytics"),
        {
          sessions: analytics.sessions,
          identity: { ...analytics.identity, lastActiveAt: Date.now() },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch {
      // silent
    }
  };

  start();

  const sub = AppState.addEventListener("change", (state) => {
    if (!mounted) return;

    if (state === "background") end();
    if (state === "active") start();
  });

  return () => {
    mounted = false;
    sub.remove();
    end();
  };
}, [user]);

  /* ================= REVENUECAT INIT ================= */
  useEffect(() => {
    initRevenueCat();
  }, []);

  /* ================= SAFETY TIMEOUT ================= */


  /* ================= REFERRAL CHECK ================= */
  useEffect(() => {
    if (!user) return;

    const checkReferral = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url && url.includes("?ref=")) {
          const refUid = url.split("?ref=")[1];
          if (refUid && refUid !== user.uid) {
        await safeFirestoreCall(
  () => handleReferral(refUid, user.uid),
  null
);

          }
        }
      } catch (err) {
        console.error("Referral check error:", err);
      }
    };

    checkReferral();
  }, [user]);

 /* ================= LOADING ================= */
if (loading || !fontsReady) {
  // 🧪 DEV ONLY: allow UI shell while auth resolves on Android emulator
  if (__DEV__ && Platform.OS === "android") {
    console.warn("🧪 DEV bypass: rendering shell while auth resolves");
  } else {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#061B3A",
        }}
      >
        <ActivityIndicator size="large" color="#F6C76B" />
      </View>
    );
  }
}


  /* ================= LOGGED OUT STACK ================= */
  if (!user) {
    return (
      <ForceUpdateGate>
        <Stack
  screenOptions={{
    headerShown: Platform.OS === "ios",
    headerTitle: "",
    gestureEnabled: true,
  }}
>

          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
        </Stack>
      </ForceUpdateGate>
    );
  }

  /* ================= LOGGED IN STACK ================= */
  return (
    <ForceUpdateGate>
      <View style={{ flex: 1 }}>
        <RankUpPopup />


      <Stack
  screenOptions={{
    headerShown: Platform.OS === "ios",
    headerTitle: "",
    gestureEnabled: true,
  }}
>

          <Stack.Screen name="splash" />
        <Stack.Screen name="sudokuIntro" />
        <Stack.Screen name="sudoku" />
        <Stack.Screen name="chooseDifficulty" />
        <Stack.Screen name="daily" />
        <Stack.Screen name="history" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="account" />
        <Stack.Screen name="leaderboard" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="stats" />
        <Stack.Screen name="testConfetti" />
      </Stack>
      </View>
    </ForceUpdateGate>
  );
}


