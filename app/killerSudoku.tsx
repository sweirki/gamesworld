// Killer â€ renderer reset with original cosmetics preserved

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Animated,
  ImageBackground,
  Modal,
  ScrollView,
} from "react-native";

import { Svg, Line, Rect, Path, Text as SvgText } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { calculateXpForLadder } from "../utils/ladder/scoreEngine";
import { getColors } from "./theme/index";
import { useRouter } from "expo-router";
import { useRevenueCat } from "../src/hooks/useRevenueCat";
import { generateSudoku, generateKillerCages, validateCages } from "../utils/sudokuGen";
import { saveGame, loadGame, clearGame } from "../utils/storageUtils";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import NumberPad from "./components/NumberPad";
import Controls from "./components/Controls";
import AppBackButton from "./components/AppBackButton";
import WinModal from "./components/WinModal";
import KillerCell from "./components/KillerCell";
import { auth } from "../firebase";
import { updateStatsOnWin } from "../lib/statsManager";
import { refreshLadderData } from "./lib/ladderBridge";
import { saveWin } from "../src/lib/saveWin";
import UniversalModal from "./components/UniversalModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { writeSeasonalScore, getCurrentStreak } from "../utils/ladder/scoreEngine";
import { onGameFinished } from "../src/game/onGameFinished";

// ===== Layout constants
const { width } = Dimensions.get("window");

// Use the SAME cell size as SudokuCell
export const CELL_SIZE = Math.floor((width - 40) / 9);
const BOARD_SIZE = CELL_SIZE * 9;

const GRID_SIZE = BOARD_SIZE;

// ===== Brand colors (preserve your gold box lines)
const GOLD = "#d8b24a";

type Cell = {
  value: number | null;
  solution: number;
  prefilled: boolean;
  notes?: number[]; // you use notes elsewhere; keep it here too
};
export default function KillerSudoku() {
  const { isPremium, loading } = useRevenueCat();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isPremium) {
      router.replace("/upgrade");
    }
  }, [loading, isPremium, router]);

  if (loading || !isPremium) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F6FBFF", padding: 24 }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#14385F", textAlign: "center" }}>Killer Sudoku is Premium</Text>
        <Text style={{ marginTop: 8, fontSize: 15, color: "#6F7F91", textAlign: "center" }}>Premium access is required.</Text>
      </View>
    );
  }

  return <KillerSudokuGame />;
}

function KillerSudokuGame() {
const colors = getColors();

const [highlightDigit, setHighlightDigit] = useState<number | null>(null);
const [contextCells, setContextCells] = useState<[number, number][]>([]);


  const router = useRouter();
const s = styles(colors);

  const [puzzle, setPuzzle] = useState<Cell[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);

  const [history, setHistory] = useState<Cell[][][]>([]);
  const [redoStack, setRedoStack] = useState<Cell[][][]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const [isPencilMode, setIsPencilMode] = useState(false);
  const [hintsLeft, setHintsLeft] = useState<number>(3);
// Username (match Classic)
const [username, setUsername] = useState("Guest");

useEffect(() => {
  AsyncStorage.getItem("username").then((name) => {
    if (name) setUsername(name);
  });
}, []);

// â­ Phase 10 â€” Killer onboarding (one-time)
useEffect(() => {
  let alive = true;

  (async () => {
    try {
      const seen = await AsyncStorage.getItem("onboarded:killer");
      if (!seen && alive) {
        setShowOnboarding(true);

        setTimeout(() => {
          if (!alive) return;
          setShowOnboarding(false);
          AsyncStorage.setItem("onboarded:killer", "1");
        }, 3000);
      }
    } catch {}
  })();

  return () => {
    alive = false;
  };
}, []);

   const [timer, setTimer] = useState(0);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");

 const [winVisible, setWinVisible] = useState(false);
 const [showOnboarding, setShowOnboarding] = useState(false);

  const [hasWon, setHasWon] = useState(false);
  const [gameWon, setGameWon] = useState(false);

  const [cages, setCages] = useState<Array<{ id: string; sum?: number; target?: number; cells: [number, number][] }>>([]);
  const [badCages, setBadCages] = useState<Set<string>>(new Set());

  const MAX_STRIKES = 5;
  const gameOverShown = useRef(false);
// âœ… Classic-style finalize guards (prevents zombie resume / late saves)
const winHandledRef = useRef(false);
const skipNextResumeRef = useRef(false);
const skipNextSaveRef = useRef(false);

  const [blinkCells, setBlinkCells] = useState<[number, number][]>([]);
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const cageGlowAnim = useRef(new Animated.Value(0)).current;
const [gameOverVisible, setGameOverVisible] = useState(false);
const controlsLocked = gameWon || winVisible || gameOverVisible;
  // ===== New UI states (copied from Classic style) =====
  const [showMenu, setShowMenu] = useState(false); // difficulty menu
  const [pendingDifficulty, setPendingDifficulty] =
    useState<"easy" | "medium" | "hard" | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false); // confirm difficulty switch

  const [resumeVisible, setResumeVisible] = useState(false);
