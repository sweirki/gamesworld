import AsyncStorage from "@react-native-async-storage/async-storage";
import { grantArenaEconomyReward, spendArenaEntry } from "../economy/economyEngine";

export type ArenaMode = "ranked" | "survival" | "power" | "tournament";
export type ArenaLeague = "Bronze" | "Silver" | "Gold" | "Elite" | "Master";
export type ArenaDifficulty = "easy" | "medium" | "hard";

export type ArenaPowerCharges = {
  reveal: number;
  shield: number;
  freeze: number;
};

export type ArenaRun = {
  id: string;
  mode: ArenaMode;
  difficulty: ArenaDifficulty;
  opponentName: string;
  opponentRating: number;
  targetTimeSec: number;
  startedAt: number;
  stageIndex: number;
  stageTotal: number;
  stageName: string;
  survivalDepth: number;
  powerCharges?: ArenaPowerCharges;
};

export type ArenaBoardProgress = {
  runId: string;
  mode: ArenaMode;
  puzzle: any;
  timer: number;
  hintsLeft: number;
  difficulty: ArenaRun["difficulty"];
  errors: number;
  errorCount: number;
  powerCharges?: ArenaPowerCharges;
  shieldArmed?: boolean;
  updatedAt: number;
};

export type ArenaResult = ArenaRun & {
  completedAt: number;
  playerTimeSec: number;
  errors: number;
  hintsUsed: number;
  win: boolean;
  ratingBefore: number;
  ratingAfter: number;
  ratingDelta: number;
  leagueBefore: ArenaLeague;
  leagueAfter: ArenaLeague;
  xpEarned: number;
  arenaPointsEarned: number;
  rewardSummary: string;
  badgeUnlocked?: ArenaLeague | null;
  resultReason: string;
  nextRun?: ArenaRun | null;
  cupChampion?: boolean;
  powerChargesUsed?: number;
  streakBonusXp?: number;
  streakBonusAp?: number;
  economyCapped?: boolean;
  winStreakBefore?: number;
  winStreakAfter?: number;
  promotion?: boolean;
  demotion?: boolean;
};

export type ArenaProfile = {
  rating: number;
  bestRating: number;
  league: ArenaLeague;
  seasonXp: number;
  arenaPoints: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestStreak: number;
  tickets: number;
  cupsWon: number;
  powerWins: number;
  survivalBestDepth: number;
  highestLeague: ArenaLeague;
  badgesUnlocked: ArenaLeague[];
  currentSeasonId: string;
  lastPlayedAt?: number;
  dailyMatches: number;
  weeklyMatches: number;
  lastDailyKey: string;
  lastWeeklyKey: string;
};

export type ArenaGoal = {
  id: string;
  period: "daily" | "weekly";
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: string;
  complete: boolean;
};

export type ArenaSnapshot = {
  profile: ArenaProfile;
  pendingRun: ArenaRun | null;
  lastResult: ArenaResult | null;
  history: ArenaResult[];
};

const PROFILE_KEY = "sweirki:arena:profile:v1";
const PENDING_KEY = "sweirki:arena:pending:v1";
const HISTORY_KEY = "sweirki:arena:history:v1";
const LAST_RESULT_KEY = "sweirki:arena:lastResult:v1";
const PROGRESS_KEY = "sweirki:arena:boardProgress:v1";

const BOT_NAMES = [
  "LogicFox",
  "GridNinja",
  "CalmMaster",
  "PuzzlePilot",
  "NumberWolf",
  "CrownCell",
  "SkySolver",
  "ZenGrid",
  "TempoTiger",
  "FinalFox",
];

const TOURNAMENT_STAGES = ["Qualifier", "Semifinal", "Final"];
const SURVIVAL_DIFFICULTIES: ArenaDifficulty[] = ["easy", "medium", "hard"];

