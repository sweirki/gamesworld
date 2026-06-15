// utils/adsManager.tsx
// Sweirki monetization policy: rewarded ads only, always user initiated.
// No banners, no interstitials, and absolutely no ads during gameplay boards.
import React from "react";
import mobileAds, { AdEventType, RewardedAd, RewardedAdEventType, TestIds } from "react-native-google-mobile-ads";
import { adConfig } from "./adConfig";
import { isAdFree } from "./premiumManager";

export async function initAds() {
  await mobileAds().initialize();
}

export function BannerAd() {
  return null;
}

export async function showInterstitial() {
  return;
}

export async function showRewarded(): Promise<boolean> {
  const adFree = await isAdFree();
  if (adFree) return true;

  const rewarded = RewardedAd.createForAdRequest(adConfig.rewarded || TestIds.REWARDED);

  return new Promise((resolve) => {
    let earned = false;
    let settled = false;
    const cleanup: Array<() => void> = [];
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      cleanup.forEach((fn) => fn());
      resolve(value);
    };
    cleanup.push(rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => { earned = true; }));
    cleanup.push(rewarded.addAdEventListener(AdEventType.LOADED, () => rewarded.show().catch(() => finish(false))));
    cleanup.push(rewarded.addAdEventListener(AdEventType.CLOSED, () => finish(earned)));
    cleanup.push(rewarded.addAdEventListener(AdEventType.ERROR, () => finish(false)));
    rewarded.load();
    setTimeout(() => finish(false), 15000);
  });
}
