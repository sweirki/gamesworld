import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";

export type ArenaFeedbackEvent =
  | "tap"
  | "matchStart"
  | "powerReveal"
  | "powerShield"
  | "powerFreeze"
  | "shieldBlock"
  | "mistake"
  | "victory"
  | "defeat"
  | "promotion"
  | "badgeUnlock"
  | "cupChampion"
  | "rewardClaim";

const SOUND_SOURCES: Partial<Record<ArenaFeedbackEvent, number>> = {
  tap: require("../../assets/sounds/arena_tap.mp3"),
  matchStart: require("../../assets/sounds/arena_match_start.mp3"),
  powerReveal: require("../../assets/sounds/arena_power_reveal.mp3"),
  powerShield: require("../../assets/sounds/arena_power_shield.mp3"),
  powerFreeze: require("../../assets/sounds/arena_power_freeze.mp3"),
  shieldBlock: require("../../assets/sounds/arena_shield_block.mp3"),
  mistake: require("../../assets/sounds/arena_mistake.mp3"),
  victory: require("../../assets/sounds/arena_victory.mp3"),
  defeat: require("../../assets/sounds/arena_defeat.mp3"),
  promotion: require("../../assets/sounds/arena_promotion.mp3"),
  badgeUnlock: require("../../assets/sounds/arena_badge_unlock.mp3"),
  cupChampion: require("../../assets/sounds/arena_cup_champion.mp3"),
  rewardClaim: require("../../assets/sounds/arena_reward_claim.mp3"),
};

const SOUND_SETTING_BY_EVENT: Partial<Record<ArenaFeedbackEvent, string>> = {
  tap: "soundTap",
  matchStart: "soundTap",
  powerReveal: "soundSuccess",
  powerShield: "soundSuccess",
  powerFreeze: "soundSuccess",
  shieldBlock: "soundSuccess",
  mistake: "soundError",
  victory: "soundSuccess",
  defeat: "soundError",
  promotion: "soundSuccess",
  badgeUnlock: "soundSuccess",
  cupChampion: "soundSuccess",
  rewardClaim: "soundSuccess",
};

const VOLUME_BY_EVENT: Partial<Record<ArenaFeedbackEvent, number>> = {
  tap: 0.34,
  matchStart: 0.62,
  powerReveal: 0.58,
  powerShield: 0.58,
  powerFreeze: 0.52,
  shieldBlock: 0.62,
  mistake: 0.48,
  victory: 0.72,
  defeat: 0.48,
  promotion: 0.78,
  badgeUnlock: 0.76,
  cupChampion: 0.82,
  rewardClaim: 0.62,
};

const cache: Partial<Record<ArenaFeedbackEvent, Audio.Sound>> = {};

async function isEnabled(key: string) {
  try {
    const value = await AsyncStorage.getItem(key);
    return value !== "0";
  } catch {
    return true;
  }
}

export async function playArenaSound(event: ArenaFeedbackEvent) {
  const source = SOUND_SOURCES[event];
  if (!source) return;

  const setting = SOUND_SETTING_BY_EVENT[event] ?? "soundSuccess";
  if (!(await isEnabled(setting))) return;

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    if (!cache[event]) {
      const { sound } = await Audio.Sound.createAsync(source, { volume: VOLUME_BY_EVENT[event] ?? 0.55 });
      cache[event] = sound;
    }

    await cache[event]?.replayAsync();
  } catch {
    // Arena feedback must never block gameplay.
  }
}

export async function playArenaHaptic(event: ArenaFeedbackEvent) {
  if (!(await isEnabled("haptics"))) return;

  try {
    if (event === "mistake" || event === "defeat") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (event === "shieldBlock") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    if (event === "victory" || event === "promotion" || event === "badgeUnlock" || event === "cupChampion" || event === "rewardClaim") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    if (event === "powerReveal" || event === "powerShield" || event === "powerFreeze" || event === "matchStart") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    }

    await Haptics.selectionAsync();
  } catch {
    // Silent fail on devices/simulators without haptic support.
  }
}

export async function playArenaFeedback(event: ArenaFeedbackEvent) {
  await Promise.all([playArenaSound(event), playArenaHaptic(event)]);
}