const DEFAULT_PROFILE: ArenaProfile = {
  rating: 420,
  bestRating: 420,
  league: "Bronze",
  seasonXp: 0,
  arenaPoints: 0,
  wins: 0,
  losses: 0,
  winStreak: 0,
  bestStreak: 0,
  tickets: 3,
  cupsWon: 0,
  powerWins: 0,
  survivalBestDepth: 0,
  highestLeague: "Bronze",
  badgesUnlocked: ["Bronze"],
  currentSeasonId: "logic-wars-s1",
  dailyMatches: 0,
  weeklyMatches: 0,
  lastDailyKey: "",
  lastWeeklyKey: "",
};

export const ARENA_SEASON = {
  id: "logic-wars-s1",
  name: "Season 1: Logic Wars",
  theme: "Precision League",
  rewardPreview: "Master badge frame + Cup Champion banner",
  startsAt: "2026-06-01T00:00:00.000Z",
  endsAt: "2026-07-15T00:00:00.000Z",
};

export const ARENA_LEAGUES: ArenaLeague[] = ["Bronze", "Silver", "Gold", "Elite", "Master"];

export function getArenaSeason() {
  const end = new Date(ARENA_SEASON.endsAt).getTime();
  const daysRemaining = Math.max(0, Math.ceil((end - Date.now()) / (1000 * 60 * 60 * 24)));
  return { ...ARENA_SEASON, daysRemaining };
}

export function getLeagueBadge(league: ArenaLeague) {
  const badgeMap: Record<ArenaLeague, { icon: string; label: string; reward: string }> = {
    Bronze: { icon: "shield", label: "Bronze Badge", reward: "Starter crest" },
    Silver: { icon: "ribbon", label: "Silver Badge", reward: "+25 Arena Points" },
    Gold: { icon: "medal", label: "Gold Badge", reward: "+60 Arena Points" },
    Elite: { icon: "sparkles", label: "Elite Badge", reward: "+120 Arena Points" },
    Master: { icon: "trophy", label: "Master Badge", reward: "+250 Arena Points" },
  };
  return badgeMap[league] ?? badgeMap.Bronze;
}

function leagueWeight(league: ArenaLeague) {
  return ARENA_LEAGUES.indexOf(league);
}

function isHigherLeague(next: ArenaLeague, previous: ArenaLeague) {
  return leagueWeight(next) > leagueWeight(previous);
}

export function getArenaRewardPreview(profile: ArenaProfile) {
  const next = getLeagueProgress(profile.rating).nextRating;
  const remaining = Math.max(0, next - profile.rating);
  const badge = getLeagueBadge(profile.league);
  return {
    badge,
    remaining,
    nextRating: next,
    seasonTrack: `${profile.seasonXp} XP / ${profile.arenaPoints} AP`,
  };
}

function dateKey(timestamp = Date.now()) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function weekKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const firstDay = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const dayOffset = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);
  return `${date.getUTCFullYear()}-W${Math.floor(dayOffset / 7) + 1}`;
}

function normalizeProfileCadence(profile: ArenaProfile): ArenaProfile {
  const today = dateKey();
  const thisWeek = weekKey();
  return {
    ...profile,
    dailyMatches: profile.lastDailyKey === today ? Math.max(0, Number(profile.dailyMatches ?? 0)) : 0,
    weeklyMatches: profile.lastWeeklyKey === thisWeek ? Math.max(0, Number(profile.weeklyMatches ?? 0)) : 0,
    lastDailyKey: today,
    lastWeeklyKey: thisWeek,
  };
}

function economyMultiplier(profile: ArenaProfile) {
  if (profile.dailyMatches >= 20 || profile.weeklyMatches >= 90) return 0.35;
  if (profile.dailyMatches >= 12 || profile.weeklyMatches >= 55) return 0.65;
  return 1;
}

function clampReward(value: number, multiplier: number) {
  return Math.max(0, Math.round(value * multiplier));
}

