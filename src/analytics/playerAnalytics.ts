import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/**
 * ======================================
 * Player Analytics (Cloud)
 * ======================================
 * Firestore-backed, cross-device synced.
 */

const ANALYTICS_VERSION = 2;

export type GameMode = "classic" | "daily" | "weekly" | "hyper" | "killer" | "x";

type ModeStats = {
  gamesPlayed: number;
  wins: number;
  losses: number;
  bestTimeSec: number | null;
  avgTimeSec: number;
  avgErrors: number;
  avgHintsUsed: number;
};

export type PlayerAnalytics = {
  version: number;

  identity: {
    username: string;
    createdAt: number;
    lastActiveAt: number;
  };

  totals: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    totalTimeSec: number;
  };

  modes: Record<GameMode, ModeStats>;

  streaks: {
    dailyCurrent: number;
    dailyBest: number;
    activityCurrent: number;
    activityBest: number;
    lastActivityDayKey: string | null;
    lastDailyWinDayKey: string | null;
  };

  sessions: {
    totalSessions: number;
    lastSessionAt: number;
    avgGamesPerSession: number;
    avgSessionTimeSec: number;
  };
};

const emptyMode = (): ModeStats => ({
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  bestTimeSec: null,
  avgTimeSec: 0,
  avgErrors: 0,
  avgHintsUsed: 0,
});

const createEmptyAnalytics = (username: string): PlayerAnalytics => ({
  version: ANALYTICS_VERSION,

  identity: {
    username,
    createdAt: Date.now(),
    lastActiveAt: Date.now(),
  },

  totals: {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    totalTimeSec: 0,
  },

  modes: {
    classic: emptyMode(),
    daily: emptyMode(),
    weekly: emptyMode(),
    hyper: emptyMode(),
    killer: emptyMode(),
    x: emptyMode(),
  },

  streaks: {
    dailyCurrent: 0,
    dailyBest: 0,
    activityCurrent: 0,
    activityBest: 0,
    lastActivityDayKey: null,
    lastDailyWinDayKey: null,
  },

  sessions: {
    totalSessions: 0,
    lastSessionAt: 0,
    avgGamesPerSession: 0,
    avgSessionTimeSec: 0,
  },
});

function analyticsDocRef(uid: string) {
  return doc(db, "users", uid, "meta", "analytics");
}