const [resumeData, setResumeData] = useState<any | null>(null);
const [isHydrating, setIsHydrating] = useState(true);
const [boardInstanceKey, setBoardInstanceKey] = useState(0);


 const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  };

  // ===== Load/resume

useFocusEffect(
  useCallback(() => {
    if (skipNextResumeRef.current) {
      skipNextResumeRef.current = false;
      return;
    }

    let alive = true;
    setIsHydrating(true);

    (async () => {
      try {
        const saved = await loadGame("killer");

        const validPuzzle =
          saved &&
          Array.isArray(saved.puzzle) &&
          saved.puzzle.length === 9 &&
          saved.puzzle.every(
            (row: any) =>
              Array.isArray(row) &&
              row.length === 9 &&
              row.every(
                (cell: any) =>
                  cell &&
                  typeof cell === "object" &&
                  "value" in cell &&
                  "solution" in cell &&
                  "prefilled" in cell &&
                  Array.isArray(cell.notes ?? [])
              )
          );

        const validCages =
          saved &&
          Array.isArray(saved.cages) &&
          saved.cages.every(
            (cage: any) =>
              cage &&
              Array.isArray(cage.cells) &&
              cage.cells.every(
                ([r, c]: [number, number]) =>
                  typeof r === "number" &&
                  typeof c === "number" &&
                  r >= 0 &&
                  r < 9 &&
                  c >= 0 &&
                  c < 9
              )
          );

        const validTimer = saved && typeof saved.timer === "number";

        if (
          alive &&
          validPuzzle &&
          validCages &&
          validTimer &&
          isBoardTouched(saved.puzzle)
        ) {
         setResumeData(saved);
setResumeVisible(true);
setIsHydrating(false);
return;
        }

        await clearGame("killer");

        if (!alive) return;
        startNewBoard();
      } catch {
        if (!alive) return;
        startNewBoard();
      }
    })();

    return () => {
      alive = false;
    };
  }, [])
);

  // React to difficulty changes (matches Hyper/X)

  // ===== Strikes -> Game Over
   useEffect(() => {
    if (errorCount >= MAX_STRIKES && !gameOverShown.current) {
      gameOverShown.current = true;
      setTimeout(() => setGameOverVisible(true), 300);
    }
  }, [errorCount]);


function startNewBoard(forcedDifficulty?: "easy" | "medium" | "hard") {
  const nextDifficulty = forcedDifficulty ?? difficulty;

  setIsHydrating(true);

 const raw = generateSudoku(nextDifficulty) as any[][];

if (!Array.isArray(raw) || raw.length !== 9) {
  console.warn("Killer raw board invalid, retrying...");
  requestAnimationFrame(() => startNewBoard(nextDifficulty));
  return;
}

const safeBoard: Cell[][] = raw.map((row: any[]) =>
  row.map((cell: any) => ({
    value: cell?.prefilled ? cell.value ?? cell.solution : null,
    solution: cell?.solution ?? 0,
    prefilled: !!cell?.prefilled,
    notes: Array.isArray(cell?.notes) ? cell.notes : [],
  }))
);

// validate board shape
const validBoard =
  Array.isArray(safeBoard) &&
  safeBoard.length === 9 &&
  safeBoard.every(
    (row) =>
      Array.isArray(row) &&
      row.length === 9 &&
      row.every(
        (cell) =>
          cell &&
          typeof cell === "object" &&
          typeof cell.solution === "number" &&
          "value" in cell &&
          "prefilled" in cell &&
          Array.isArray(cell.notes ?? [])
      )
  );

if (!validBoard) {
  console.warn("Killer: invalid board generated, retrying...");
requestAnimationFrame(() => startNewBoard(nextDifficulty));
return;
}

const solution = safeBoard.map((r) => r.map((c) => c.solution));

const cageData = generateKillerCages(solution) as Array<{
  id: string;
  sum?: number;
  target?: number;
  cells: [number, number][];
}>;

const validCages =
  Array.isArray(cageData) &&
  cageData.length > 0 &&
  cageData.every(
    (cage) =>
      cage &&
      Array.isArray(cage.cells) &&
      cage.cells.every(
        ([r, c]) =>
          typeof r === "number" &&
          typeof c === "number" &&
          r >= 0 &&
          r < 9 &&
          c >= 0 &&
          c < 9
      )
  );

if (!validCages) {
 console.warn("Killer: invalid cages generated, retrying...");
requestAnimationFrame(() => startNewBoard(nextDifficulty));
return;
}

  setPuzzle(safeBoard);
  setCages(cageData);
  setBadCages(new Set<string>());
  setErrorCount(0);
  gameOverShown.current = false;
  setSelected(null);
  setHighlightDigit(null);
  setContextCells([]);
  setHistory([]);
  setRedoStack([]);
  setHintsLeft(3);
  setGameWon(false);
  setHasWon(false);
   setWinVisible(false);
  setResumeVisible(false);
  setResumeData(null);
  setTimer(0);
  setBoardInstanceKey((k) => k + 1);

  cageGlowAnim.setValue(0);

  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

 requestAnimationFrame(() => {
  setIsHydrating(false);
  resumeTimer();
});
};

  const clone = (p: Cell[][]) => JSON.parse(JSON.stringify(p));
  const persistKiller = (
  board: Cell[][],
  overrides?: Partial<{
    timer: number;
    errorCount: number;
    hintsLeft: number;
    difficulty: "easy" | "medium" | "hard";
  }>
) => {
  saveGame("killer", {
    puzzle: board,
    cages,
    timer: overrides?.timer ?? timer,
    errorCount: overrides?.errorCount ?? errorCount,
    hintsLeft: overrides?.hintsLeft ?? hintsLeft,
    difficulty: overrides?.difficulty ?? difficulty,
  });
};

  const isBoardTouched = (board: Cell[][] | null) => {
  if (!Array.isArray(board)) return false;

  for (const row of board) {
    for (const cell of row) {
      if (!cell?.prefilled && cell?.value != null) return true;
      if (Array.isArray(cell?.notes) && cell.notes.length > 0) return true;
    }
  }

  return false;
};

  const pushHistory = () => {
    setHistory((h) => [...h, clone(puzzle)]);
    setRedoStack([]);
  };

  const getCageTarget = (cage: { sum?: number; target?: number }) =>
    typeof cage.target === "number" ? cage.target : (cage.sum as number);

  const recomputeBadCages = (board: Cell[][]) => {
    const bad = new Set<string>();
    cages.forEach((cage, idx) => {
      const id = cage.id ?? String(idx);
      const target = getCageTarget(cage);
      const vals = cage.cells.map(([rr, cc]) => board?.[rr]?.[cc]?.value ?? null);
      const filled = vals.filter((v) => v !== null) as number[];
      const sum = filled.reduce((a, b) => a + b, 0);
      // duplicates break a cage too
      const hasDup = new Set(filled).size !== filled.length;

      if ((filled.length === cage.cells.length && (sum !== target || hasDup)) || sum > target) {
        bad.add(id);
      }
    });
    setBadCages(bad);
    return bad;
  };

