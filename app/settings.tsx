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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { getColors } from "./theme/index";

export default function SettingsScreen() {
  const router = useRouter();
  const colors = getColors();
  // global
  const [confirmVisible, setConfirmVisible] = useState(false);

  // sounds & haptics
  const [soundTap, setSoundTap] = useState(true);
  const [soundSuccess, setSoundSuccess] = useState(true);
  const [soundError, setSoundError] = useState(true);
  const [haptics, setHaptics] = useState(true);

  /* ================= LOAD SETTINGS ================= */
  useEffect(() => {
    (async () => {
      const keys = [
        "soundTap",
        "soundSuccess",
        "soundError",
        "haptics",
      ];

      try {
        const values = await AsyncStorage.multiGet(keys);
        const obj: Record<string, string | null> =
          Object.fromEntries(values);

        setSoundTap(obj.soundTap !== "0");
        setSoundSuccess(obj.soundSuccess !== "0");
        setSoundError(obj.soundError !== "0");
        setHaptics(obj.haptics !== "0");
      } catch (err) {
        console.warn("⚠️ Settings load error:", err);
      }
    })();
  }, []);

  /* ================= SAVE TOGGLES ================= */
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

  /* ================= LOGOUT ================= */
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

  /* ================= UI ================= */
  return (
    <ImageBackground
      source={require("../assets/bg.png")}
      style={styles(colors).bg}
      blurRadius={3}
    >
      <ScrollView
        contentContainerStyle={styles(colors).scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles(colors).title}>Settings</Text>

        {/* Sounds & Haptics */}
        <Section title="Sounds & Haptics">
          <Row label="Tap Sound">
            <Switch
              value={soundTap}
              onValueChange={(v) =>
                saveToggle("soundTap", v, setSoundTap)
              }
            />
          </Row>
          <Row label="Success Sound">
            <Switch
              value={soundSuccess}
              onValueChange={(v) =>
                saveToggle("soundSuccess", v, setSoundSuccess)
              }
            />
          </Row>
          <Row label="Error Sound">
            <Switch
              value={soundError}
              onValueChange={(v) =>
                saveToggle("soundError", v, setSoundError)
              }
            />
          </Row>
          <Row label="Haptics">
            <Switch
              value={haptics}
              onValueChange={(v) =>
                saveToggle("haptics", v, setHaptics)
              }
            />
          </Row>
        </Section>


        {/* Account */}
        <Section title="Account">
          <GoldButton
            label="Sign Out"
            danger
            onPress={() => setConfirmVisible(true)}
          />
        </Section>

        {/* About */}
        <Section title="About">
          <View style={styles(colors).aboutCard}>
            <Text style={styles(colors).aboutTitle}>Sudoku</Text>
            <Text style={styles(colors).aboutText}>Version 1.0.6</Text>
            <Text style={styles(colors).aboutText}>
              Built For Sam @ Zaina
            </Text>
          </View>
        </Section>
      </ScrollView>

      {/* Logout Modal */}
      <Modal
        transparent
        visible={confirmVisible}
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={styles(colors).overlay}>
          <View style={styles(colors).modal}>
            <Text style={styles(colors).modalTitle}>
              Log out everywhere?
            </Text>
            <View style={{ flexDirection: "row", marginTop: 15 }}>
              <Pressable
                style={[
                  styles(colors).modalBtn,
                  { backgroundColor: "#C0392B" },
                ]}
                onPress={logout}
              >
                <Text style={styles(colors).modalTxt}>Yes</Text>
              </Pressable>
              <Pressable
                style={[
                  styles(colors).modalBtn,
                  {
                    backgroundColor:
                      colors.buttonSecondaryBg,
                  },
                ]}
                onPress={() => setConfirmVisible(false)}
              >
                <Text style={styles(colors).modalTxt}>
                  Cancel
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
}

/* ================= UI HELPERS ================= */

function Section({ title, children }: any) {
  const colors = getColors();
  return (
    <View style={{ width: "90%", marginTop: 15 }}>
      <Text style={styles(colors).sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, children }: any) {
  const colors = getColors();
  return (
    <View style={styles(colors).row}>
      <Text style={styles(colors).label}>{label}</Text>
      {children}
    </View>
  );
}

function GoldButton({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const colors = getColors();
  return (
    <LinearGradient
      colors={
        danger
          ? ["#D85151", "#B52E2E"]
          : ["#FFF3C0", "#D8B24A"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles(colors).goldBtn}
    >
      <TouchableOpacity
        onPress={onPress}
        style={{ width: "100%", alignItems: "center" }}
      >
        <Text
          style={[
            styles(colors).goldTxt,
            { color: danger ? "#FFF" : "#0A1B3D" },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    </LinearGradient>
  );
}

/* ================= STYLES ================= */

const styles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    bg: { flex: 1, resizeMode: "cover" },
    scroll: {
      alignItems: "center",
      paddingBottom: 80,
      paddingTop: 10,
    },
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: "#FBE7A1",
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#FBE7A1",
      marginBottom: 6,
      marginLeft: 4,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: "rgba(0,0,30,0.6)",
      borderRadius: 14,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginVertical: 5,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.2)",
    },
    label: {
      fontSize: 13,
      fontWeight: "500",
      color: "#FFF",
    },
    goldBtn: {
      marginTop: 8,
      borderRadius: 16,
      overflow: "hidden",
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      elevation: 5,
    },
    goldTxt: {
      fontSize: 13,
      fontWeight: "700",
      paddingVertical: 10,
    },
    aboutCard: {
      backgroundColor: "rgba(0,0,30,0.55)",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
      alignItems: "center",
      padding: 10,
      marginTop: 8,
    },
    aboutTitle: {
      color: "#FBE7A1",
      fontWeight: "700",
      fontSize: 14,
    },
    aboutText: { color: "#FFF", fontSize: 12 },
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modal: {
      width: "75%",
      backgroundColor: "rgba(0,0,30,0.85)",
      borderRadius: 14,
      padding: 18,
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.25)",
      alignItems: "center",
    },
    modalTitle: {
      color: "#FBE7A1",
      fontSize: 15,
      fontWeight: "700",
    },
    modalBtn: {
      flex: 1,
      marginHorizontal: 6,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
    },
    modalTxt: {
      color: "#FFF",
      fontWeight: "700",
      fontSize: 13,
    },
  });