function formatDuration(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function formatBestTime(totalSec: number | null): string {
  if (totalSec === null || totalSec === undefined) {
    return "—";
  }

  const safe = Math.max(0, Math.floor(totalSec));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

/** YYYY-M-D (month is 1-based) */
export function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function dayDiff(aKey: string, bKey: string) {
  const [ay, am, ad] = aKey.split("-").map(Number);
  const [by, bm, bd] = bKey.split("-").map(Number);
  const a = new Date(ay, am - 1, ad).getTime();
  const b = new Date(by, bm - 1, bd).getTime();
  return Math.round((a - b) / 86400000);
}

async function saveAnalytics(uid: string, analytics: PlayerAnalytics) {
  analytics.identity.lastActiveAt = Date.now();

  const ref = analyticsDocRef(uid);

  await setDoc(
    ref,
    {
      ...analytics,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await AsyncStorage.setItem(`analytics:${uid}`, JSON.stringify(analytics));
}

function migrateAnalyticsIfNeeded(raw: PlayerAnalytics, uid: string): PlayerAnalytics {
  const a = { ...raw };

  if (!a.version || a.version < 2) {
    a.version = ANALYTICS_VERSION;

    a.streaks = {
      dailyCurrent: a.streaks?.dailyCurrent ?? 0,
      dailyBest: a.streaks?.dailyBest ?? 0,
      activityCurrent: a.streaks?.activityCurrent ?? 0,
      activityBest: a.streaks?.activityBest ?? 0,
      lastActivityDayKey: (a.streaks as any)?.lastActivityDayKey ?? null,
      lastDailyWinDayKey: (a.streaks as any)?.lastDailyWinDayKey ?? null,
    };

    a.sessions = {
      totalSessions: a.sessions?.totalSessions ?? 0,
      lastSessionAt: a.sessions?.lastSessionAt ?? 0,
      avgGamesPerSession: a.sessions?.avgGamesPerSession ?? 0,
      avgSessionTimeSec: a.sessions?.avgSessionTimeSec ?? 0,
    };

    a.identity = {
      username: a.identity?.username ?? uid,
      createdAt: a.identity?.createdAt ?? Date.now(),
      lastActiveAt: a.identity?.lastActiveAt ?? Date.now(),
    };
  }

  return a as PlayerAnalytics;
}

export async function getAnalytics(): Promise<PlayerAnalytics> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("No authenticated user");

  const ref = analyticsDocRef(uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const fresh = createEmptyAnalytics(uid);
    await setDoc(ref, {
      ...fresh,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await AsyncStorage.setItem(`analytics:${uid}`, JSON.stringify(fresh));
    return fresh;
  }

  const data = snap.data() as PlayerAnalytics;
  const migrated = migrateAnalyticsIfNeeded(data, uid);

  await AsyncStorage.setItem(`analytics:${uid}`, JSON.stringify(migrated));
  return migrated;
}

/**
 * Progress helpers for Progress screen
 */
export function getProgressSummary(analytics: PlayerAnalytics) {
  const totalGames = analytics.totals.gamesPlayed ?? 0;
  const totalWins = analytics.totals.wins ?? 0;
  const winRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  return {
    totalGames,
    winRate,
    totalTime: formatDuration(analytics.totals.totalTimeSec ?? 0),
    currentStreak: analytics.streaks.activityCurrent ?? 0,
    bestStreak: analytics.streaks.activityBest ?? 0,
    totalSessions: analytics.sessions.totalSessions ?? 0,
    avgSessionTime: formatDuration(analytics.sessions.avgSessionTimeSec ?? 0),
  };
}

export function getModeProgress(analytics: PlayerAnalytics, mode: GameMode) {
  const modeStats = analytics.modes[mode];

  if (!modeStats) {
    return {
      gamesPlayed: 0,
      winRate: 0,
      bestTime: "—",
      avgTime: "—",
      avgErrors: 0,
      avgHintsUsed: 0,
    };
  }

  const gamesPlayed = modeStats.gamesPlayed ?? 0;
  const wins = modeStats.wins ?? 0;
  const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;

  return {
    gamesPlayed,
    winRate,
    bestTime: formatBestTime(modeStats.bestTimeSec),
    avgTime: gamesPlayed > 0 ? formatDuration(modeStats.avgTimeSec ?? 0) : "—",
    avgErrors: gamesPlayed > 0 ? Number((modeStats.avgErrors ?? 0).toFixed(1)) : 0,
    avgHintsUsed: gamesPlayed > 0 ? Number((modeStats.avgHintsUsed ?? 0).toFixed(1)) : 0,
  };
}

/**
 * Called when app becomes active / session begins.
 * Updates ACTIVITY streak (daily app usage streak).
 */
export async function bumpActivityOnSessionStart() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    const analytics = await getAnalytics();

    const now = Date.now();
    const today = dayKey(now);
    const last = analytics.streaks.lastActivityDayKey;

    if (last === today) {
      // already counted today
    } else if (last && dayDiff(today, last) === 1) {
      analytics.streaks.activityCurrent += 1;
    } else {
      analytics.streaks.activityCurrent = 1;
    }

    analytics.streaks.lastActivityDayKey = today;
    analytics.streaks.activityBest = Math.max(
      analytics.streaks.activityBest,
      analytics.streaks.activityCurrent
    );

    analytics.identity.lastActiveAt = now;

    await saveAnalytics(uid, analytics);
  } catch {
    // silent by design
  }
}

/**
 * Called on a DAILY win only.
 * Updates DAILY win streak.
 */
export async function bumpDailyStreakOnWin() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  try {
    const analytics = await getAnalytics();

    const today = dayKey(Date.now());
    const last = analytics.streaks.lastDailyWinDayKey;

    if (last === today) {
      // already counted today
    } else if (last && dayDiff(today, last) === 1) {
      analytics.streaks.dailyCurrent += 1;
    } else {
      analytics.streaks.dailyCurrent = 1;
    }

    analytics.streaks.lastDailyWinDayKey = today;
    analytics.streaks.dailyBest = Math.max(
      analytics.streaks.dailyBest,
      analytics.streaks.dailyCurrent
    );

    await saveAnalytics(uid, analytics);
  } catch {
    // silent
  }
}

export async function recordGameResult(params: {
  mode: GameMode;
  win: boolean;
  timeSec: number;
  errors: number;
  hintsUsed: number;
}) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const { mode, win, timeSec, errors, hintsUsed } = params;

  try {
    const analytics = await getAnalytics();
    const modeStats = analytics.modes[mode];

    analytics.totals.gamesPlayed += 1;
    analytics.totals.totalTimeSec += timeSec;
    win ? analytics.totals.wins++ : analytics.totals.losses++;

    modeStats.gamesPlayed += 1;
    win ? modeStats.wins++ : modeStats.losses++;

    if (win) {
      if (modeStats.bestTimeSec === null || timeSec < modeStats.bestTimeSec) {
        modeStats.bestTimeSec = timeSec;
      }
    }

    const n = modeStats.gamesPlayed;

    modeStats.avgTimeSec = (modeStats.avgTimeSec * (n - 1) + timeSec) / n;
    modeStats.avgErrors = (modeStats.avgErrors * (n - 1) + errors) / n;
    modeStats.avgHintsUsed = (modeStats.avgHintsUsed * (n - 1) + hintsUsed) / n;

    if (mode === "daily" && win) {
      bumpDailyStreakOnWin().catch(() => {});
    }

    await saveAnalytics(uid, analytics);
  } catch {
    // silent
  }
}

/**
 * XP Multiplier based on ACTIVITY streak.
 */
export function streakToMultiplier(activityStreak: number) {
  if (activityStreak >= 30) return 2.0;
  if (activityStreak >= 14) return 1.5;
  if (activityStreak >= 7) return 1.25;
  if (activityStreak >= 3) return 1.1;
  return 1.0;
}

/**
 * Fast multiplier lookup:
 * - prefers cached analytics
 * - falls back to cloud
 */
export async function getXpMultiplier(): Promise<{ mult: number; streak: number }> {
  const uid = auth.currentUser?.uid;
  if (!uid) return { mult: 1.0, streak: 0 };

  try {
    const cached = await AsyncStorage.getItem(`analytics:${uid}`);
    if (cached) {
      const a = JSON.parse(cached) as PlayerAnalytics;
      const s = a?.streaks?.activityCurrent ?? 0;
      return { mult: streakToMultiplier(s), streak: s };
    }
  } catch {}

  try {
    const a = await getAnalytics();
    const s = a?.streaks?.activityCurrent ?? 0;
    return { mult: streakToMultiplier(s), streak: s };
  } catch {
    return { mult: 1.0, streak: 0 };
  }
}