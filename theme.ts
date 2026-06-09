import AsyncStorage from "@react-native-async-storage/async-storage";

export const theme = {
  mode: "light",

  colors: {
    // Global
    background: "#f2f2f2",
    card: "#ffffff",
    modalBg: "#ffffff",
    modalTitle: "#333333",
    timerText: "#FFA500",
    border: "#cccccc",
    badgeBg: "#f2f2f2",   // light grey badge background
    badgeText: "#333333", // dark text inside badge
    rankDefault: "#87CEFA",   // light sky blue

    // Buttons
    buttonPrimaryBg: "#2196f3",
    buttonPrimaryText: "#ffffff",
    disabled: "#bdbdbd",
    secondaryText: "#757575",

    // Menu variants
    menuGreen: "#4caf50",
    menuOrange: "#ff9800",
    menuBlue: "#2196f3",
    menuRed: "#f44336",
    menuGreyBg: "#9e9e9e",
    menuGreyText: "#000",
    menuText: "#fff",

    // Difficulty buttons
    difficultyEasy: "#4caf50",
    difficultyMedium: "#ff9800",
    difficultyHard: "#f44336",
    difficultyCancel: "#9e9e9e",

    // Win modal buttons
    winPlayAgain: "#4caf50",
    winLeaderboard: "#2196f3",
    winClose: "#f44336",

    // Sudoku board
    cellBackground: "#ffffff",
    altCellBackground: "#f5f5f5", // ~3% darker than pure white
    selected: "#bbdefb",
    selectedBorder: "#1976d2",
    contextHighlight: "#e3f2fd",
    highlight: "#64b5f6",
    highlightText: "#0d47a1",
    givenNumber: "#000000",
    enteredNumber: "#1E90FF", // âœ… user-entered numbers (blue)
    wrongBackground: "#ffcdd2",
    wrongNumber: "#b71c1c",

    // Overlay
    overlay: "rgba(0,0,0,0.4)",
    timerBg: "#eeeeee",

    // Ladder ranks (light mode)
    bronze: "#CD7F32",
    silver: "#C0C0C0",
    gold: "#FFD700",
    platinum: "#E5E4E2",
    diamond: "#00BFFF",
    master: "#8A2BE2",
    legend: "#FF4500",
    surface: "#ffffff",
    buttonText: "#ffffff",
    primaryText: "#333333",
    buttonBg: "#2196f3",
  },

  darkColors: {
    background: "#121212",
    card: "#1e1e1e",
    modalBg: "#1e1e1e",
    modalTitle: "#eeeeee",
    timerText: "#ffffff",
    border: "#444444",

    buttonPrimaryBg: "#90caf9",
    buttonPrimaryText: "#000000",
    disabled: "#616161",
    secondaryText: "#aaaaaa",

    menuGreen: "#81c784",
    menuOrange: "#ffb74d",
    menuBlue: "#64b5f6",
    menuRed: "#e57373",
    menuGreyBg: "#616161",
    menuGreyText: "#fff",
    menuText: "#fff",

    difficultyEasy: "#81c784",
    difficultyMedium: "#ffb74d",
    difficultyHard: "#e57373",
    difficultyCancel: "#616161",

    winPlayAgain: "#81c784",
    winLeaderboard: "#64b5f6",
    winClose: "#e57373",

    cellBackground: "#1e1e1e",
    altCellBackground: "#2c2c2c",
    selected: "#1565c0",
    selectedBorder: "#90caf9",
    contextHighlight: "#263238",
    highlight: "#42a5f5",
    highlightText: "#bbdefb",
    givenNumber: "#ffffff",
    enteredNumber: "#90caf9", // âœ… user-entered numbers (blue in dark mode)
    wrongBackground: "#b71c1c",
    wrongNumber: "#ff8a80",

    overlay: "rgba(0,0,0,0.6)",
    timerBg: "#333333",

    // Ladder ranks (dark mode)
    bronze: "#8C6239",
    silver: "#B0B0B0",
    gold: "#FFD700",
    platinum: "#B8B8B8",
    diamond: "#1E90FF",
    master: "#9370DB",
    legend: "#FF6347",
    surface: "#1e1e1e",
    buttonText: "#000000",
    primaryText: "#eeeeee",
    buttonBg: "#90caf9",
  },

  // âœ… New Blue Palette (Phase 3)
  blueColors: {
    background: "#001F3F",
    card: "#003366",
    modalBg: "#003366",
    modalTitle: "#00BFFF",
    timerText: "#00BFFF",
    border: "#004080",

    buttonPrimaryBg: "#00BFFF",
    buttonPrimaryText: "#ffffff",
    disabled: "#005f7f",
    secondaryText: "#80DEEA",

    menuGreen: "#00e676",
    menuOrange: "#ff9100",
    menuBlue: "#00BFFF",
    menuRed: "#ff1744",
    menuGreyBg: "#004466",
    menuGreyText: "#fff",
    menuText: "#fff",

    difficultyEasy: "#00e676",
    difficultyMedium: "#ff9100",
    difficultyHard: "#ff1744",
    difficultyCancel: "#004466",

    winPlayAgain: "#00e676",
    winLeaderboard: "#00BFFF",
    winClose: "#ff1744",

    cellBackground: "#002244",
    altCellBackground: "#003366",
    selected: "#005f99",
    selectedBorder: "#00BFFF",
    contextHighlight: "#004466",
    highlight: "#3399ff",
    highlightText: "#E0F7FA",
    givenNumber: "#ffffff",
    enteredNumber: "#00BFFF",
    wrongBackground: "#660000",
    wrongNumber: "#ff6666",

    overlay: "rgba(0,0,64,0.7)",
    timerBg: "#002244",

    // Ladder ranks (blue mode)
    bronze: "#CD7F32",
    silver: "#C0C0C0",
    gold: "#FFD700",
    platinum: "#00CED1",
    diamond: "#1E90FF",
    master: "#4682B4",
    legend: "#00BFFF",
    surface: "#003366",
    buttonText: "#ffffff",
    primaryText: "#E0F7FA",
    buttonBg: "#00BFFF",
  },

  spacing: {
    padding: 16,
    margin: 8,
    borderRadius: 12,
  },
};

