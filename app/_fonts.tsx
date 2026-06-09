import { useFonts } from "expo-font";
import React from "react";
import { ActivityIndicator, View } from "react-native";

export default function FontProvider({ children }: { children: React.ReactNode }) {
  const [loaded] = useFonts({
    Nunito: require("../assets/fonts/Nunito.ttf"),
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4A90E2" />
      </View>
    );
  }

  return <>{children}</>;
}

