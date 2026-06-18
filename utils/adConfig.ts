// utils/adConfig.ts
// Central AdMob unit IDs.
// Rewarded ads now use real production AdMob units per platform.
// Banner/interstitial remain on Google test IDs until those placements are actively used.

import { Platform } from "react-native";

const TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";
const TEST_INTERSTITIAL_ID = "ca-app-pub-3940256099942544/1033173712";

const IOS_REWARDED_ID = "ca-app-pub-9603430285076746/1907315908";
const ANDROID_REWARDED_ID = "ca-app-pub-9603430285076746/6014957589";

export const adConfig = {
  banner: TEST_BANNER_ID,
  interstitial: TEST_INTERSTITIAL_ID,
  rewarded: Platform.select({
    ios: IOS_REWARDED_ID,
    android: ANDROID_REWARDED_ID,
    default: ANDROID_REWARDED_ID,
  }),
};