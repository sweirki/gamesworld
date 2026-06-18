import type { ReactNode } from "react";
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { sweirkiTheme } from "../theme/sweirkiTheme";
import AppBackButton from "../components/AppBackButton";

export default function ArenaLayout({
  children,
  title,
  subtitle,
  showBack = true,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}) {
  return (
    <ImageBackground source={sweirkiTheme.assets.homeBackground} style={styles.bg} resizeMode="cover">
      <View style={styles.wash}>
        {showBack ? <AppBackButton /> : null}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View style={styles.circlePlaceholder} />
            <View style={styles.titleBlock}>
              {!!subtitle && <Text style={styles.eyebrow}>{subtitle}</Text>}
              {!!title && <Text style={styles.title}>{title}</Text>}
            </View>
            <Pressable style={styles.circleBtn} onPress={() => router.push("/arena/rules" as any)}>
              <Ionicons name="shield-checkmark-outline" size={21} color={sweirkiTheme.colors.cyanDeep} />
            </Pressable>
          </View>
          {children}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: sweirkiTheme.colors.screen },
  wash: { flex: 1, backgroundColor: "rgba(246,251,255,0.58)" },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: sweirkiTheme.layout.screenPaddingX,
    paddingTop: 59,
    paddingBottom: 34,
  },
  topBar: {
    minHeight: 52,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  titleBlock: { flex: 1, paddingHorizontal: 12 },
  eyebrow: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 11,
    letterSpacing: 3.2,
    color: sweirkiTheme.colors.cyanDeep,
    textTransform: "uppercase",
  },
  title: {
    fontFamily: sweirkiTheme.fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    color: sweirkiTheme.colors.ink,
  },
  circleBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: sweirkiTheme.colors.borderCyanStrong,
    ...sweirkiTheme.shadows.splashBadge,
  },
  circlePlaceholder: { width: 50, height: 50 },
});