const handleCellPress = (row: number, col: number, cell?: any) => {
  if (gameWon) return;

  setSelected([row, col]);

  if (cell?.value != null) {
    setHighlightDigit(cell.value);
  }

  try { Haptics.selectionAsync(); } catch {}

  let context: [number, number][] = [];
  context = context.concat(puzzle[row].map((_, ci) => [row, ci]));
  context = context.concat(puzzle.map((_, ri) => [ri, col]));

  const boxRow = Math.floor(row / 3);
  const boxCol = Math.floor(col / 3);
  for (let rr = boxRow * 3; rr < boxRow * 3 + 3; rr++) {
    for (let cc = boxCol * 3; cc < boxCol * 3 + 3; cc++) {
      context.push([rr, cc]);
    }
  }

  setContextCells(context);
};

  const triggerBlink = (cells: [number, number][]) => {
    setBlinkCells(cells);
    const blinkOnce = Animated.sequence([
      Animated.timing(blinkAnim, { toValue: 0.2, duration: 180, useNativeDriver: true }),
      Animated.timing(blinkAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]);
    Animated.sequence([blinkOnce, blinkOnce, blinkOnce]).start(() => setBlinkCells([]));
  };

  const handleNumberPress = (num: number) => {
    if (!selected || gameWon) return;
    const [r, c] = selected;
    const cell = puzzle?.[r]?.[c];
    if (!cell || cell.prefilled) return;

    // Pencil
    if (isPencilMode) {
      const next = clone(puzzle);
      if (!Array.isArray(next[r][c].notes)) next[r][c].notes = [];
      const i = next[r][c].notes.indexOf(num);
      if (i === -1) next[r][c].notes.push(num);
      else next[r][c].notes.splice(i, 1);
    setPuzzle(next);
persistKiller(next);


      recomputeBadCages(next);
      return;
    }

    pushHistory();
    const next = clone(puzzle);
    next[r][c].value = num;
    setHighlightDigit(num);
  setPuzzle(next);

const nextErrors =
  num !== next[r][c].solution
    ? Math.min(errorCount + 1, MAX_STRIKES)
    : errorCount;

if (num !== next[r][c].solution) {
  setErrorCount(nextErrors);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
} else {
  Haptics.selectionAsync();
}

// âœ… save the SAME board + the UPDATED strike count
persistKiller(next, { errorCount: nextErrors });


    checkRowColBoxCompletion(next, r, c);
    recomputeBadCages(next);
    checkCompletion(next);
  };

  const handleDelete = () => {
    if (!selected || gameWon) return;
    const [r, c] = selected;
    if (puzzle[r][c].prefilled) return;
    pushHistory();
    const next = clone(puzzle);
    next[r][c].value = null;
   setPuzzle(next);
persistKiller(next);


    recomputeBadCages(next);
  };

  const handleHint = () => {
    if (hintsLeft <= 0 || !selected || gameWon) return;
    const [r, c] = selected;
    pushHistory();
    const next = clone(puzzle);
    next[r][c].value = next[r][c].solution;
  setPuzzle(next);

const nextHints = Math.max(0, hintsLeft - 1);
setHintsLeft(nextHints);

// âœ… save board + updated hints
persistKiller(next, { hintsLeft: nextHints });

recomputeBadCages(next);

    Haptics.selectionAsync();
    checkCompletion(next);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack((rs) => [clone(puzzle), ...rs]);
    setPuzzle(prev);
    setHistory((h) => h.slice(0, -1));
    recomputeBadCages(prev);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const [next, ...rest] = redoStack;
    setHistory((h) => [...h, clone(puzzle)]);
 setPuzzle(next);
persistKiller(next);


    setRedoStack(rest);
    recomputeBadCages(next);
  };

  const checkRowColBoxCompletion = (board: Cell[][], r: number, c: number) => {
    const rowCells = Array.from({ length: 9 }, (_, i) => [r, i]);
    const colCells = Array.from({ length: 9 }, (_, i) => [i, c]);
    const boxR = Math.floor(r / 3) * 3;
    const boxC = Math.floor(c / 3) * 3;
    const boxCells = Array.from({ length: 9 }, (_, i) => [boxR + Math.floor(i / 3), boxC + (i % 3)]);
    const doneRow = rowCells.every(([rr, cc]) => board[rr][cc].value === board[rr][cc].solution);
    const doneCol = colCells.every(([rr, cc]) => board[rr][cc].value === board[rr][cc].solution);
    const doneBox = boxCells.every(([rr, cc]) => board[rr][cc].value === board[rr][cc].solution);
    if (doneRow) triggerBlink(rowCells as [number, number][]);
    if (doneCol) triggerBlink(colCells as [number, number][]);
    if (doneBox) triggerBlink(boxCells as [number, number][]);
  };

  const checkCompletion = (board: Cell[][]) => {
   if (board.every((r: Cell[]) => r.every((c: Cell) => c.value !== null))) {
  const allCorrect = board.every((r: Cell[]) =>
    r.every((c: Cell) => c.value === c.solution)
  );

      // validateCages returns boolean (kept for backward compatibility)
      if (allCorrect && validateCages(board, cages)) handleWin();
    }
  };
 const handleWin = async () => {
  // âœ… run only once
  if (winHandledRef.current) return;
  winHandledRef.current = true;

  // ðŸ”’ FINALIZE: no resume + no save after win
  skipNextResumeRef.current = true;
  skipNextSaveRef.current = true;

  setHasWon(true);
  setGameWon(true);

  // stop timer immediately
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  // âœ… clear saved killer game (await to avoid race)
  await clearGame("killer");


  // âœ… Use the real app username (not email)
  const ladderUser = auth.currentUser?.uid || "Guest";

  // âœ… Update stats
  await updateStatsOnWin("killer", timer, errorCount, 3 - hintsLeft, ladderUser);

  // âœ… Refresh cached ladder stats
  await refreshLadderData(ladderUser);

  // â­ Award LADDER XP for Killer
  try {
    const xp = calculateXpForLadder({
      mode: "killer",
      difficulty,
      time: timer,
      errors: errorCount,
    });
    console.log("ðŸ”¥ Ladder XP awarded (Killer):", xp);
  } catch (err) {
    console.warn("âŒ Failed to award ladder XP (Killer):", err);
  }

  // â­ Seasonal leaderboard write
  try {
    await writeSeasonalScore(
      ladderUser,                       // uid substitute
      ladderUser,                       // username
      Math.max(0, 999 - timer),         // score (faster = higher)
      timer,
      await getCurrentStreak(ladderUser),
      "killer"
    );
  } catch (err) {
    console.error("âŒ Seasonal write (Killer) failed:", err);
  }

  // â­ Reveal solved board
 const solved = puzzle.map((row: Cell[]) =>
  row.map((cell: Cell) => ({ ...cell, value: cell.solution }))
);

  setPuzzle(solved);

  // timer already stopped at finalize

// âœ… HISTORY (UNIFIED PATTERN)
await onGameFinished({
  mode: "killer",
  win: true,
  time: timer,
  errors: errorCount,
  hintsUsed: 0,
  difficulty: "killer",
  score: Math.max(0, 999 - timer),
});


  setWinVisible(true);

  // Save win history
 saveWin(ladderUser, "killer", timer, errorCount);
};

const handleGameOverClose = async () => {
  // stop timer
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  // clear saved killer game
  await clearGame("killer");

  // reset state
  setPuzzle([]);
  setCages([]);
  setBadCages(new Set());
  setSelected(null);
  setErrorCount(0);
  setTimer(0);
  setHistory([]);
  setRedoStack([]);
  setHintsLeft(3);
  setGameWon(false);
  gameOverShown.current = false;
setResumeVisible(false);
setResumeData(null);

  // close modal
  setGameOverVisible(false);

  // go back to Variant Hub
  router.replace("/variantHub");
};

useEffect(() => {
  return () => {
    if (hasWon || gameOverVisible) return;
        if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }

    if (!Array.isArray(puzzle) || puzzle.length !== 9) return;
    if (!puzzle.every(row => Array.isArray(row) && row.length === 9)) return;

    // ðŸ§  do not save untouched boards
    if (!isBoardTouched(puzzle)) return;

 persistKiller(puzzle);



  };
}, [puzzle, cages, timer, hasWon]);



  const getDigitCounts = () => {
    const counts = Array(9).fill(0);
  puzzle.forEach((row: Cell[]) =>
  row.forEach((cell: Cell) => {
    if (cell.value) counts[cell.value - 1]++;
  })
);

    return counts;
  };
  const digitCounts = getDigitCounts();
  