export function getArenaGoals(snapshot: ArenaSnapshot | null): ArenaGoal[] {
  const profile = snapshot?.profile ?? DEFAULT_PROFILE;
  const last = snapshot?.lastResult;
  const rankedWinToday = last?.mode === "ranked" && last.win ? 1 : 0;
  const tournamentPlayedToday = last?.mode === "tournament" ? 1 : 0;
  const powerUseToday = last?.mode === "power" ? Math.min(2, last.powerChargesUsed ?? 0) : 0;
  const survivalProgress = Math.min(3, profile.survivalBestDepth ?? 0);
  const weeklyWinProgress = Math.min(5, profile.winStreak || profile.bestStreak || 0);
  return [
    { id: "daily-ranked-win", period: "daily", title: "Win a Ranked Duel", description: "Beat one rival target today.", progress: rankedWinToday, target: 1, reward: "+35 XP / +15 AP", complete: rankedWinToday >= 1 },
    { id: "daily-power-tools", period: "daily", title: "Use 2 Powers", description: "Spend Reveal, Shield, or Freeze in Power Arena.", progress: powerUseToday, target: 2, reward: "+25 XP / +10 AP", complete: powerUseToday >= 2 },
    { id: "daily-cup-entry", period: "daily", title: "Enter Tournament Cup", description: "Start or finish a cup stage.", progress: tournamentPlayedToday, target: 1, reward: "+30 XP / +10 AP", complete: tournamentPlayedToday >= 1 },
    { id: "weekly-survival-climb", period: "weekly", title: "Reach Survival Stage 3", description: "Clear enough perfect boards to touch Hard survival pressure.", progress: survivalProgress, target: 3, reward: "+120 XP / +45 AP", complete: survivalProgress >= 3 },
    { id: "weekly-streak-five", period: "weekly", title: "Build a 5-Win Streak", description: "Protect momentum across Arena results.", progress: weeklyWinProgress, target: 5, reward: "+150 XP / +60 AP", complete: weeklyWinProgress >= 5 },
  ];
}

export function getLeague(rating: number): ArenaLeague {
  if (rating >= 1400) return "Master";
  if (rating >= 1050) return "Elite";
  if (rating >= 760) return "Gold";
  if (rating >= 520) return "Silver";
  return "Bronze";
}

export function getLeagueProgress(rating: number) {
  const bands = [
    { league: "Bronze", min: 0, max: 520 },
    { league: "Silver", min: 520, max: 760 },
    { league: "Gold", min: 760, max: 1050 },
    { league: "Elite", min: 1050, max: 1400 },
    { league: "Master", min: 1400, max: 1900 },
  ];
  const band = bands.find((item) => rating >= item.min && rating < item.max) ?? bands[bands.length - 1];
  const progress = Math.max(0, Math.min(1, (rating - band.min) / Math.max(1, band.max - band.min)));
  return { nextRating: band.max, progress };
}

