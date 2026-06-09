import AsyncStorage from "@react-native-async-storage/async-storage";

import { create } from "zustand";

export type AchievementLevel = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Master" | "Grandmaster";

export type AchievementsState = {
  unlocked: string[];
  level: number;
  xp: number;
  nextLevelXp: number;
  loadUnlocked: () => Promise<void>;
  unlock: (id: string) => Promise<void>;
  getTotalPoints: () => number;
  getLevel: () => AchievementLevel;
  getProgressPercent: () => number;
};

// STATIC ACHIEVEMENT LIST (same as AchievementsHub)
export const ACHIEVEMENTS = [
  {
    id: "points_collector",
    icon: "📈",
    title: "Points Collector",
    desc: "Accumulate a high total score across all game modes.",
    how: "Keep playing puzzles and earn points.",
    points: 40,
  },
  {
    id: "speed_demon",
    icon: "⚡",
    title: "Speed Demon",
    desc: "Finish puzzles faster than most players.",
    how: "Complete any puzzle with an exceptional time.",
    points: 50,
  },
  {
    id: "first_win",
    icon: "🥇",
    title: "First Win",
    desc: "Complete your very first puzzle.",
    how: "Finish any puzzle to earn this badge.",
    points: 10,
  },
  {
    id: "flawless",
    icon: "💎",
    title: "Flawless",
    desc: "Complete a puzzle with zero mistakes.",
    how: "Avoid any errors throughout a puzzle.",
    points: 80,
  },
  {
    id: "no_hint_master",
    icon: "🧠",
    title: "No Hint Master",
    desc: "Finish a puzzle without using hints.",
    how: "Solve an entire puzzle on your own.",
    points: 60,
  },
  {
    id: "streak_keeper",
    icon: "🔥",
    title: "Streak Keeper",
    desc: "Maintain a winning streak.",
    how: "Play daily and keep winning to grow your streak.",
    points: 40,
  },
  {
    id: "iron_stomach",
    icon: "🛡️",
    title: "Iron Stomach",
    desc: "Complete a puzzle without any errors.",
    how: "Play carefully — one mistake breaks the run.",
    points: 70,
  },
  {
    id: "hyper_samurai",
    icon: "🌀",
    title: "Hyper Samurai",
    desc: "Win a Hyper Samurai puzzle.",
    how: "Complete a Hyper Samurai game mode.",
    points: 100,
  },
  {
    id: "killer_assassin",
    icon: "💀",
    title: "Killer Assassin",
    desc: "Beat a Killer Sudoku puzzle.",
    how: "Complete a Killer puzzle on any difficulty.",
    points: 100,
  },
  {
    id: "x_master",
    icon: "❌",
    title: "X Master",
    desc: "Win an X-Sudoku puzzle.",
    how: "Finish an X-Sudoku puzzle.",
    points: 80,
  },
];

export const useAchievementsStore = create<AchievementsState>((set, get) => ({
  level: 1,
  xp: 0,
  nextLevelXp: 150,
  unlocked: [] as string[],

  // Load from storage
  loadUnlocked: async () => {
    try {
      const raw = await AsyncStorage.getItem("unlockedAchievements");
      if (raw) {
        set({ unlocked: JSON.parse(raw) });
      }
    } catch (err) {
      console.log("⚠️ Achievement load error:", err);
    }
  },

  // Unlock achievement
  unlock: async (id: string) => {
    const { unlocked } = get();

    if (unlocked.includes(id)) return; // already unlocked

    const updated = [...unlocked, id];
    set({ unlocked: updated });

    try {
      await AsyncStorage.setItem(
        "unlockedAchievements",
        JSON.stringify(updated)
      );
    } catch (err) {
      console.log("⚠️ Achievement save error:", err);
    }
  },

  // Computed: total points
  getTotalPoints: () => {
    const { unlocked } = get();
    return unlocked.reduce((sum, id) => {
      const a = ACHIEVEMENTS.find((x) => x.id === id);
      return a ? sum + a.points : sum;
    }, 0);
  },

  // Computed: level
  getLevel: () => {
    const score = get().getTotalPoints();

    if (score >= 800) return "Grandmaster";
    if (score >= 600) return "Master";
    if (score >= 450) return "Diamond";
    if (score >= 350) return "Platinum";
    if (score >= 250) return "Gold";
    if (score >= 150) return "Silver";
    return "Bronze";
  },

  // Progress to next tier (0-100%)
  getProgressPercent: () => {
    const score = get().getTotalPoints();
    return ((score % 150) / 150) * 100;
  },
}));