// ======== KILLER CAGE VISUALS (fills, borders, sums) ========
const CELL = CELL_SIZE;

// dotted cage stroke style

const strokeBase = {
  stroke: "rgba(222, 156, 38, 0.78)",
  strokeWidth: 1.35,
  strokeDasharray: "5 3",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  fill: "none",
} as const;

// cage index map
const cageMap: (string | null)[][] = Array.from({ length: 9 }, () =>
  Array(9).fill(null)
);

// fill cageMap
cages.forEach((cg, idx) => {
  if (!cg || !Array.isArray(cg.cells)) return;
  cg.cells.forEach(([r, c]) => {
    if (r >= 0 && r < 9 && c >= 0 && c < 9)
      cageMap[r][c] = cg.id ?? `c${idx}`;
  });
});

// edge builder
const allEdges: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [];
const seenEdges = new Set<string>();
const cageInset = 3;

cages.forEach((cage, idx) => {
  if (!cage?.cells?.length) return;

  const cid = cage.id ?? String(idx);

  const add = (x1: number, y1: number, x2: number, y2: number) => {
    const a = `${Math.min(x1, x2)}|${Math.min(y1, y2)}`;
    const b = `${Math.max(x1, x2)}|${Math.max(y1, y2)}`;
    const key = `${a}>${b}`;
    if (!seenEdges.has(key)) {
      seenEdges.add(key);
      allEdges.push({ id: cid, x1, y1, x2, y2 });
    }
  };

  cage.cells.forEach(([r, c]) => {
    const up = r === 0 || cageMap[r - 1][c] !== cageMap[r][c];
    const dn = r === 8 || cageMap[r + 1][c] !== cageMap[r][c];
    const lf = c === 0 || cageMap[r][c - 1] !== cageMap[r][c];
    const rt = c === 8 || cageMap[r][c + 1] !== cageMap[r][c];

    const xl = c * CELL + cageInset;
    const xr = (c + 1) * CELL - cageInset;
    const yt = r * CELL + cageInset;
    const yb = (r + 1) * CELL - cageInset;

    if (up) add(xl, yt, xr, yt);
    if (lf) add(xl, yt, xl, yb);
    if (rt) add(xr, yt, xr, yb);
    if (dn) add(xl, yb, xr, yb);
  });
});