// âœ… Async theme handling
let cachedTheme: "light" | "dark" | "blue" = "light";

AsyncStorage.getItem("appTheme").then((val) => {
  if (val === "dark" || val === "blue") {
    cachedTheme = val;
  } else {
    cachedTheme = "light";
  }
});

const withColorAliases = <T extends Record<string, string>>(palette: T) => {
  const text = palette.text ?? palette.modalTitle ?? "#0A1B3D";
  const card = palette.card ?? palette.background;
  const primaryBg = palette.buttonPrimaryBg ?? "#2196f3";
  const primaryText = palette.buttonPrimaryText ?? "#ffffff";

  return {
    ...palette,
    fg: palette.fg ?? text,
    subText: palette.subText ?? palette.secondaryText ?? text,
    textPrimary: palette.textPrimary ?? text,
    primaryText: palette.primaryText ?? text,
    buttonText: palette.buttonText ?? primaryText,
    buttonBg: palette.buttonBg ?? primaryBg,
    surface: palette.surface ?? card,
    bgDark: palette.bgDark ?? palette.background,
    bgMid: palette.bgMid ?? card,
    backgroundDark: palette.backgroundDark ?? palette.background,
    gold: palette.gold ?? "#FFD700",
    goldLight: palette.goldLight ?? "#FBE7A1",
  };
};

// Updated getColors
export const getColors = () => {
  if (cachedTheme === "dark") return withColorAliases(theme.darkColors);
  if (cachedTheme === "blue") return withColorAliases(theme.blueColors);
  return withColorAliases(theme.colors);
};

// ===== Added for Profile screen fixes =====
export const profileFixTokens = {
  colors: {
    cardBg: "rgba(255,255,255,0.4)",   // translucent white background
    buttonPrimaryText: "#FFFFFF",      // text on buttons
    danger: "#E53935",                 // red for logout/delete
    secondaryText: "#B0BEC5",          // subtitles/muted text
    buttonBg: "#4CAF50",               // green buttons
  }
};

