# Arena 7 Repairs - Sweirki Sudoku
# Run from PowerShell inside C:\gamesworld
# This script backs up changed files first, then applies the 7 Arena repairs one by one.

$ErrorActionPreference = "Stop"

$Root = "C:\gamesworld"
if (!(Test-Path $Root)) {
  throw "Project folder not found: $Root"
}
Set-Location $Root

$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupDir = Join-Path $Root "_arena_repair_backup_$Stamp"
New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null

$FilesToBackup = @(
  "app\arena\index.tsx",
  "app\arena\ModeScreen.tsx",
  "app\arena\power.tsx",
  "app\sudoku.tsx",
  "src\arena\arenaEngine.ts",
  "src\economy\economyEngine.ts",
  "utils\app\arena\ModeScreen.tsx"
)

foreach ($Rel in $FilesToBackup) {
  if (Test-Path $Rel) {
    $Dest = Join-Path $BackupDir $Rel
    New-Item -ItemType Directory -Path (Split-Path $Dest) -Force | Out-Null
    Copy-Item $Rel $Dest -Force
  }
}

function Read-Text($Path) {
  return [System.IO.File]::ReadAllText((Resolve-Path $Path), [System.Text.Encoding]::UTF8)
}

function Write-Text($Path, $Text) {
  [System.IO.File]::WriteAllText((Resolve-Path $Path), $Text, [System.Text.UTF8Encoding]::new($false))
}

function Replace-Required($Path, $Old, $New, $Label) {
  $Text = Read-Text $Path
  if (!$Text.Contains($Old)) {
    throw "Missing expected block for $Label in $Path"
  }
  $Text = $Text.Replace($Old, $New)
  Write-Text $Path $Text
  Write-Host "OK - $Label"
}

function Regex-Required($Path, $Pattern, $Replacement, $Label) {
  $Text = Read-Text $Path
  if (!([regex]::IsMatch($Text, $Pattern, [System.Text.RegularExpressions.RegexOptions]::Singleline))) {
    throw "Missing expected regex block for $Label in $Path"
  }
  $Text = [regex]::Replace($Text, $Pattern, $Replacement, [System.Text.RegularExpressions.RegexOptions]::Singleline)
  Write-Text $Path $Text
  Write-Host "OK - $Label"
}

Write-Host "Backup created: $BackupDir"

# ============================================================
# REPAIR 1 - Premium lock must be real, not visual only.
# Blocks non-premium Power Arena and Tournament Cup at engine level.
# Also prevents locked Hub tiles and mode screens from starting.
# ============================================================
Write-Host "Repair 1/7 - Premium lock enforcement"

$Engine = "src\arena\arenaEngine.ts"
Replace-Required $Engine `
'export async function startArenaRun(mode: ArenaMode, opts?: { isPremium?: boolean }): Promise<ArenaRun> {
  const existing = await readHealthyPendingRun();
  if (existing) return existing;
  const profile = await getArenaProfile();' `
'export async function startArenaRun(mode: ArenaMode, opts?: { isPremium?: boolean }): Promise<ArenaRun> {
  const existing = await readHealthyPendingRun();
  if (existing) return existing;
  if ((mode === "power" || mode === "tournament") && opts?.isPremium !== true) {
    const err = new Error("Sweirki Plus is required for this Arena mode.") as Error & { code?: string };
    err.code = "ARENA_PREMIUM_REQUIRED";
    throw err;
  }
  const profile = await getArenaProfile();' `
"engine premium gate"

$Hub = "app\arena\index.tsx"
Replace-Required $Hub `
'function ModeCard({ item, snapshot, isPremium }: { item: ModeTile; snapshot: ArenaSnapshot | null; isPremium: boolean }) {
  const locked = Boolean(item.premium && !isPremium);

  return (
    <Pressable
      style={({ pressed }) => [styles.cardMotion, pressed && styles.pressed]}
      onPress={() => {
        playArenaFeedback("tap");
        router.push(item.route as any);
      }}
    >' `