// pastel fills
const palette = ["rgba(245, 185, 67, 0.025)"];
const fills = cages.flatMap((cage, i) => {
  if (!cage || !Array.isArray(cage.cells)) return [];
  return cage.cells.map(([r, c]) => (
    <Rect
      key={`bg-${cage.id ?? i}-${r}-${c}`}
      x={c * CELL}
      y={r * CELL}
      width={CELL}
      height={CELL}
      opacity={1}
      fill={palette[i % palette.length]}
    />
  ));
});

// dotted borders
const borderLines = allEdges.map((e, i) => (
  <Line
    key={`edge-${i}`}
    x1={e.x1}
    y1={e.y1}
    x2={e.x2}
    y2={e.y2}
    stroke={badCages.has(e.id) ? "#cc1f1f" : strokeBase.stroke}
    strokeWidth={strokeBase.strokeWidth}
    strokeDasharray={strokeBase.strokeDasharray}
    strokeLinecap={strokeBase.strokeLinecap}
    strokeLinejoin={strokeBase.strokeLinejoin}
  />
));

// sums
const sums = cages.map((cage, i) => {
  if (!cage?.cells?.length) return null;

  const [r0, c0] = cage.cells[0];
  const x = c0 * CELL;
  const y = r0 * CELL;

  // use target if sum doesn't exist
  const target = cage.sum ?? cage.target ?? "";

  return (
    <SvgText
      key={`sum-${i}-${target}`}
      x={x + 3}
      y={y + 14}
   fill={badCages.has(cage.id ?? String(i)) ? "#cc1f1f" : "#8A5A00"}
      fontSize="11"
      fontWeight="900"
      textAnchor="start"
    >
      {String(target)}
    </SvgText>
  );
});
  // Build cage edges for overlay
 // ðŸ”’ HARD HYDRATION GUARD