function runId() {
  return `arena-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
}

function pickOpponent(rating: number, pressure = 0) {
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  const opponentRating = Math.max(250, rating + pressure + Math.floor(Math.random() * 140) - 70);
  return { name, opponentRating };
}

function defaultCharges(): ArenaPowerCharges {
  return { reveal: 1, shield: 1, freeze: 1 };
}

function targetTime(mode: ArenaMode, difficulty: ArenaDifficulty, rating: number, stageIndex = 0) {
  const base = difficulty === "hard" ? 620 : difficulty === "medium" ? 460 : 330;
  const modePressure = mode === "survival" ? -35 : mode === "power" ? 20 : mode === "tournament" ? -25 - stageIndex * 20 : 0;
  const skillPressure = Math.min(110, Math.floor(rating / 12));
  const variance = Math.floor(Math.random() * 80) - 40;
  return Math.max(170, base + modePressure - skillPressure + variance);
}

function openingDifficulty(mode: ArenaMode): ArenaDifficulty {
  if (mode === "survival") return "easy";
  if (mode === "tournament") return "medium";
  if (mode === "power") return "medium";
  return "medium";
}

function stageName(mode: ArenaMode, stageIndex: number) {
  if (mode === "tournament") return TOURNAMENT_STAGES[stageIndex] ?? "Champion Match";
  if (mode === "survival") return `Survival ${stageIndex + 1}`;
  if (mode === "power") return "Power Match";
  return "Ranked Duel";
}

function stageTotal(mode: ArenaMode) {
  if (mode === "tournament") return TOURNAMENT_STAGES.length;
  if (mode === "survival") return SURVIVAL_DIFFICULTIES.length;
  return 1;
}

function buildRun(mode: ArenaMode, profile: ArenaProfile, opts?: { stageIndex?: number; survivalDepth?: number }): ArenaRun {
  const stageIndex = opts?.stageIndex ?? 0;
  const survivalDepth = opts?.survivalDepth ?? 0;
  const difficulty = mode === "survival"
    ? SURVIVAL_DIFFICULTIES[Math.min(survivalDepth, SURVIVAL_DIFFICULTIES.length - 1)]
    : mode === "tournament"
      ? (stageIndex === 0 ? "medium" : "hard")
      : openingDifficulty(mode);
  const opponent = pickOpponent(profile.rating, mode === "tournament" ? stageIndex * 55 : survivalDepth * 25);
  return {
    id: runId(),
    mode,
    difficulty,
    opponentName: opponent.name,
    opponentRating: opponent.opponentRating,
    targetTimeSec: targetTime(mode, difficulty, profile.rating, stageIndex),
    startedAt: Date.now(),
    stageIndex,
    stageTotal: stageTotal(mode),
    stageName: stageName(mode, stageIndex),
    survivalDepth,
    powerCharges: mode === "power" ? defaultCharges() : undefined,
  };
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown) {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function isValidPuzzleGrid(puzzle: any) {
  return Array.isArray(puzzle)
    && puzzle.length === 9
    && puzzle.every((row: any) => Array.isArray(row)
      && row.length === 9
      && row.every((cell: any) => cell && typeof cell === "object" && "solution" in cell));
}

function isRunExpired(run: ArenaRun | null) {
  return !!run && Date.now() - run.startedAt > 1000 * 60 * 60 * 2;
}

function hasValidRunShape(run: ArenaRun | null) {
  return !!run
    && !!run.id
    && (run.mode === "ranked" || run.mode === "survival" || run.mode === "power" || run.mode === "tournament")
    && (run.difficulty === "easy" || run.difficulty === "medium" || run.difficulty === "hard")
    && Number.isFinite(Number(run.startedAt))
    && Number.isFinite(Number(run.targetTimeSec));
}

async function readHealthyPendingRun() {
  const raw = await readJson<ArenaRun | null>(PENDING_KEY, null);
  const run = normalizeRun(raw);

  if (!hasValidRunShape(run) || isRunExpired(run)) {
    if (raw) await AsyncStorage.multiRemove([PENDING_KEY, PROGRESS_KEY]);
    return null;
  }

  if (JSON.stringify(run) !== JSON.stringify(raw)) await writeJson(PENDING_KEY, run);
  return run;
}

function normalizeProgress(progress: ArenaBoardProgress | null, pending: ArenaRun | null): ArenaBoardProgress | null {
  if (!pending || !progress) return null;
  if (progress.runId !== pending.id || progress.mode !== pending.mode) return null;
  if (!isValidPuzzleGrid(progress.puzzle)) return null;
  if (progress.updatedAt && Date.now() - progress.updatedAt > 1000 * 60 * 60 * 2) return null;

  return {
    ...progress,
    difficulty: progress.difficulty ?? pending.difficulty,
    timer: Math.max(0, Number(progress.timer ?? 0)),
    hintsLeft: Math.max(0, Number(progress.hintsLeft ?? 3)),
    errors: Math.max(0, Number(progress.errors ?? progress.errorCount ?? 0)),
    errorCount: Math.max(0, Number(progress.errorCount ?? progress.errors ?? 0)),
    powerCharges: pending.mode === "power" ? (progress.powerCharges ?? pending.powerCharges ?? defaultCharges()) : progress.powerCharges,
    shieldArmed: pending.mode === "power" ? progress.shieldArmed === true : false,
  };
}

function normalizeRun(run: ArenaRun | null): ArenaRun | null {
  if (!run) return null;
  const stageIndex = run.stageIndex ?? 0;
  return {
    ...run,
    difficulty: run.difficulty ?? openingDifficulty(run.mode),
    stageIndex,
    stageTotal: run.stageTotal ?? stageTotal(run.mode),
    stageName: run.stageName ?? stageName(run.mode, stageIndex),
    survivalDepth: run.survivalDepth ?? 0,
    powerCharges: run.mode === "power" ? (run.powerCharges ?? defaultCharges()) : run.powerCharges,
  };
}

export async function getArenaProfile(): Promise<ArenaProfile> {
  const raw = await readJson<Partial<ArenaProfile>>(PROFILE_KEY, DEFAULT_PROFILE);
  const rating = Number(raw.rating ?? DEFAULT_PROFILE.rating);
  const league = getLeague(rating);
  const highestLeague = raw.highestLeague && ARENA_LEAGUES.includes(raw.highestLeague)
    ? (isHigherLeague(league, raw.highestLeague) ? league : raw.highestLeague)
    : league;
  const badges = Array.from(new Set(["Bronze", ...(raw.badgesUnlocked ?? []), league]))
    .filter((item): item is ArenaLeague => ARENA_LEAGUES.includes(item as ArenaLeague));
  let profile: ArenaProfile = {
    ...DEFAULT_PROFILE,
    ...raw,
    rating,
    bestRating: Math.max(Number(raw.bestRating ?? rating), rating),
    league,
    seasonXp: Number(raw.seasonXp ?? 0),
    arenaPoints: Number(raw.arenaPoints ?? 0),
    wins: Number(raw.wins ?? 0),
    losses: Number(raw.losses ?? 0),
    winStreak: Number(raw.winStreak ?? 0),
    bestStreak: Number(raw.bestStreak ?? 0),
    tickets: Number(raw.tickets ?? 3),
    cupsWon: Number(raw.cupsWon ?? 0),
    powerWins: Number(raw.powerWins ?? 0),
    survivalBestDepth: Number(raw.survivalBestDepth ?? 0),
    highestLeague,
    badgesUnlocked: badges,
    currentSeasonId: raw.currentSeasonId ?? ARENA_SEASON.id,
    dailyMatches: Number(raw.dailyMatches ?? 0),
    weeklyMatches: Number(raw.weeklyMatches ?? 0),
    lastDailyKey: raw.lastDailyKey ?? "",
    lastWeeklyKey: raw.lastWeeklyKey ?? "",
  };
  profile = normalizeProfileCadence(profile);
  if (JSON.stringify(profile) !== JSON.stringify(raw)) await writeJson(PROFILE_KEY, profile);
  return profile;
}

export async function getArenaSnapshot(): Promise<ArenaSnapshot> {
  const [profile, lastResult, history] = await Promise.all([
    getArenaProfile(),
    readJson<ArenaResult | null>(LAST_RESULT_KEY, null),
    readJson<ArenaResult[]>(HISTORY_KEY, []),
  ]);

  const pendingRun = await readHealthyPendingRun();

  return { profile, pendingRun, lastResult, history };
}

export async function startArenaRun(mode: ArenaMode, opts?: { isPremium?: boolean }): Promise<ArenaRun> {
  const existing = await readHealthyPendingRun();
  if (existing) return existing;
  const profile = await getArenaProfile();
  const entry = await spendArenaEntry(mode, profile, opts?.isPremium === true);
  if (!entry.ok) {
    const err = new Error(`Not enough ${entry.missing ?? "currency"} for ${mode} entry.`) as Error & { code?: string; missing?: string; cost?: unknown };
    err.code = "ARENA_ENTRY_FUNDS";
    err.missing = entry.missing ?? undefined;
    err.cost = entry.cost;
    throw err;
  }
  const run = buildRun(mode, profile);
  await writeJson(PENDING_KEY, run);
  await AsyncStorage.removeItem(PROGRESS_KEY);
  return run;
}

export async function clearArenaRun() {
  await AsyncStorage.multiRemove([PENDING_KEY, PROGRESS_KEY]);
}

export async function getArenaBoardProgress(): Promise<ArenaBoardProgress | null> {
  const pending = await readHealthyPendingRun();
  const progress = await readJson<ArenaBoardProgress | null>(PROGRESS_KEY, null);
  const normalized = normalizeProgress(progress, pending);

  if (!normalized) {
    if (progress) await AsyncStorage.removeItem(PROGRESS_KEY);
    return null;
  }

  if (JSON.stringify(normalized) !== JSON.stringify(progress)) await writeJson(PROGRESS_KEY, normalized);
  return normalized;
}

export async function saveArenaBoardProgress(progress: Omit<ArenaBoardProgress, "updatedAt">) {
  const pending = await readHealthyPendingRun();
  if (!pending || pending.id !== progress.runId || pending.mode !== progress.mode) return;
  if (!isValidPuzzleGrid(progress.puzzle)) return;
  await writeJson(PROGRESS_KEY, { ...progress, difficulty: pending.difficulty, updatedAt: Date.now() });
}

function modeLossDelta(mode: ArenaMode, errors = 0) {
  const base = mode === "tournament" ? 32 : mode === "survival" ? 26 : mode === "ranked" ? 24 : 20;
  return -(base + Math.max(0, errors * 3));
}

function resultReason(mode: ArenaMode, win: boolean, time: number, target: number, errors: number, forfeited = false) {
  if (forfeited) return "The active Arena session was forfeited before completion.";
  if (mode === "survival" && errors > 0) return "Survival allows zero mistakes. One strike ended the run.";
  if (errors > 3) return "The run exceeded the Arena mistake limit.";
  if (!win && time > target) return "The board was solved, but the rival target was faster.";
  if (win) return "You beat the target while staying inside the Arena contract.";
  return "The match contract was not cleared cleanly enough.";
}

function nextProgressionRun(pending: ArenaRun, profileAfter: ArenaProfile, arenaWin: boolean): ArenaRun | null {
  if (!arenaWin) return null;
  if (pending.mode === "tournament" && pending.stageIndex + 1 < TOURNAMENT_STAGES.length) {
    return buildRun("tournament", profileAfter, { stageIndex: pending.stageIndex + 1 });
  }
  if (pending.mode === "survival" && pending.survivalDepth + 1 < SURVIVAL_DIFFICULTIES.length) {
    return buildRun("survival", profileAfter, { survivalDepth: pending.survivalDepth + 1, stageIndex: pending.survivalDepth + 1 });
  }
  return null;
}

async function commitArenaResult(result: ArenaResult, nextProfile: ArenaProfile, nextRun: ArenaRun | null) {
  const history = await readJson<ArenaResult[]>(HISTORY_KEY, []);
  const writes: Promise<any>[] = [
    writeJson(PROFILE_KEY, nextProfile),
    writeJson(HISTORY_KEY, [result, ...history].slice(0, 30)),
    writeJson(LAST_RESULT_KEY, result),
    AsyncStorage.removeItem(PROGRESS_KEY),
  ];
  if (nextRun) writes.push(writeJson(PENDING_KEY, nextRun));
  else writes.push(AsyncStorage.removeItem(PENDING_KEY));
  await Promise.all(writes);
}

export async function forfeitPendingArenaRun(input?: { time?: number; errors?: number; hintsUsed?: number }): Promise<ArenaResult | null> {
  const pending = await readHealthyPendingRun();
  if (!pending) return null;
  const profile = await getArenaProfile();
  const leagueBefore = getLeague(profile.rating);
  const errors = input?.errors ?? 0;
  const ratingDelta = modeLossDelta(pending.mode, errors);
  const ratingAfter = Math.max(0, profile.rating + ratingDelta);
  const leagueAfter = getLeague(ratingAfter);
  const multiplier = economyMultiplier(profile);
  const xpEarned = clampReward(pending.mode === "survival" ? 10 : 12, multiplier);
  const arenaPointsEarned = 0;
  const nextProfile: ArenaProfile = { ...profile, rating: ratingAfter, league: leagueAfter, seasonXp: profile.seasonXp + xpEarned, arenaPoints: profile.arenaPoints + arenaPointsEarned, losses: profile.losses + 1, winStreak: 0, dailyMatches: profile.dailyMatches + 1, weeklyMatches: profile.weeklyMatches + 1, lastDailyKey: dateKey(), lastWeeklyKey: weekKey(), lastPlayedAt: Date.now() };
  const result: ArenaResult = {
    ...pending,
    completedAt: Date.now(),
    playerTimeSec: input?.time ?? Math.max(1, Math.floor((Date.now() - pending.startedAt) / 1000)),
    errors,
    hintsUsed: input?.hintsUsed ?? 0,
    win: false,
    ratingBefore: profile.rating,
    ratingAfter,
    ratingDelta,
    leagueBefore,
    leagueAfter,
    xpEarned,
    arenaPointsEarned,
    rewardSummary: `+${xpEarned} XP • +${arenaPointsEarned} AP`,
    badgeUnlocked: null,
    resultReason: resultReason(pending.mode, false, input?.time ?? 0, pending.targetTimeSec, errors, true),
    nextRun: null,
    cupChampion: false,
    streakBonusXp: 0,
    streakBonusAp: 0,
    economyCapped: multiplier < 1,
    winStreakBefore: profile.winStreak,
    winStreakAfter: 0,
    promotion: false,
    demotion: leagueAfter !== leagueBefore,
  };
  await commitArenaResult(result, nextProfile, null);
  return result;
}

export async function completePendingArenaRun(input: { win: boolean; time: number; errors: number; hintsUsed?: number; powerCharges?: ArenaPowerCharges }): Promise<ArenaResult | null> {
  const pending = await readHealthyPendingRun();
  if (!pending) return null;
  const profile = await getArenaProfile();
  const leagueBefore = getLeague(profile.rating);
  const cleanEnough = pending.mode === "survival" ? input.errors === 0 : input.errors <= 3;
  const fastEnough = input.time <= pending.targetTimeSec;
  const arenaWin = input.win && cleanEnough && fastEnough;
  const baseDelta = pending.mode === "tournament" ? 24 + pending.stageIndex * 10 : pending.mode === "survival" ? 22 + pending.survivalDepth * 8 : pending.mode === "power" ? 24 : 26;
  const errorPenalty = Math.max(0, input.errors * 3);
  const speedBonus = arenaWin ? Math.min(12, Math.floor((pending.targetTimeSec - input.time) / 18)) : 0;
  const ratingDelta = arenaWin ? baseDelta + speedBonus : -(18 + errorPenalty);
  const ratingAfter = Math.max(0, profile.rating + ratingDelta);
  const leagueAfter = getLeague(ratingAfter);
  const cupChampion = pending.mode === "tournament" && arenaWin && !nextProgressionRun(pending, { ...profile, rating: ratingAfter, league: leagueAfter } as ArenaProfile, arenaWin);
  const streakBonusXp = arenaWin ? Math.min(80, Math.max(0, profile.winStreak) * 8) : 0;
  const streakBonusAp = arenaWin ? Math.min(35, Math.floor(Math.max(0, profile.winStreak) / 2) * 5) : 0;
  const baseXp = arenaWin ? 70 + pending.stageIndex * 22 + pending.survivalDepth * 18 + Math.max(0, speedBonus * 4) + streakBonusXp : 24;
  const baseAp = arenaWin
    ? (pending.mode === "tournament" ? 45 + pending.stageIndex * 25 + (cupChampion ? 150 : 0) : pending.mode === "survival" ? 25 + pending.survivalDepth * 18 : pending.mode === "power" ? 40 : 35) + streakBonusAp
    : 8;
  const multiplier = economyMultiplier(profile);
  const xpEarned = clampReward(baseXp, multiplier);
  const arenaPointsEarned = clampReward(baseAp, multiplier);
  const badgeUnlocked = leagueAfter !== leagueBefore && isHigherLeague(leagueAfter, leagueBefore) && !profile.badgesUnlocked.includes(leagueAfter) ? leagueAfter : null;
  const unlockedBadges = badgeUnlocked ? Array.from(new Set([...profile.badgesUnlocked, badgeUnlocked])) : profile.badgesUnlocked;
  const nextProfile: ArenaProfile = {
    ...profile,
    rating: ratingAfter,
    bestRating: Math.max(profile.bestRating, ratingAfter),
    league: leagueAfter,
    seasonXp: profile.seasonXp + xpEarned,
    arenaPoints: profile.arenaPoints + arenaPointsEarned + (badgeUnlocked ? 25 * (leagueWeight(badgeUnlocked) + 1) : 0),
    wins: profile.wins + (arenaWin ? 1 : 0),
    losses: profile.losses + (arenaWin ? 0 : 1),
    winStreak: arenaWin ? profile.winStreak + 1 : 0,
    bestStreak: arenaWin ? Math.max(profile.bestStreak, profile.winStreak + 1) : profile.bestStreak,
    cupsWon: profile.cupsWon + (cupChampion ? 1 : 0),
    powerWins: profile.powerWins + (arenaWin && pending.mode === "power" ? 1 : 0),
    survivalBestDepth: arenaWin && pending.mode === "survival" ? Math.max(profile.survivalBestDepth, pending.survivalDepth + 1) : profile.survivalBestDepth,
    highestLeague: isHigherLeague(leagueAfter, profile.highestLeague) ? leagueAfter : profile.highestLeague,
    badgesUnlocked: unlockedBadges,
    dailyMatches: profile.dailyMatches + 1,
    weeklyMatches: profile.weeklyMatches + 1,
    lastDailyKey: dateKey(),
    lastWeeklyKey: weekKey(),
    lastPlayedAt: Date.now(),
  };
  const nextRun = nextProgressionRun(pending, nextProfile, arenaWin);
  const charges = input.powerCharges ?? pending.powerCharges;
  const totalCharges = pending.mode === "power" ? 3 : 0;
  const remainingCharges = charges ? charges.reveal + charges.shield + charges.freeze : totalCharges;
  const result: ArenaResult = {
    ...pending,
    completedAt: Date.now(),
    playerTimeSec: input.time,
    errors: input.errors,
    hintsUsed: input.hintsUsed ?? 0,
    win: arenaWin,
    ratingBefore: profile.rating,
    ratingAfter,
    ratingDelta,
    leagueBefore,
    leagueAfter,
    xpEarned,
    arenaPointsEarned,
    rewardSummary: `+${xpEarned} XP • +${arenaPointsEarned}${badgeUnlocked ? ` AP • ${badgeUnlocked} badge unlocked` : " AP"}`,
    badgeUnlocked,
    resultReason: resultReason(pending.mode, arenaWin, input.time, pending.targetTimeSec, input.errors),
    nextRun,
    cupChampion,
    powerChargesUsed: Math.max(0, totalCharges - remainingCharges),
    streakBonusXp,
    streakBonusAp,
    economyCapped: multiplier < 1,
    winStreakBefore: profile.winStreak,
    winStreakAfter: nextProfile.winStreak,
    promotion: leagueAfter !== leagueBefore && ratingAfter > profile.rating,
    demotion: leagueAfter !== leagueBefore && ratingAfter < profile.rating,
  };
  await commitArenaResult(result, nextProfile, nextRun);
  try {
    await grantArenaEconomyReward({ win: arenaWin, mode: pending.mode, cupChampion, survivalDepth: pending.survivalDepth, economyCapped: multiplier < 1 });
  } catch {
    // App-wide economy rewards must never block Arena result persistence.
  }
  return result;
}

export async function spendArenaPoints(amount: number, label = "Arena Shop purchase") {
  const profile = await getArenaProfile();
  const cost = Math.max(0, Number(amount) || 0);
  if (profile.arenaPoints < cost) return { ok: false, profile, missing: cost - profile.arenaPoints, label };
  const nextProfile: ArenaProfile = { ...profile, arenaPoints: profile.arenaPoints - cost };
  await writeJson(PROFILE_KEY, nextProfile);
  return { ok: true, profile: nextProfile, missing: 0, label };
}

export function formatArenaTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
