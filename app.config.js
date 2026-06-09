export default ({ config }) => ({
  ...config,

  name: "Sweirki Sudoku",
  slug: "sam-sudoku-relinked-v2",
  version: "4.2.6",

  assetBundlePatterns: ["**/*"],

  extra: {
    eas: {
      projectId: "c4fddd7b-dab8-45ae-96b4-38d755292c3f",
    },
  },

  orientation: "portrait",
  scheme: "sweirki",
  icon: "./assets/branding/app-icon.png",

  splash: {
    image: "./assets/transparent-splash.png",
    resizeMode: "contain",
    backgroundColor: "#EEF4FA",
  },

  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.sweirki.sudoku",
    buildNumber: "23",
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },

  android: {
    package: "com.gamesworld.samsudoko",
    versionCode: 26,
    backgroundColor: "#EEF4FA",

    permissions: [
      "com.android.vending.BILLING",
      "android.permission.VIBRATE",
    ],

    blockedPermissions: [
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
    ],

    adaptiveIcon: {
      foregroundImage: "./assets/branding/app-icon.png",
      backgroundColor: "#EEF4FA",
    },

    config: {
      googleMobileAdsAppId: "ca-app-pub-9603430285076746~3724641130",
    },
  },

  web: {
    favicon: "./assets/branding/app-icon.png",
  },

  plugins: [
    "expo-asset",
    "expo-font",
    "expo-web-browser",

    [
      "react-native-google-mobile-ads",
      {
        androidAppId: "ca-app-pub-9603430285076746~3724641130",
        iosAppId: "ca-app-pub-9603430285076746~1458002511",
        delayAppMeasurementInit: true,
      },
    ],

    [
      "expo-build-properties",
      {
        ios: {
          useFrameworks: "static",
        },
      },
    ],

    "expo-router",
  ],
});
