// /app/theme/sweirkiTheme.ts
// Shared Sweirki visual tokens extracted from the current design references:
// - app/splash.tsx
// - app/sudokuIntro.tsx
//
// Purpose:
// Use these tokens for the full-app visual redesign so the rest of the app
// follows the same bright premium Sudoku identity without guessing colors.

import { Dimensions } from "react-native";

const { width } = Dimensions.get("window");

export const sweirkiLayout = {
  screenPaddingX: 20,
  screenPaddingTop: 18,
  screenPaddingBottom: 26,
  contentWidth: Math.min(400, width * 0.92),
  ctaWidth: Math.min(330, width * 0.84),
  maxCardWidth: 400,
} as const;

export const sweirkiRadius = {
  pill: 999,
  soft: 18,
  card: 24,
  hero: 30,
  modal: 34,
} as const;

export const sweirkiSpacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 28,
  screen: 36,
} as const;

export const sweirkiFonts = {
  regular: "BalooRegular",
  bold: "BalooBold",
} as const;

export const sweirkiColors = {
  // App canvas / background system
  screen: "#F6FBFF",
  splashScreen: "#F7FCFF",
  nativeSplash: "#EEF4FA",

  // Core text system
  ink: "#14385F",
  inkStrong: "#163A5F",
  inkDeep: "#0F2D4B",
  text: "#245073",
  textSoft: "#6C8AA6",
  textMuted: "#7D93A8",
  textFaint: "#7891A8",
  white: "#FFFFFF",

  // Brand accents from splash / intro
  cyan: "#35C8F4",
  cyanSplash: "#35BDF4",
  cyanStrong: "#2EB9E9",
  cyanDeep: "#248DCE",
  aqua: "#6BE5C9",
  purple: "#8F79FF",
  gold: "#F5B943",

  // Glass / cards
  glass: "rgba(255,255,255,0.82)",
  glassSoft: "rgba(255,255,255,0.78)",
  glassStrong: "rgba(255,255,255,0.96)",
  splashGlass: "rgba(255,255,255,0.72)",
  shine: "rgba(255,255,255,0.14)",

  // Borders / overlays
  borderCyan: "rgba(91,202,245,0.28)",
  borderCyanStrong: "rgba(53,200,244,0.32)",
  borderCta: "rgba(90,196,235,0.36)",
  scrim: "rgba(15,45,75,0.36)",

  // Shadows
  shadowCyan: "#35C8F4",
  shadowBlue: "#39BFEF",
  shadowSoft: "#5CCDF3",
  shadowSplash: "#50C8FF",
  shadowIntro: "#61D0F7",

  // Gradients used by the reference screens
  heroGradient: ["rgba(255,255,255,0.96)", "rgba(231,250,255,0.94)", "rgba(243,239,255,0.92)"],
  primaryCtaGradient: ["#35C8F4", "#6BE5C9"],
  progressTrack: "rgba(163, 218, 255, 0.28)",
} as const;

export const sweirkiShadows = {
  glassCard: {
    shadowColor: sweirkiColors.shadowIntro,
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 7,
  },
  hero: {
    shadowColor: sweirkiColors.shadowBlue,
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 9,
  },
  cta: {
    shadowColor: sweirkiColors.shadowCyan,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  splashBadge: {
    shadowColor: sweirkiColors.shadowSplash,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const sweirkiAssets = {
  homeBackground: require("../../assets/branding/home-background.png"),
  splashArtwork: require("../../assets/branding/splash-artwork.png"),
  logoSymbol: require("../../assets/branding/logo-symbol.png"),
  homeLogo: require("../../assets/branding/sweirki-home-logo.png"),
  iconModes: require("../../assets/branding/icon-modes.png"),
  iconArena: require("../../assets/branding/icon-arena.png"),
  iconAchievements: require("../../assets/branding/icon-achievements.png"),
  tierStandard: require("../../assets/branding/tier-standard-light-transparent.png"),
  tierPremium: require("../../assets/branding/tier-premium-light.png"),
} as const;

export const sweirkiTheme = {
  colors: sweirkiColors,
  fonts: sweirkiFonts,
  layout: sweirkiLayout,
  radius: sweirkiRadius,
  spacing: sweirkiSpacing,
  shadows: sweirkiShadows,
  assets: sweirkiAssets,
} as const;

export default sweirkiTheme;
