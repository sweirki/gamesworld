import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeType = "light" | "dark" | "blue";

const palettes: Record<ThemeType, any> = {
  light: {
    background: "#FFFFFF",
    cellBackground: "#F9F9F9",
    altCellBackground: "#EDEDED",

    border: "rgba(125, 134, 158, 0.55)",
    boldBorder: "rgba(95, 104, 128, 0.85)",

    buttonPrimaryBg: "#FBE7A1",
    buttonSecondaryBg: "#D8B24A",
    buttonPrimaryText: "#0A1B3D",

    enteredNumber: "#0A1B3D",
    givenNumber: "#000000",
    secondaryText: "#3B2A00",

    highlight: "rgba(0,0,0,0.08)",
    highlightText: "#0A1B3D",
    wrongBackground: "rgba(255,0,0,0.12)",
    wrongNumber: "#D22B2B",
    contextHighlight: "rgba(0,0,0,0.10)",
    disabled: "#C7C7C7",
    menuRed: "#A93A3A",

    hyperZoneFill: "rgba(216, 178, 74, 0.08)",
    hyperZoneBorder: "rgba(216, 178, 74, 0.38)",
  },

  dark: {
    background: "#0B0B18",
    cellBackground: "#111628",
    altCellBackground: "#1A1F33",

    border: "rgba(95, 109, 145, 0.55)",
    boldBorder: "rgba(130, 146, 184, 0.90)",

    buttonPrimaryBg: "#1F2A4D",
    buttonSecondaryBg: "#D8B24A",
    buttonPrimaryText: "#0A1B3D",

    enteredNumber: "#0A1B3D",
    givenNumber: "#FBE7A1",
    secondaryText: "#9EA7C0",

    highlight: "rgba(255,255,255,0.10)",
    highlightText: "#FBE7A1",
    wrongBackground: "rgba(255,0,0,0.18)",
    wrongNumber: "#FF5A5A",
    contextHighlight: "rgba(255,215,0,0.15)",
    disabled: "#2F3B5C",
    menuRed: "#A93A3A",

    hyperZoneFill: "rgba(216, 178, 74, 0.10)",
    hyperZoneBorder: "rgba(216, 178, 74, 0.42)",
  },

  blue: {
    background: "#EAF2FF",
    cellBackground: "#FFFFFF",
    altCellBackground: "#F6FAFF",

    border: "rgba(126, 144, 177, 0.58)",
    boldBorder: "rgba(88, 104, 136, 0.88)",

    buttonPrimaryBg: "#FBE7A1",
    buttonSecondaryBg: "#D8B24A",
    buttonPrimaryText: "#FBE7A1",

    enteredNumber: "#FBE7A1",
    givenNumber: "#FFFFFF",
    secondaryText: "#C0D0F5",

    highlight: "rgba(0,0,0,0.08)",
    highlightText: "#0A1B3D",
    wrongBackground: "rgba(255,0,0,0.12)",
    wrongNumber: "#D22B2B",
    contextHighlight: "rgba(0,0,0,0.10)",
    disabled: "#C7C7C7",
    menuRed: "#A93A3A",

    hyperZoneFill: "rgba(216, 178, 74, 0.10)",
    hyperZoneBorder: "rgba(216, 178, 74, 0.45)",
  },
};

export const getColors = async (current?: ThemeType) => {
  let mode: ThemeType = current || "blue";

  try {
    const saved = await AsyncStorage.getItem("appTheme");
    if (saved && ["light", "dark", "blue"].includes(saved)) {
      mode = saved as ThemeType;
    }
  } catch (err) {
    console.log("getColors error:", err);
  }

  return palettes[mode] || palettes.blue;
};

export const getThemeName = async (): Promise<ThemeType> => {
  try {
    const saved = await AsyncStorage.getItem("appTheme");
    if (saved && ["light", "dark", "blue"].includes(saved)) {
      return saved as ThemeType;
    }
  } catch {}

  return "blue";
};

export const strokeBase = {
  stroke: "rgba(126, 144, 177, 0.58)",
  strokeBold: "rgba(88, 104, 136, 0.88)",
  strokeWidthBold: 3,
  strokeWidthThin: 1,
};

export const strokeBaseBold = {
  ...strokeBase,
  stroke: strokeBase.strokeBold,
  strokeWidth: 3,
};

export const strokeBaseThin = {
  ...strokeBase,
  strokeWidth: 1,
};

export default palettes;

export const theme = {
  spacing: (x: number) => x * 8,
};