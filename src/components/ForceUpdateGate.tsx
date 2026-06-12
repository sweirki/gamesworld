import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Constants from "expo-constants";
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

const bg = require("../../assets/branding/home-background.png");

const ANDROID_STORE_FALLBACK =
  "https://play.google.com/store/apps/details?id=com.gamesworld.samsudoko";
const IOS_STORE_FALLBACK = "https://apps.apple.com/app/sweirki-sudoku";

type ReleaseConfig = {
  forceUpdate?: boolean;
  latestVersion?: string;
  minAndroidVersionCode?: number;
  minIosBuildNumber?: number;
  androidStoreUrl?: string;
  iosStoreUrl?: string;
  message?: string;
};

type GateState =
  | { status: "checking" }
  | { status: "allowed" }
  | { status: "blocked"; config: ReleaseConfig };

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCurrentBuildNumber() {
  return toNumber(Constants.nativeBuildVersion, 0);
}

function getCurrentVersion() {
  return (
    Constants.nativeAppVersion ||
    Constants.expoConfig?.version ||
    "4.2.7"
  );
}

function getRequiredBuild(config: ReleaseConfig) {
  if (Platform.OS === "ios") return toNumber(config.minIosBuildNumber, 0);
  return toNumber(config.minAndroidVersionCode, 0);
}

function getStoreUrl(config: ReleaseConfig) {
  if (Platform.OS === "ios") return config.iosStoreUrl || IOS_STORE_FALLBACK;
  return config.androidStoreUrl || ANDROID_STORE_FALLBACK;
}

export default function ForceUpdateGate({ children }: { children: React.ReactNode }) {
  const [gate, setGate] = useState<GateState>({ status: "checking" });

  useEffect(() => {
    let mounted = true;

    const checkReleaseConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "appConfig", "release"));

        if (!mounted) return;

        if (!snap.exists()) {
          setGate({ status: "allowed" });
          return;
        }

        const config = snap.data() as ReleaseConfig;
        const requiredBuild = getRequiredBuild(config);
        const currentBuild = getCurrentBuildNumber();
        const shouldBlock = Boolean(config.forceUpdate) && requiredBuild > 0 && currentBuild < requiredBuild;

        setGate(shouldBlock ? { status: "blocked", config } : { status: "allowed" });
      } catch (error) {
        console.warn("Force update check failed:", error);
        if (mounted) setGate({ status: "allowed" });
      }
    };

    checkReleaseConfig();

    return () => {
      mounted = false;
    };
  }, []);

  const currentVersion = useMemo(() => getCurrentVersion(), []);

  if (gate.status === "checking") {
    return (
      <ImageBackground source={bg} style={styles.bg} resizeMode="cover">
        <View style={styles.centerCard}>
          <ActivityIndicator size="large" color="#F6C76B" />
          <Text style={styles.checkingText}>Checking app version...</Text>
        </View>
      </ImageBackground>
    );
  }

  if (gate.status === "allowed") {
    return <>{children}</>;
  }

  const latestVersion = gate.config.latestVersion || "the latest version";
  const message =
    gate.config.message ||
    "A new Sweirki Sudoku update is required to continue playing.";

  const openStore = async () => {
    const url = getStoreUrl(gate.config);
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn("Store link failed:", error);
    }
  };

  return (
    <ImageBackground source={bg} style={styles.bg} resizeMode="cover">
      <View style={styles.blockWrap}>
        <LinearGradient
          colors={["rgba(255,255,255,0.98)", "rgba(230,247,255,0.96)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.updateCard}
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Required Update</Text>
          </View>

          <Text style={styles.title}>Update Sweirki Sudoku</Text>
          <Text style={styles.subtitle}>{message}</Text>

          <View style={styles.versionBox}>
            <Text style={styles.versionLabel}>Installed</Text>
            <Text style={styles.versionValue}>Version {currentVersion}</Text>
          </View>

          <View style={styles.versionBox}>
            <Text style={styles.versionLabel}>Latest</Text>
            <Text style={styles.versionValue}>Version {latestVersion}</Text>
          </View>

          <TouchableOpacity activeOpacity={0.88} style={styles.button} onPress={openStore}>
            <Text style={styles.buttonText}>Update Now</Text>
          </TouchableOpacity>

          <Text style={styles.footerText}>
            This keeps rankings, purchases, and live features compatible.
          </Text>
        </LinearGradient>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#061B3A",
  },
  centerCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  checkingText: {
    marginTop: 14,
    color: "#F6C76B",
    fontFamily: "BalooBold",
    fontSize: 17,
  },
  blockWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 22,
  },
  updateCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 30,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#061B3A",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16,
  },
  badgeText: {
    color: "#F6C76B",
    fontFamily: "BalooBold",
    fontSize: 13,
  },
  title: {
    color: "#08224A",
    fontFamily: "BalooBold",
    fontSize: 30,
    lineHeight: 34,
  },
  subtitle: {
    color: "#31506F",
    fontFamily: "BalooRegular",
    fontSize: 16,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 18,
  },
  versionBox: {
    backgroundColor: "rgba(6, 27, 58, 0.06)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 10,
  },
  versionLabel: {
    color: "#6A7D90",
    fontFamily: "BalooBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  versionValue: {
    color: "#08224A",
    fontFamily: "BalooBold",
    fontSize: 18,
    marginTop: 2,
  },
  button: {
    backgroundColor: "#061B3A",
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 15,
    marginTop: 12,
  },
  buttonText: {
    color: "#F6C76B",
    fontFamily: "BalooBold",
    fontSize: 18,
  },
  footerText: {
    color: "#6A7D90",
    fontFamily: "BalooRegular",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 14,
  },
});