'function ModeCard({ item, snapshot, isPremium }: { item: ModeTile; snapshot: ArenaSnapshot | null; isPremium: boolean }) {
  const locked = Boolean(item.premium && !isPremium);

  return (
    <Pressable
      style={({ pressed }) => [styles.cardMotion, pressed && styles.pressed]}
      onPress={() => {
        playArenaFeedback("tap");
        if (locked) {
          router.push("/shop" as any);
          return;
        }
        router.push(item.route as any);
      }}
    >' `
"hub locked mode redirect"

$Mode = "app\arena\ModeScreen.tsx"
Replace-Required $Mode `
'  const copy = MODE_COPY[mode];
  const { isPremium } = useRevenueCat();' `
'  const copy = MODE_COPY[mode];
  const { isPremium } = useRevenueCat();
  const premiumLocked = (mode === "power" || mode === "tournament") && !isPremium;' `
"mode premiumLocked flag"

Replace-Required $Mode `
'  const canAffordEntry = (wallet?.coins ?? 0) >= entryCost.coins && (wallet?.tickets ?? 0) >= entryCost.tickets;' `
'  const canAffordEntry = !premiumLocked && (wallet?.coins ?? 0) >= entryCost.coins && (wallet?.tickets ?? 0) >= entryCost.tickets;' `
"mode afford respects premium"

Replace-Required $Mode `
'    if (activeRun) {
      goToRun(activeRun);
      return;
    }' `
'    if (activeRun) {
      goToRun(activeRun);
      return;
    }

    if (premiumLocked) {
      setEntryError("Sweirki Plus is required for this Arena mode.");
      router.push("/shop" as any);
      return;
    }' `
"mode start premium guard"

