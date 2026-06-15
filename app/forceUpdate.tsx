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
import { db } from "../firebase";

const bg = require("../assets/branding/home-background.png");

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

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getCurrentVersion() {
  return Constants.nativeAppVersion || Constants.expoConfig?.version || "4.2.7";
}

function getStoreUrl(config: ReleaseConfig | null) {
  if (Platform.OS === "ios") return config?.iosStoreUrl || IOS_STORE_FALLBACK;
  return config?.androidStoreUrl || ANDROID_STORE_FALLBACK;
}

export default function ForceUpdateScreen() {
  const [config, setConfig] = useState<ReleaseConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const currentVersion = useMemo(() => getCurrentVersion(), []);

  useEffect(() => {
    let mounted = true;

    const loadConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "appConfig", "release"));
        if (mounted && snap.exists()) setConfig(snap.data() as ReleaseConfig);
      } catch (error) {
        console.warn("Force update screen config failed:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadConfig();

    return () => {
      mounted = false;
    };
  }, []);

  const openStore = async () => {
    try {
      await Linking.openURL(getStoreUrl(config));
    } catch (error) {
      console.warn("Store link failed:", error);
    }
  };

  const latestVersion = config?.latestVersion || "the latest version";
  const message =
    config?.message || "A new Sweirki Sudoku update is required to continue playing.";

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

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#061B3A" />
              <Text style={styles.loadingText}>Checking latest release...</Text>
            </View>
          ) : null}

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
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  loadingText: {
    color: "#31506F",
    fontFamily: "BalooRegular",
    fontSize: 14,
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