const boardReady =
  Array.isArray(puzzle) &&
  puzzle.length === 9 &&
  puzzle.every((row) => Array.isArray(row) && row.length === 9);

const cagesReady =
  Array.isArray(cages) &&
  cages.length > 0 &&
  cages.every((cage) => Array.isArray(cage.cells));

if ((isHydrating || !boardReady || !cagesReady) && !resumeVisible) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#081028",
      }}
    >
      <Text
        style={{
          color: "#12385A",
          fontWeight: "700",
          fontSize: 16,
        }}
      >
        Loading...
      </Text>
    </View>
  );
}

// ðŸ‘‡ THIS is the correct return to keep
return (
  <View style={{ flex: 1 }}>
    <AppBackButton />
    <ScrollView
      style={styles(colors).scrollShell}
      contentContainerStyle={styles(colors).scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
    {showOnboarding && (
  <View
    pointerEvents="none"
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 50,
    }}
  >
    <View
      style={{
        backgroundColor: "rgba(20,20,20,0.92)",
        paddingVertical: 14,
        paddingHorizontal: 18,
        borderRadius: 16,
        maxWidth: "85%",
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          color: "#F5E6A8",
          textAlign: "center",
          fontWeight: "600",
          lineHeight: 20,
        }}
      >
        Cages must add up to the total shown, with no repeats inside.
      </Text>
    </View>
  </View>
)}

    <View style={styles(colors).screen}>
  <View style={styles(colors).gameplayHeader}>
    <View style={styles(colors).modeTitleRow}>
      <Ionicons
        name="grid-outline"
        size={18}
        color={"#F5B943"}
      />
      <Text style={styles(colors).modeTitle}>Killer Sudoku</Text>
    </View>

    <View style={styles(colors).statusRow}>
      <TouchableOpacity
        activeOpacity={0.82}
        style={[styles(colors).statusChip, styles(colors).difficultyChip]}
        onPress={() => setShowMenu(true)}
      >
        <Text style={styles(colors).statusChipText}>{difficulty.toUpperCase()}</Text>
        <Ionicons name="chevron-down" size={13} color={"#12385A"} />
      </TouchableOpacity>

      <View style={styles(colors).statusChip}>
        <Ionicons name="time-outline" size={14} color={"#12385A"} />
        <Text style={styles(colors).statusChipText}>
          {Math.floor(timer / 60)}:{String(timer % 60).padStart(2, "0")}
        </Text>
      </View>

      <View style={styles(colors).statusChip}>
        <Ionicons
          name="close-circle-outline"
          size={14}
          color={errorCount > 0 ? "#D9534F" : "#12385A"}
        />
        <Text style={[styles(colors).statusChipText, errorCount > 0 && styles(colors).strikeChipText]}>
          {Math.min(errorCount, MAX_STRIKES)}/{MAX_STRIKES}
        </Text>
      </View>
    </View>
  </View>

               {/* Difficulty Menu - like Classic */}

    {/* Board Container */}
<View style={styles(colors).boardContainer}>

  {/* Board itself */}

<View
  key={`board-${boardInstanceKey}`}
  style={styles(colors).board}
>

    {/* Thin Grid INSIDE board */}


   <Svg
  width={GRID_SIZE}
  height={GRID_SIZE}
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 1,
  }}
  pointerEvents="none"
>
  {/* 3x3 BOX TINTS */}
  {[0, 2, 4, 6, 8].map((boxIndex) => {
    const br = Math.floor(boxIndex / 3) * 3;
    const bc = (boxIndex % 3) * 3;

    return (
      <Rect
        key={`box-tint-${boxIndex}`}
        x={bc * CELL_SIZE}
        y={br * CELL_SIZE}
        width={CELL_SIZE * 3}
        height={CELL_SIZE * 3}
        fill="rgba(20, 56, 90, 0.085)"
      />
    );
  })}

  {/* CAGE FILLS */}
  {fills}

  {/* ðŸ”¥ DARK BLUE GRID */}

{/* Vertical lines */}
{Array.from({ length: 10 }, (_, i) => (
  <Line
    key={`v-${i}`}
    x1={i * CELL_SIZE}
    y1={0}
    x2={i * CELL_SIZE}
    y2={GRID_SIZE}
   stroke="rgba(90, 110, 140, 0.55)"
  strokeWidth={i % 3 === 0 ? 2 : 1}
  />
))}

