const expoConfig = require("eslint-config-expo/flat");

module.exports = [
  ...expoConfig,
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".expo/**",
      ".expo-shared/**",
      "android/**",
      "ios/**",
    ],
  },
];
