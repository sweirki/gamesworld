import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { auth } from "../../firebase";
import type { GameMode, PlayerAnalytics } from "../../src/analytics/playerAnalytics";

export type AchievementLevel = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master" | "Grandmaster";

export type AchievementGameResult = {
  mode: GameMode;
  win: boolean;
  time: number;
  errors: number;
  hintsUsed?: number;
  difficulty?: string;
  score?: number;
  totalPoints?: number;
  dailyStreak?: number;
  activityStreak?: number;
  analytics?: PlayerAnalytics | null;
};

export type AchievementsState = {
  unlocked: string[];
  level: number;
  xp: number;
  nextLevelXp: number;
  loadUnlocked: () => Promise<void>;
  unlock: (id: string) => Promise<void>;
  unlockMany: (ids: string[]) => Promise<void>;
  awardForGameResult: (result: AchievementGameResult) => Promise<void>;
  getTotalPoints: () => number;
  getLevel: () => AchievementLevel;
  getProgressPercent: () => number;
};

export const ACHIEVEMENTS = [
  { id: "points_collector", icon: "ðŸ“ˆ", title: "Points Collector", desc: "Accumulate a high total score across all game modes.", how: "Keep playing puzzles and earn points.", points: 40 },
  { id: "speed_demon", icon: "âš¡", title: "Speed Demon", desc: "Finish puzzles faster than most players.", how: "Complete any puzzle with an exceptional time.", points: 50 },
  { id: "first_win", icon: "ðŸ¥‡", title: "First Win", desc: "Complete your very first puzzle.", how: "Finish any puzzle to earn this badge.", points: 10 },
  { id: "flawless", icon: "ðŸ’Ž", title: "Flawless", desc: "Complete a puzzle with zero mistakes.", how: "Avoid any errors throughout a puzzle.", points: 80 },
  { id: "no_hint_master", icon: "ðŸ§ ", title: "No Hint Master", desc: "Finish a puzzle without using hints.", how: "Solve an entire puzzle on your own.", points: 60 },
  { id: "streak_keeper", icon: "ðŸ”¥", title: "Streak Keeper", desc: "Maintain a winning streak.", how: "Play daily and keep winning to grow your streak.", points: 40 },
  { id: "iron_stomach", icon: "ðŸ›¡ï¸", title: "Iron Stomach", desc: "Complete a puzzle without any errors.", how: "Play carefully â€” one mistake breaks the run.", points: 70 },
  { id: "hyper_samurai", icon: "ðŸŒ€", title: "Hyper Samurai", desc: "Win a Hyper Samurai puzzle.", how: "Complete a Hyper Samurai game mode.", points: 100 },
  { id: "killer_assassin", icon: "ðŸ’€", title: "Killer Assassin", desc: "Beat a Killer Sudoku puzzle.", how: "Complete a Killer puzzle on any difficulty.", points: 100 },
  { id: "x_master", icon: "âŒ", title: "X Master", desc: "Win an X-Sudoku puzzle.", how: "Finish an X-Sudoku puzzle.", points: 80 },
];

const VALID_ACHIEVEMENT_IDS = new Set(ACHIEVEMENTS.map((achievement) => achievement.id));
const LEGACY_GLOBAL_KEY = "unlockedAchievements";

const LEGACY_NAME_TO_ID: Record<string, string> = {
  "First Win": "first_win",
  "First Victory": "first_win",
  "10 Wins": "points_collector",
  "50 Wins": "points_collector",
  "100 Wins": "points_collector",
  "Speed Demon": "speed_demon",
  "Speedster": "speed_demon",
  "No Hints Win": "no_hint_master",
  "No Hint Master": "no_hint_master",
  "Streak Master": "streak_keeper",
  "Streak Keeper": "streak_keeper",
  "Points Collector": "points_collector",
  "Point Collector": "points_collector",
  "Flawless": "flawless",
  "Iron Stomach": "iron_stomach",
  "Hyper Samurai": "hyper_samurai",
  "Killer Assassin": "killer_assassin",
  "X Master": "x_master",
};

function getStorageKey() {
  const uid = auth.currentUser?.uid;
  return uid ? `unlockedAchievements:${uid}` : LEGACY_GLOBAL_KEY;
}

function normalizeAchievementId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const mapped = LEGACY_NAME_TO_ID[trimmed] ?? trimmed;
  return VALID_ACHIEVEMENT_IDS.has(mapped) ? mapped : null;
}

function normalizeAchievementList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];

  const ids: string[] = [];
  raw.forEach((value) => {
    const id = normalizeAchievementId(value);
    if (id && !ids.includes(id)) ids.push(id);
  });

  return ids;
}

async function readAchievementList(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    return normalizeAchievementList(JSON.parse(raw));
  } catch {
    return [];
  }
}

