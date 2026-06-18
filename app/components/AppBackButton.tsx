import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet } from "react-native";

export default function AppBackButton() {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={10}
      onPress={() => router.back()}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name="chevron-back" size={24} color="#12385A" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: "absolute",
    top: Platform.OS === "ios" ? 44 : 18,
    left: 14,
    zIndex: 100,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(186,223,241,0.72)",
    shadowColor: "#76BCE7",
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  pressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.82,
  },
});