Replace-Required $Mode `
'      setEntryError(e?.code === "ARENA_ENTRY_FUNDS" ? `Need ${formatCost(entryCost)} to start this mode.` : "Arena could not start. Try again from the hub.");' `
'      setEntryError(e?.code === "ARENA_PREMIUM_REQUIRED" ? "Sweirki Plus is required for this Arena mode." : e?.code === "ARENA_ENTRY_FUNDS" ? `Need ${formatCost(entryCost)} to start this mode.` : "Arena could not start. Try again from the hub.");' `
"mode premium error text"

Replace-Required $Mode `
'      await forfeitPendingArenaRun();
      setEntryError(null);
      if (!canAffordEntry) {' `
'      await forfeitPendingArenaRun();
      setEntryError(null);
      if (premiumLocked) {
        setEntryError("Sweirki Plus is required for this Arena mode.");
        router.push("/shop" as any);
        return;
      }
      if (!canAffordEntry) {' `
"mode fresh-start premium guard"

# ============================================================
# REPAIR 2 - Survival / Tournament free entry must be mode-specific.
# Adds dailySurvivalRuns and dailyTournamentRuns counters.
# ============================================================
Write-Host "Repair 2/7 - Mode-specific free entry tracking"

Replace-Required $Engine `
'  dailyMatches: number;
  weeklyMatches: number;
  lastDailyKey: string;' `
'  dailyMatches: number;
  weeklyMatches: number;
  dailySurvivalRuns: number;
  dailyTournamentRuns: number;
  lastDailyKey: string;' `
"profile mode counter types"

Replace-Required $Engine `
'  dailyMatches: 0,
  weeklyMatches: 0,
  lastDailyKey: "",' `
'  dailyMatches: 0,
  weeklyMatches: 0,
  dailySurvivalRuns: 0,
  dailyTournamentRuns: 0,
  lastDailyKey: "",' `
"default mode counters"

Replace-Required $Engine `
'    dailyMatches: profile.lastDailyKey === today ? Math.max(0, Number(profile.dailyMatches ?? 0)) : 0,
    weeklyMatches: profile.lastWeeklyKey === thisWeek ? Math.max(0, Number(profile.weeklyMatches ?? 0)) : 0,' `
'    dailyMatches: profile.lastDailyKey === today ? Math.max(0, Number(profile.dailyMatches ?? 0)) : 0,
    weeklyMatches: profile.lastWeeklyKey === thisWeek ? Math.max(0, Number(profile.weeklyMatches ?? 0)) : 0,
    dailySurvivalRuns: profile.lastDailyKey === today ? Math.max(0, Number((profile as any).dailySurvivalRuns ?? 0)) : 0,
    dailyTournamentRuns: profile.lastDailyKey === today ? Math.max(0, Number((profile as any).dailyTournamentRuns ?? 0)) : 0,' `
"cadence resets mode counters"

Replace-Required $Engine `
'    dailyMatches: Number(raw.dailyMatches ?? 0),
    weeklyMatches: Number(raw.weeklyMatches ?? 0),' `
'    dailyMatches: Number(raw.dailyMatches ?? 0),
    weeklyMatches: Number(raw.weeklyMatches ?? 0),
    dailySurvivalRuns: Number((raw as any).dailySurvivalRuns ?? 0),
    dailyTournamentRuns: Number((raw as any).dailyTournamentRuns ?? 0),' `
"profile reads mode counters"

Replace-Required $Engine `
'  const nextProfile: ArenaProfile = { ...profile, rating: ratingAfter, league: leagueAfter, seasonXp: profile.seasonXp + xpEarned, arenaPoints: profile.arenaPoints + arenaPointsEarned, losses: profile.losses + 1, winStreak: 0, dailyMatches: profile.dailyMatches + 1, weeklyMatches: profile.weeklyMatches + 1, lastDailyKey: dateKey(), lastWeeklyKey: weekKey(), lastPlayedAt: Date.now() };' `
'  const nextProfile: ArenaProfile = { ...profile, rating: ratingAfter, league: leagueAfter, seasonXp: profile.seasonXp + xpEarned, arenaPoints: profile.arenaPoints + arenaPointsEarned, losses: profile.losses + 1, winStreak: 0, dailyMatches: profile.dailyMatches + 1, weeklyMatches: profile.weeklyMatches + 1, dailySurvivalRuns: profile.dailySurvivalRuns + (pending.mode === "survival" ? 1 : 0), dailyTournamentRuns: profile.dailyTournamentRuns + (pending.mode === "tournament" ? 1 : 0), lastDailyKey: dateKey(), lastWeeklyKey: weekKey(), lastPlayedAt: Date.now() };' `
"forfeit increments mode counters"

Replace-Required $Engine `
'    dailyMatches: profile.dailyMatches + 1,
    weeklyMatches: profile.weeklyMatches + 1,
    lastDailyKey: dateKey(),' `
'    dailyMatches: profile.dailyMatches + 1,
    weeklyMatches: profile.weeklyMatches + 1,
    dailySurvivalRuns: profile.dailySurvivalRuns + (pending.mode === "survival" ? 1 : 0),
    dailyTournamentRuns: profile.dailyTournamentRuns + (pending.mode === "tournament" ? 1 : 0),
    lastDailyKey: dateKey(),' `
"completed run increments mode counters"

$Economy = "src\economy\economyEngine.ts"
Replace-Required $Economy `
'export function getArenaEntryCost(mode: string, profile?: { dailyMatches?: number }, isPremium = false) {
  if (mode === "ranked") return { coins: 0, tickets: 0, label: "Ranked Duel entry is free" };
  if (mode === "power") return { coins: 0, tickets: 0, label: "Power Arena entry is free" };
  if (mode === "survival") {
    const freeRuns = isPremium ? 2 : 1;
    const used = Math.max(0, safeNumber(profile?.dailyMatches, 0));
    if (used < freeRuns) return { coins: 0, tickets: 0, label: "Daily Survival free entry" };
    return { coins: isPremium ? 150 : 300, tickets: 0, label: "Extra Survival entry" };
  }
  if (mode === "tournament") {
    const used = Math.max(0, safeNumber(profile?.dailyMatches, 0));
    if (used === 0) return { coins: 0, tickets: 0, label: "Daily Cup free entry" };
    return { coins: 0, tickets: 1, label: "Tournament Cup ticket entry" };
  }
  return { coins: 0, tickets: 0, label: "Free entry" };
}

export async function canAffordArenaEntry(mode: string, profile?: { dailyMatches?: number }, isPremium = false) {
  const wallet = await getEconomyWallet();
  const cost = getArenaEntryCost(mode, profile, isPremium);
  return { ok: wallet.coins >= cost.coins && wallet.tickets >= cost.tickets, wallet, cost, missing: wallet.coins < cost.coins ? "coins" as const : wallet.tickets < cost.tickets ? "tickets" as const : null };
}

export async function spendArenaEntry(mode: string, profile?: { dailyMatches?: number }, isPremium = false) {' `
'export function getArenaEntryCost(mode: string, profile?: { dailyMatches?: number; dailySurvivalRuns?: number; dailyTournamentRuns?: number }, isPremium = false) {
  if (mode === "ranked") return { coins: 0, tickets: 0, label: "Ranked Duel entry is free" };
  if (mode === "power") return { coins: 0, tickets: 0, label: "Power Arena entry is free" };
  if (mode === "survival") {
    const freeRuns = isPremium ? 2 : 1;
    const used = Math.max(0, safeNumber(profile?.dailySurvivalRuns, 0));
    if (used < freeRuns) return { coins: 0, tickets: 0, label: "Daily Survival free entry" };
    return { coins: isPremium ? 150 : 300, tickets: 0, label: "Extra Survival entry" };
  }
  if (mode === "tournament") {
    const used = Math.max(0, safeNumber(profile?.dailyTournamentRuns, 0));
    if (used === 0) return { coins: 0, tickets: 0, label: "Daily Cup free entry" };
    return { coins: 0, tickets: 1, label: "Tournament Cup ticket entry" };
  }
  return { coins: 0, tickets: 0, label: "Free entry" };
}

export async function canAffordArenaEntry(mode: string, profile?: { dailyMatches?: number; dailySurvivalRuns?: number; dailyTournamentRuns?: number }, isPremium = false) {
  const wallet = await getEconomyWallet();
  const cost = getArenaEntryCost(mode, profile, isPremium);
  return { ok: wallet.coins >= cost.coins && wallet.tickets >= cost.tickets, wallet, cost, missing: wallet.coins < cost.coins ? "coins" as const : wallet.tickets < cost.tickets ? "tickets" as const : null };
}

export async function spendArenaEntry(mode: string, profile?: { dailyMatches?: number; dailySurvivalRuns?: number; dailyTournamentRuns?: number }, isPremium = false) {' `
"economy entry cost uses mode counters"

# ============================================================
# REPAIR 3 - Daily/weekly goals use true result history, not only lastResult.
# ============================================================
Write-Host "Repair 3/7 - Goals from history"

$GoalsReplacement = @'
export function getArenaGoals(snapshot: ArenaSnapshot | null): ArenaGoal[] {
  const profile = snapshot?.profile ?? DEFAULT_PROFILE;
  const history = snapshot?.history ?? [];
  const today = dateKey();

  const todayResults = history.filter((result) => dateKey(result.completedAt) === today);
  const rankedWinToday = todayResults.some((result) => result.mode === "ranked" && result.win) ? 1 : 0;
  const tournamentPlayedToday = todayResults.some((result) => result.mode === "tournament") ? 1 : 0;
  const powerUseToday = Math.min(2, todayResults
    .filter((result) => result.mode === "power")
    .reduce((total, result) => total + Math.max(0, result.powerChargesUsed ?? 0), 0));
  const survivalProgress = Math.min(3, profile.survivalBestDepth ?? 0);
  const weeklyWinProgress = Math.min(5, profile.winStreak || profile.bestStreak || 0);

  return [
    { id: "daily-ranked-win", period: "daily", title: "Win a Ranked Duel", description: "Beat one rival target today.", progress: rankedWinToday, target: 1, reward: "+35 XP / +15 AP", complete: rankedWinToday >= 1 },
    { id: "daily-power-tools", period: "daily", title: "Use 2 Powers", description: "Spend Reveal, Shield, or Rewind in Power Arena.", progress: powerUseToday, target: 2, reward: "+25 XP / +10 AP", complete: powerUseToday >= 2 },
    { id: "daily-cup-entry", period: "daily", title: "Enter Tournament Cup", description: "Start or finish a cup stage.", progress: tournamentPlayedToday, target: 1, reward: "+30 XP / +10 AP", complete: tournamentPlayedToday >= 1 },
    { id: "weekly-survival-climb", period: "weekly", title: "Reach Survival Stage 3", description: "Clear enough perfect boards to touch Hard survival pressure.", progress: survivalProgress, target: 3, reward: "+120 XP / +45 AP", complete: survivalProgress >= 3 },
    { id: "weekly-streak-five", period: "weekly", title: "Build a 5-Win Streak", description: "Protect momentum across Arena results.", progress: weeklyWinProgress, target: 5, reward: "+150 XP / +60 AP", complete: weeklyWinProgress >= 5 },
  ];
}

'@
Regex-Required $Engine 'export function getArenaGoals\(snapshot: ArenaSnapshot \| null\): ArenaGoal\[\] \{.*?\n\}\n\nexport function getLeague' ($GoalsReplacement + 'export function getLeague') "goals read history"

# ============================================================
# REPAIR 4 - Time Freeze promise mismatch.
# The power subtracts 20 seconds, so visible copy now calls it Time Rewind.
# ============================================================
Write-Host "Repair 4/7 - Time Freeze renamed to Time Rewind in visible UI"

foreach ($Path in @("app\arena\index.tsx", "app\arena\ModeScreen.tsx", "app\arena\power.tsx", "app\sudoku.tsx")) {
  if (Test-Path $Path) {
    $Text = Read-Text $Path
    $Text = $Text.Replace("Time Freeze", "Time Rewind")
    $Text = $Text.Replace("Freeze under pressure", "Rewind under pressure")
    $Text = $Text.Replace("Reveal • Shield • Freeze", "Reveal • Shield • Rewind")
    $Text = $Text.Replace("Freeze {arenaPowerCharges.freeze}", "Rewind {arenaPowerCharges.freeze}")
    Write-Text $Path $Text
  }
}
Write-Host "OK - visible power copy matches actual rewind behavior"

# ============================================================
# REPAIR 5 - Arena progress is saved immediately on undo/redo/delete.
# ============================================================
Write-Host "Repair 5/7 - Undo/redo/delete persist Arena progress"

$Sudoku = "app\sudoku.tsx"
Replace-Required $Sudoku `
'    setPuzzle(prev);
    setHistory(history.slice(0, -1));
    updateDigitCounts(prev);
  };' `
'    setPuzzle(prev);
    setHistory(history.slice(0, -1));
    updateDigitCounts(prev);
    if (isArena) {
      persistArenaProgress(prev, {
        timer: time,
        hintsLeft,
        difficulty,
        errors: errorCount,
        errorCount,
        powerCharges: arenaPowerCharges,
        shieldArmed: arenaShieldArmed,
      });
    }
  };' `
"undo saves arena progress"

Replace-Required $Sudoku `
'    setPuzzle(next);
    setRedoStack(redoStack.slice(1));
    updateDigitCounts(next);
  };' `
'    setPuzzle(next);
    setRedoStack(redoStack.slice(1));
    updateDigitCounts(next);
    if (isArena) {
      persistArenaProgress(next, {
        timer: time,
        hintsLeft,
        difficulty,
        errors: errorCount,
        errorCount,
        powerCharges: arenaPowerCharges,
        shieldArmed: arenaShieldArmed,
      });
    }
  };' `
