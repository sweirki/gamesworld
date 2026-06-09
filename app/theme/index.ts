// /app/theme/index.ts
import { LightTheme } from "./colors/light";
import { DarkTheme } from "./colors/dark";
import { BlueTheme } from "./colors/blue";

export type AppThemeMode = "light" | "dark" | "blue";

let currentTheme: AppThemeMode = "light";

export const setTheme = (mode: AppThemeMode) => {
  currentTheme = mode;
};

const withAliases = <T extends Record<string, string>>(palette: T) => {
  const text = palette.text ?? palette.number ?? palette.modalTitle ?? "#0A1B3D";
  const card = palette.card ?? palette.cellBackground ?? palette.background;
  const primaryBg = palette.buttonPrimaryBg ?? "#2196f3";
  const primaryText = palette.buttonPrimaryText ?? "#ffffff";

  return {
    ...palette,
    fg: palette.fg ?? text,
    subText: palette.subText ?? palette.secondaryText ?? text,
    secondaryText: palette.secondaryText ?? palette.subText ?? text,
    textPrimary: palette.textPrimary ?? text,
    primaryText: palette.primaryText ?? text,
    buttonText: palette.buttonText ?? primaryText,
    buttonBg: palette.buttonBg ?? primaryBg,
    surface: palette.surface ?? card,
    bgDark: palette.bgDark ?? palette.background,
    bgMid: palette.bgMid ?? card,
    disabled: palette.disabled ?? "#9CA3AF",
    rankDefault: palette.rankDefault ?? "#87CEFA",
    gold: palette.gold ?? "#FFD700",
    goldLight: palette.goldLight ?? "#FBE7A1",
    backgroundDark: palette.backgroundDark ?? palette.background,
  };
};

export const getColors = (): any => {
  if (currentTheme === "dark") return withAliases(DarkTheme);
  if (currentTheme === "blue") return withAliases(BlueTheme);
  return withAliases(LightTheme);
};

export { default as sweirkiTheme, sweirkiAssets, sweirkiColors, sweirkiFonts, sweirkiLayout, sweirkiRadius, sweirkiShadows, sweirkiSpacing } from "./sweirkiTheme";
