import type { ReactNode } from "react";
import { ImageBackground, ScrollView, StyleSheet, View } from "react-native";
import { sweirkiTheme } from "../theme/sweirkiTheme";

export default function ArenaLayout({ children }: { children: ReactNode }) {
  return (
    <ImageBackground
      source={sweirkiTheme.assets.homeBackground}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.wash}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: sweirkiTheme.colors.screen,
  },
  wash: {
    flex: 1,
    backgroundColor: "rgba(246,251,255,0.62)",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: sweirkiTheme.layout.screenPaddingX,
    paddingTop: 64,
    paddingBottom: 34,
  },
});