"redo saves arena progress"

Replace-Required $Sudoku `
'    setPuzzle(newPuzzle);
    updateDigitCounts(newPuzzle);

    const won = newPuzzle.every((row) =>' `
'    setPuzzle(newPuzzle);
    updateDigitCounts(newPuzzle);
    if (isArena) {
      persistArenaProgress(newPuzzle, {
        timer: time,
        hintsLeft,
        difficulty,
        errors: errorCount,
        errorCount,
        powerCharges: arenaPowerCharges,
        shieldArmed: arenaShieldArmed,
      });
    }

    const won = newPuzzle.every((row) =>' `
"delete saves arena progress"

# ============================================================
# REPAIR 6 - Tournament asset consistency.
# Mode screen uses the same approved tournament_cup_v2 asset as Hub.
# ============================================================
Write-Host "Repair 6/7 - Tournament mode asset consistency"

$Text = Read-Text $Mode
$Text = $Text.Replace('tournament: require("../../assets/arena/tournaments/champion_cup.png")', 'tournament: require("../../assets/arena/modes/tournament_cup_v2.png")')
$Text = $Text.Replace('tournament: require("../../assets/arena/tournaments/cup_trophy.png")', 'tournament: require("../../assets/arena/modes/tournament_cup_v2.png")')
Write-Text $Mode $Text
Write-Host "OK - tournament uses tournament_cup_v2 on ModeScreen"

# ============================================================
# REPAIR 7 - Remove wrong leftover contract/rival wording and quarantine stale duplicate file.
# ============================================================
Write-Host "Repair 7/7 - Wording cleanup + stale duplicate quarantine"

$Text = Read-Text $Engine
$Text = $Text.Replace("You beat the target while staying inside the Arena contract.", "You beat the target while staying inside the Arena rules.")
$Text = $Text.Replace("The match contract was not cleared cleanly enough.", "The Arena target was not cleared cleanly enough.")
Write-Text $Engine $Text

$Text = Read-Text $Mode
$Text = $Text.Replace('opponentLabel: "Power Rival"', 'opponentLabel: "Power Loadout"')
$Text = $Text.Replace('opponentLabel: "Cup Opponent"', 'opponentLabel: "Cup Bracket"')
$Text = $Text.Replace('contract: "One official duel. Beat the target with control to gain rating."', 'contract: "One official rated board. Beat the target with control to gain rating."')
$Text = $Text.Replace('contract: "Use limited assists wisely. Controlled decisions beat raw speed."', 'contract: "Use limited assists wisely. Controlled decisions beat raw speed."')
$Text = $Text.Replace('return mode === "survival" ? "Run stakes" : "Match contract";', 'return mode === "survival" ? "Run stakes" : mode === "power" ? "Power stakes" : mode === "tournament" ? "Cup stakes" : "Arena stakes";')
$Text = $Text.Replace('"Arena briefing"', '"Arena system"')
$Text = $Text.Replace('"Rules of engagement"', '"Arena System"')
Write-Text $Mode $Text

$Stale = "utils\app\arena\ModeScreen.tsx"
if (Test-Path $Stale) {
  Rename-Item $Stale "ModeScreen.tsx.stale-disabled" -Force
  Write-Host "OK - stale duplicate ModeScreen quarantined"
} else {
  Write-Host "OK - stale duplicate ModeScreen already absent"
}

# ============================================================
# Verification
# ============================================================
Write-Host "Verification checks"

Select-String -Path "src\arena\arenaEngine.ts" -Pattern "ARENA_PREMIUM_REQUIRED|dailySurvivalRuns|dailyTournamentRuns|todayResults|Arena target" | ForEach-Object { $_.Line }
Select-String -Path "src\economy\economyEngine.ts" -Pattern "dailySurvivalRuns|dailyTournamentRuns" | ForEach-Object { $_.Line }
Select-String -Path "app\arena\ModeScreen.tsx" -Pattern "premiumLocked|Power Loadout|Cup Bracket|tournament_cup_v2|Time Rewind|Cup stakes|Power stakes" | ForEach-Object { $_.Line }
Select-String -Path "app\sudoku.tsx" -Pattern "persistArenaProgress\(prev|persistArenaProgress\(next|persistArenaProgress\(newPuzzle|Rewind" | ForEach-Object { $_.Line }

Write-Host "Remaining bad visible wording search:"
Get-ChildItem app\arena,src\arena -Recurse -Include *.tsx,*.ts | Select-String -Pattern "Power Rival|Cup Opponent|match contract|Arena contract|Time Freeze" | ForEach-Object { "$($_.Path):$($_.LineNumber): $($_.Line)" }

Write-Host "Now run your normal checks:"
Write-Host "npm run typecheck"
Write-Host "npx expo start --clear"
Write-Host "Done. Backup is here: $BackupDir"