async function writeAchievementList(key: string, unlocked: string[]) {
  await AsyncStorage.setItem(key, JSON.stringify(normalizeAchievementList(unlocked)));
}

async function readStoredAchievements(): Promise<string[]> {
  const key = getStorageKey();
  const merged = new Set<string>();

  const append = (ids: string[]) => ids.forEach((id) => merged.add(id));

  append(await readAchievementList(key));

  if (key !== LEGACY_GLOBAL_KEY) {
    append(await readAchievementList(LEGACY_GLOBAL_KEY));

    try {
      const keys = await AsyncStorage.getAllKeys();
      const legacyUserKeys = keys.filter((item) => item.startsWith("achievements:"));
      for (const legacyKey of legacyUserKeys) append(await readAchievementList(legacyKey));
    } catch {}
  }

  return Array.from(merged);
}

function getAchievementTier(score: number): AchievementLevel {
  if (score >= 800) return "Grandmaster";
  if (score >= 600) return "Master";
  if (score >= 450) return "Diamond";
  if (score >= 350) return "Platinum";
  if (score >= 250) return "Gold";
  if (score >= 150) return "Silver";
  return "Bronze";
}

function getIdsForGameResult(result: AchievementGameResult): string[] {
  if (!result.win) return [];

  const ids = new Set<string>();
  const totalWins = result.analytics?.totals?.wins ?? 0;
  const dailyStreak = result.analytics?.streaks?.dailyCurrent ?? 0;
  const activityStreak = result.analytics?.streaks?.activityCurrent ?? 0;

  ids.add("first_win");
  if (result.time > 0 && result.time <= 300) ids.add("speed_demon");

  if ((result.errors ?? 0) === 0) {
    ids.add("flawless");
    ids.add("iron_stomach");
  }

  if ((result.hintsUsed ?? 0) === 0) ids.add("no_hint_master");
  if (Math.max(dailyStreak, activityStreak) >= 3) ids.add("streak_keeper");

  if ((result.totalPoints ?? result.score ?? 0) >= 1000) ids.add("points_collector");

  if (result.mode === "hyper") ids.add("hyper_samurai");
  if (result.mode === "killer") ids.add("killer_assassin");
  if (result.mode === "x") ids.add("x_master");

  return Array.from(ids);
}

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  level: 1,
  xp: 0,
  nextLevelXp: 150,
  unlocked: [],

  loadUnlocked: async () => {
    try {
      const key = getStorageKey();
      const unlocked = await readStoredAchievements();
      set({ unlocked });
      await writeAchievementList(key, unlocked);
    } catch (err) {
      console.log("âš ï¸ Achievement load error:", err);
    }
  },

  unlock: async (id: string) => {
    const normalized = normalizeAchievementId(id);
    if (!normalized) return;

    const key = getStorageKey();
    const stored = await readStoredAchievements();
    const merged = Array.from(new Set([...stored, ...get().unlocked]));

    if (merged.includes(normalized)) {
      set({ unlocked: merged });
      await writeAchievementList(key, merged);
      return;
    }

    const updated = [...merged, normalized];
    set({ unlocked: updated });

    try {
      await writeAchievementList(key, updated);
    } catch (err) {
      console.log("âš ï¸ Achievement save error:", err);
    }
  },

  unlockMany: async (ids: string[]) => {
    const normalizedIds = ids
      .map(normalizeAchievementId)
      .filter((id): id is string => Boolean(id));

    if (normalizedIds.length === 0) return;

    const key = getStorageKey();
    const stored = await readStoredAchievements();
    const updated = Array.from(new Set([...stored, ...get().unlocked, ...normalizedIds]));

    set({ unlocked: updated });

    try {
      await writeAchievementList(key, updated);
    } catch (err) {
      console.log("âš ï¸ Achievement save error:", err);
    }
  },

  awardForGameResult: async (result: AchievementGameResult) => {
    await get().unlockMany(getIdsForGameResult(result));
  },

  getTotalPoints: () => {
    const { unlocked } = get();
    return unlocked.reduce((sum, id) => {
      const achievement = ACHIEVEMENTS.find((item) => item.id === id);
      return achievement ? sum + achievement.points : sum;
    }, 0);
  },

  getLevel: () => getAchievementTier(get().getTotalPoints()),

  getProgressPercent: () => {
    const score = get().getTotalPoints();
    const thresholds = [0, 150, 250, 350, 450, 600, 800];
    const current = thresholds.reduce((best, value) => (score >= value ? value : best), 0);
    const next = thresholds.find((value) => value > score) ?? 800;

    if (score >= 800) return 100;
    return Math.max(0, Math.min(100, ((score - current) / (next - current)) * 100));
  },
}));