{/* Horizontal lines */}
{Array.from({ length: 10 }, (_, i) => (
  <Line
    key={`h-${i}`}
    x1={0}
    y1={i * CELL_SIZE}
    x2={GRID_SIZE}
    y2={i * CELL_SIZE}
  stroke="rgba(90, 110, 140, 0.55)"
  strokeWidth={i % 3 === 0 ? 2 : 1}

  />
))}
</Svg>
    {/* Cells (top) */}

   <View
  pointerEvents="box-none"
  style={{
    position: "absolute",
    top: 0,
    left: 0,
    width: GRID_SIZE,
    height: GRID_SIZE,
    zIndex: 20,
    flexDirection: "column",
  }}
>
      {puzzle.map((row, r) => (
      <View key={`row-${boardInstanceKey}-${r}`} style={styles(colors).row}>
          {row.map((cell, c) => (
           <KillerCell
  key={`cell-${boardInstanceKey}-${r}-${c}`}
  cell={cell}
  row={r}
  col={c}
  isSelected={!!selected && selected[0] === r && selected[1] === c}
  isHighlighted={highlightDigit !== null && cell.value === highlightDigit}
  isContext={contextCells.some(([rr, cc]) => rr === r && cc === c)}
  isWrong={!!(cell.value && cell.value !== cell.solution && !cell.prefilled)}
  blinkCells={blinkCells}
  blinkAnim={blinkAnim}
  onPress={() => handleCellPress(r, c, cell)}
/>
          ))}
        </View>

      ))}
    </View>
 {/* TOP-LEVEL CAGE OVERLAY */}
    <Svg
      width={GRID_SIZE}
      height={GRID_SIZE}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 2,
      }}
      pointerEvents="none"
    >
      {borderLines}
      {sums}
    </Svg>
  </View>
</View>


    <View style={{ marginTop: 12, marginBottom: 10, width: "100%", alignItems: "center" }}>
    <Controls
  onUndo={undo}
  onRedo={redo}
  onHint={handleHint}
  onDelete={handleDelete}
  onRestart={() => startNewBoard()}
  onSolve={handleWin}                      
  hintsLeft={hintsLeft}
  pencilMode={isPencilMode}            
  onTogglePencil={() => setIsPencilMode((p) => !p)}
  disableUndo={history.length === 0}
  disableRedo={redoStack.length === 0}
  locked={controlsLocked}                
/>
  </View>

    <NumberPad
  onNumberPress={handleNumberPress}
  disabledNumbers={digitCounts
    .map((count, num) => (count >= 9 ? num + 1 : undefined))
    .filter((v): v is number => v !== undefined)}
/>

      

</View>
    </ScrollView>

 {showMenu && (
  <UniversalModal
    visible
    title="Choose Difficulty"
    actions={[
      {
        label: "EASY",
        onPress: () => {
          setPendingDifficulty("easy");
          setShowMenu(false);
          setConfirmVisible(true);
        },
      },
      {
        label: "MEDIUM",
        onPress: () => {
          setPendingDifficulty("medium");
          setShowMenu(false);
          setConfirmVisible(true);
        },
      },
      {
        label: "HARD",
        onPress: () => {
          setPendingDifficulty("hard");
          setShowMenu(false);
          setConfirmVisible(true);
        },
      },
      { label: "Cancel", onPress: () => setShowMenu(false) },
    ]}
  />
)}

        {/* Difficulty Confirm - like Classic */}

       {confirmVisible && (
  <UniversalModal
    visible
    title={`Start a new ${pendingDifficulty?.toUpperCase()} game?`}
    actions={[
      {
        label: "Yes, Start",
       onPress: () => {
  if (pendingDifficulty) {
    setDifficulty(pendingDifficulty);
    startNewBoard(pendingDifficulty);
  }
  setConfirmVisible(false);
  setPendingDifficulty(null);
},
      },
      { label: "Cancel", onPress: () => setConfirmVisible(false) },
    ]}
  />
)}

{/* Game Over Modal Ã¢â‚¬â€œ same style as Classic */}

  {gameOverVisible && (
  <UniversalModal
    visible
    title="Game Over"
    message={`You made ${errorCount} mistakes!`}
    actions={[
      {
        label: "Play Again",
        onPress: () => {
          setGameOverVisible(false);
          startNewBoard();
        },
      },
     {
  label: "Close",
  onPress: handleGameOverClose,
},

    ]}
  />
)}

<WinModal
  visible={winVisible}
  onRestart={(level) =>
    startNewBoard(
      level === "easy" || level === "medium" || level === "hard"
        ? level
        : difficulty
    )
  }
  onClose={async () => {
    skipNextResumeRef.current = true;
    skipNextSaveRef.current = true;

    await clearGame("killer");
    setWinVisible(false);
    router.replace("/variantHub");
  }}
  difficulty={difficulty}
  isDaily={false}
