import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Legacy compatibility wrapper.
 *
 * The active achievement system now lives in:
 * app/stores/useAchievementsStore.ts
 * src/game/onGameFinished.ts
 *
 * Do not add achievement rules here.
 */

const LEGACY_KEY_PREFIX = "achievements:";

function normalizeAchievementList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  return Array.from(
    new Set(
      raw
        .filter((item): item is string => typeof item === "string")
        .filter(Boolean)
    )
  );
}

export async function unlockAchievements(email: string, stats: any = {}) {
  const key = `${LEGACY_KEY_PREFIX}${email || "local"}`;

  try {
    const raw = await AsyncStorage.getItem(key);
    const existing = raw ? normalizeAchievementList(JSON.parse(raw)) : [];
    await AsyncStorage.setItem(key, JSON.stringify(existing));
    return existing;
  } catch {
    return [];
  }
}

export async function getAchievements(email: string) {
  const key = `${LEGACY_KEY_PREFIX}${email || "local"}`;

  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? normalizeAchievementList(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}
