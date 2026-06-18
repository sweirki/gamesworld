import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  ImageBackground,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Constants from "expo-constants";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import AppBackButton from "./components/AppBackButton";

const bg = require("../assets/branding/home-background.png");
const settingsHero = require("../assets/branding/settings/settings-hero.png");
const soundTapIcon = require("../assets/branding/settings/sound-tap.png");
const soundSuccessIcon = require("../assets/branding/settings/sound-success.png");
const soundErrorIcon = require("../assets/branding/settings/sound-error.png");
const hapticsIcon = require("../assets/branding/settings/haptics.png");
const accountIcon = require("../assets/branding/settings/account-shield.png");
const aboutIcon = require("../assets/branding/settings/about-info.png");

export default function SettingsScreen() {
  const router = useRouter();
  const appVersion = Constants.nativeAppVersion || Constants.expoConfig?.version || "4.2.7";
  const [confirmVisible, setConfirmVisible] = useState(false);

  const [soundTap, setSoundTap] = useState(true);
  const [soundSuccess, setSoundSuccess] = useState(true);
  const [soundError, setSoundError] = useState(true);
  const [haptics, setHaptics] = useState(true);

  useEffect(() => {
    (async () => {
      const keys = ["soundTap", "soundSuccess", "soundError", "haptics"];

      try {
        const values = await AsyncStorage.multiGet(keys);
        const obj: Record<string, string | null> = Object.fromEntries(values);

        setSoundTap(obj.soundTap !== "0");
        setSoundSuccess(obj.soundSuccess !== "0");
        setSoundError(obj.soundError !== "0");
        setHaptics(obj.haptics !== "0");
      } catch (err) {
        console.warn("Settings load error:", err);
      }
    })();
  }, []);

  const saveToggle = async (
    key: string,
    val: boolean,
    setter: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    setter(val);
    try {
      await AsyncStorage.setItem(key, val ? "1" : "0");
    } catch {}
  };

  const logout = async () => {
    try {
      await signOut(auth);
      await AsyncStorage.multiRemove([
        "username",
        "email",
        "onboardingComplete",
        "authToken",
      ]);

      router.replace("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <ImageBackground source={bg} style={styles.bg} resizeMode="cover">
      <AppBackButton />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerSpacer} />
          <Text style={styles.screenTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={["rgba(255,255,255,0.98)", "rgba(230,247,255,0.96)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroEyebrow}>Game Feel</Text>
            <Text style={styles.heroTitle}>Tune your Sweirki</Text>
            <Text style={styles.heroSubtitle}>
              Sound, haptics, and account controls in one clean place.
            </Text>
          </View>
          <Image source={settingsHero} style={styles.heroIcon} resizeMode="contain" />
        </LinearGradient>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sounds & Haptics</Text>
            <Text style={styles.sectionHint}>Instant feedback</Text>
          </View>

          <SettingRow
            icon={soundTapIcon}
            title="Tap Sound"
            subtitle="Small clicks for menu actions"
            value={soundTap}
            onValueChange={(v) => saveToggle("soundTap", v, setSoundTap)}
          />
          <SettingRow
            icon={soundSuccessIcon}
            title="Success Sound"
            subtitle="Reward tone for wins and good moves"
            value={soundSuccess}
            onValueChange={(v) => saveToggle("soundSuccess", v, setSoundSuccess)}
          />
          <SettingRow
            icon={soundErrorIcon}
            title="Error Sound"
            subtitle="Gentle alert for mistakes"
            value={soundError}
            onValueChange={(v) => saveToggle("soundError", v, setSoundError)}
          />
          <SettingRow
            icon={hapticsIcon}
            title="Haptics"
            subtitle="Light vibration for game feedback"
            value={haptics}
            onValueChange={(v) => saveToggle("haptics", v, setHaptics)}
            isLast
          />
        </View>

        <View style={styles.compactGrid}>
          <View style={styles.infoCard}>
            <Image source={aboutIcon} style={styles.infoIcon} resizeMode="contain" />
            <View style={styles.infoTextBlock}>
              <Text style={styles.infoTitle}>Sudoku</Text>
              <Text style={styles.infoText}>Version {appVersion}</Text>
              <Text style={styles.infoText}>Built For Sam @ Zaina</Text>
            </View>
          </View>

          <LinearGradient
            colors={["#FFE6A7", "#FFB66E"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.accountCard}
          >
            <Image source={accountIcon} style={styles.accountIcon} resizeMode="contain" />
            <View style={styles.accountTextBlock}>
              <Text style={styles.accountTitle}>Account</Text>
              <Text style={styles.accountText}>Signed in securely</Text>
            </View>
            <TouchableOpacity
              style={styles.signOutButton}
              onPress={() => setConfirmVisible(true)}
            >
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>

      <Modal
        transparent
        visible={confirmVisible}
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Image source={accountIcon} style={styles.modalIcon} resizeMode="contain" />
            <Text style={styles.modalTitle}>Sign out?</Text>
            <Text style={styles.modalSubtitle}>
              You can return anytime from the login screen.
            </Text>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalBtn, styles.logoutBtn]} onPress={logout}>
                <Text style={styles.logoutTxt}>Sign Out</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles.cancelTxt}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  isLast,
}: {
  icon: number;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.settingRow, isLast && styles.settingRowLast]}>
      <Image source={icon} style={styles.rowIcon} resizeMode="contain" />
      <View style={styles.rowTextBlock}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#D8E8F4", true: "#A6E2FF" }}
        thumbColor={value ? "#2F98D5" : "#FFFFFF"}
        ios_backgroundColor="#D8E8F4"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: "#F6FBFF",
  },
  scroll: {
    alignItems: "center",
    paddingTop: 59,
    paddingBottom: 44,
    paddingHorizontal: 18,
  },
  headerRow: {
    width: "100%",
    maxWidth: 430,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: "rgba(149,205,237,0.46)",
  },
  backText: {
    color: "#14385F",
    fontSize: 26,
    fontWeight: "800",
    lineHeight: 34,
    marginTop: -2,
  },
  screenTitle: {
    color: "#14385F",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.2,
  },
  headerSpacer: {
    width: 40,
  },
  heroCard: {
    width: "100%",
    maxWidth: 430,
    minHeight: 126,
    borderRadius: 30,
    paddingVertical: 16,
    paddingLeft: 20,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(149,205,237,0.42)",
    shadowColor: "#5DAEE8",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: 4,
  },
  heroEyebrow: {
    color: "#2E9BD8",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  heroTitle: {
    color: "#14385F",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 28,
  },
  heroSubtitle: {
    color: "#5E7F9B",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 6,
  },
  heroIcon: {
    width: 118,
    height: 118,
    marginRight: -4,
  },
  sectionCard: {
    width: "100%",
    maxWidth: 430,
    marginTop: 14,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 28,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(149,205,237,0.38)",
    shadowColor: "#72BFEF",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: "#14385F",
    fontSize: 15,
    fontWeight: "900",
  },
  sectionHint: {
    color: "#76A3C1",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 70,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(196,225,244,0.76)",
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  rowIcon: {
    width: 48,
    height: 48,
    marginRight: 10,
  },
  rowTextBlock: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    color: "#14385F",
    fontSize: 13,
    fontWeight: "900",
  },
  rowSubtitle: {
    color: "#7291A9",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 2,
  },
  compactGrid: {
    width: "100%",
    maxWidth: 430,
    marginTop: 14,
    gap: 12,
  },
  infoCard: {
    minHeight: 84,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 26,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(149,205,237,0.38)",
  },
  infoIcon: {
    width: 58,
    height: 58,
    marginRight: 12,
  },
  infoTextBlock: {
    flex: 1,
  },
  infoTitle: {
    color: "#14385F",
    fontWeight: "900",
    fontSize: 15,
  },
  infoText: {
    color: "#6C8CA5",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  accountCard: {
    minHeight: 92,
    borderRadius: 26,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    shadowColor: "#F3A94C",
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  accountIcon: {
    width: 58,
    height: 58,
    marginRight: 12,
  },
  accountTextBlock: {
    flex: 1,
  },
  accountTitle: {
    color: "#764A13",
    fontWeight: "900",
    fontSize: 16,
  },
  accountText: {
    color: "#9A6A2B",
    fontWeight: "800",
    fontSize: 12,
    marginTop: 2,
  },
  signOutButton: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  signOutText: {
    color: "#B44235",
    fontSize: 12,
    fontWeight: "900",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(20, 56, 95, 0.32)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  modal: {
    width: "100%",
    maxWidth: 350,
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(149,205,237,0.48)",
    alignItems: "center",
  },
  modalIcon: {
    width: 78,
    height: 78,
    marginBottom: 8,
  },
  modalTitle: {
    color: "#14385F",
    fontSize: 22,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: "#6F8EA6",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    width: "100%",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: "center",
  },
  logoutBtn: {
    backgroundColor: "#E45E54",
  },
  cancelBtn: {
    backgroundColor: "#EAF6FF",
  },
  logoutTxt: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },
  cancelTxt: {
    color: "#14385F",
    fontWeight: "900",
    fontSize: 13,
  },
});