/>
        {/* Resume Game Modal - Classic-style */}
       {resumeVisible && (
  <UniversalModal
    visible
    title="Resume Game?"
    message="Would you like to continue your previous Killer puzzle?"
    actions={[
   {
  label: "YES",
  onPress: () => {
    if (resumeData) {
      setIsHydrating(true);

      setPuzzle(resumeData.puzzle);
      setCages(Array.isArray(resumeData.cages) ? resumeData.cages : []);
      setTimer(typeof resumeData.timer === "number" ? resumeData.timer : 0);
      setErrorCount(resumeData.errorCount ?? 0);
      setHintsLeft(resumeData.hintsLeft ?? 3);
     const restoredDifficulty =
  resumeData.difficulty === "easy" ||
  resumeData.difficulty === "medium" ||
  resumeData.difficulty === "hard"
    ? resumeData.difficulty
    : "easy";

setDifficulty(restoredDifficulty);
      setBadCages(new Set<string>());
      setSelected(null);
      setHighlightDigit(null);
      setContextCells([]);
      setHistory([]);
      setRedoStack([]);
      setGameWon(false);
      setHasWon(false);
      setWinVisible(false);

          setResumeVisible(false);
      setResumeData(null);
      setBoardInstanceKey((k) => k + 1);
      setIsHydrating(false);

      resumeTimer();
    } else {
      setResumeVisible(false);
      setIsHydrating(false);
    }
  },
},
     {
  label: "NO",
  onPress: async () => {
    setIsHydrating(true);
    await clearGame("killer");
    setResumeVisible(false);
    setResumeData(null);
    startNewBoard();
  },
},
    ]}
  />
)}


      </View>
);
}


const styles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    bg: { flex: 1, width: "100%", height: "100%" },
    scrollShell: { flex: 1, width: "100%" },
    scrollContent: { flexGrow: 1, width: "100%", alignItems: "center", paddingBottom: 120 },

screen: {
  flex: 1,
  width: "100%",
  backgroundColor: "#F6FBFF",
  justifyContent: "flex-start",
  alignItems: "center",
  paddingTop: 59,
  paddingBottom: 18,
},
    gameplayHeader: {
      paddingHorizontal: 28,
      paddingTop: 0,
      paddingBottom: 16,
      alignItems: "center",
    },
    modeTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      marginBottom: 9,
    },
    modeTitle: {
      fontSize: 21,
      fontWeight: "800",
      color: "#12385A",
      textAlign: "center",
    },
    statusRow: {
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
    },
    statusChip: {
      flex: 1,
      minHeight: 30,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(55, 190, 230, 0.72)",
      backgroundColor: "rgba(255,255,255,0.72)",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 5,
    },
    difficultyChip: {
      borderColor: "rgba(55, 190, 230, 0.90)",
    },
    statusChipText: {
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 0.3,
      color: "#12385A",
    },
    strikeChipText: {
      color: "#D9534F",
    },
    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "90%", marginTop: 6, marginBottom: 4 },
   timerText: {
  fontSize: 16,
  fontWeight: "700",
  color: "#12385A",   //  Classic timer gold
},


difficultyText: {
  fontSize: 16,
  fontWeight: "600",
  color: "#12385A",
},
   
   boardContainer: {
  alignSelf: "center",
  marginTop: 12,            // from Classic
  marginBottom: 6,          // creates proper spacing before controls
},

board: {
  width: GRID_SIZE,
  aspectRatio: 1,
  alignSelf: "center",
  marginTop: 2,
  marginBottom: 0,
  backgroundColor: "rgba(255,255,255,0.96)",
  borderWidth: 1.5,
  borderColor: "rgba(216,178,74,0.42)",
},

   row: {
  flexDirection: "row",
  height: CELL_SIZE,
},
cell: {
  width: CELL_SIZE,
  height: CELL_SIZE,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.cellBackground, // white like Classic
},
cellText: {
  fontSize: 20,
  fontWeight: "500",
  color: colors.enteredNumber, // blue for entered
},


    menuOverlay: { flex: 1, backgroundColor: colors.overlay, alignItems: "center", justifyContent: "center" },
    menuBox: { width: "70%", backgroundColor: colors.modalBg, borderRadius: 14, padding: 14, alignItems: "center" },
    menuTitle: { fontSize: 16, fontWeight: "800", color: colors.text, marginBottom: 6 },

 menuButton: {
  width: "100%",
  paddingVertical: 10,
  marginVertical: 6,
  borderRadius: 8,
  backgroundColor: colors.cellBackground,
  borderWidth: 2,
  borderColor: colors.border,
  alignItems: "center",
},


menuButtonText: {
  fontSize: 15,
  fontWeight: "700",
  color: colors.text,
},



    strikeTextInline: {
      textAlign: "center",
      fontSize: 16,
      fontWeight: "700",
      color: colors.wrongNumber,
      textShadowColor: "rgba(255,255,255,0.2)",
      textShadowRadius: 4,
      marginTop: 2,
      marginBottom: 6,
    },
  });

























