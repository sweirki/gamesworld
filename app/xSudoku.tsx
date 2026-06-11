import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  ImageBackground,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { writeSeasonalScore, getCurrentStreak } from "../utils/ladder/scoreEngine";
import { useRouter } from "expo-router";
import { useRevenueCat } from "../src/hooks/useRevenueCat";
import { makePuzzle } from "../utils/puzzleFactory";
import { auth } from "../firebase";
import Svg, { Line } from "react-native-svg";
import { getColors } from "./theme/index";
import { saveGame, loadGame, clearGame } from "../utils/storageUtils";
import { updateStatsOnWin } from "../lib/statsManager";
import { refreshLadderData } from "./lib/ladderBridge";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import NumberPad from "./components/NumberPad";
import Controls from "./components/Controls";
import WinModal from "./components/WinModal";
import { Ionicons } from "@expo/vector-icons";
import SudokuCell from "./components/SudokuCell";
import UniversalModal from "./components/UniversalModal";
import { awardLadderXP } from "./lib/ladderBridge";
import { calculateXpForLadder } from "../utils/ladder/scoreEngine";
import { onGameFinished } from "../src/game/onGameFinished";

const { width } = Dimensions.get("window");
const BOARD_SIZE = width - 40;
const CELL_SIZE = Math.floor(BOARD_SIZE / 9);


// ---- strikes (match classic behaviour = 4) ----
const MAX_STRIKES = 5;

// Helpers
const clone = (p: any[][]) => JSON.parse(JSON.stringify(p));
const emailName = (email?: string | null) =>
  (email || "").includes("@") ? (email || "").split("@")[0] : email || "Guest";
const isBoardTouched = (board: any[][] | null) => {
  if (!Array.isArray(board)) return false;

  for (const row of board) {
    for (const cell of row) {
      if (!cell?.prefilled && cell?.value != null) return true;
      if (Array.isArray(cell?.notes) && cell.notes.length > 0) return true;
    }
  }

  return false;
};


// === X RULE CHECK ===
// Returns true if placing `val` at [r,c] would break the X-diagonal rules
function violatesXRule(board: any[][], r: number, c: number, val: number) {
  // main diagonal
  if (r === c) {
    for (let i = 0; i < 9; i++) {
      if (i === r) continue;
      if (board[i][i]?.value === val) return true;
    }
  }
  // anti-diagonal
  if (r + c === 8) {
    for (let i = 0; i < 9; i++) {
      const j = 8 - i;
      if (i === r && j === c) continue;
      if (board[i][j]?.value === val) return true;
    }
  }
  return false;
}

export default function XSudoku() {
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
        <Text style={{ fontSize: 20, fontWeight: "800", color: "#14385F", textAlign: "center" }}>X Sudoku is Premium</Text>
        <Text style={{ marginTop: 8, fontSize: 15, color: "#6F7F91", textAlign: "center" }}>Premium access is required.</Text>
      </View>
    );
  }

  return <XSudokuGame />;
}

function XSudokuGame() {
  const skipNextResumeRef = useRef(false);
const skipNextSaveRef = useRef(false);
const colors = getColors();
const s = styles(colors);


  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const router = useRouter();

  // ---- puzzle state ----
  const [puzzle, setPuzzle] = useState<any[][]>([]);
  const [solution, setSolution] = useState<any[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [highlightDigit, setHighlightDigit] = useState<number | null>(null);
const [contextCells, setContextCells] = useState<[number, number][]>([]);
  const [history, setHistory] = useState<any[][][]>([]);
  const [redoStack, setRedoStack] = useState<any[][][]>([]);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [timer, setTimer] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- UX / overlays ----
  const [winVisible, setWinVisible] = useState(false);
const [showOnboarding, setShowOnboarding] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingDifficulty, setPendingDifficulty] = useState<"easy" | "medium" | "hard" | null>(null);

  const [resumeVisible, setResumeVisible] = useState(false);
  const [resumeData, setResumeData] = useState<any | null>(null);
const [isHydrating, setIsHydrating] = useState(true);
const [username, setUsername] = useState("Guest");


   const [hasWon, setHasWon] = useState(false);

   // ---- pencil mode ----
  const [isPencilMode, setIsPencilMode] = useState(false);

  // ---- strikes ----
  const [errorCount, setErrorCount] = useState(0);
  const gameOverShown = useRef(false);
  const [gameOverVisible, setGameOverVisible] = useState(false);

  // ---- controls lock ----
  const controlsLocked = hasWon || winVisible || gameOverVisible;

  // ---- visuals ----
  const blinkAnim = useRef(new Animated.Value(1)).current;
  const [blinkCells, setBlinkCells] = useState<[number, number][]>([]);


  // ---- identity / greeting ----
  const [displayName, setDisplayName] = useState<string>("Guest");

  const resumeTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  };

  // ---- Greeting: displayName -> AsyncStorage('username') -> email prefix ----
  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      const localName = await AsyncStorage.getItem("username");
      const name =
        user?.displayName ||
        (localName ? localName : undefined) ||
        emailName(user?.email);
      setDisplayName(name || "Guest");
    })();
  }, []);

   // ---- init / resume ----
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
        const saved = await loadGame("x");

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

        const validSolution =
          saved &&
          Array.isArray(saved.solution) &&
          saved.solution.length === 9 &&
          saved.solution.every(
            (row: any) => Array.isArray(row) && row.length === 9
          );

        const validTimer =
          saved && (saved.timer === undefined || typeof saved.timer === "number");

        const validErrorCount =
          saved &&
          (saved.errorCount === undefined ||
            typeof saved.errorCount === "number");

        const difficultyValue =
          saved?.difficulty === "easy" ||
          saved?.difficulty === "medium" ||
          saved?.difficulty === "hard"
            ? saved.difficulty
            : "easy";

        if (
          alive &&
          validPuzzle &&
          validSolution &&
          validTimer &&
          validErrorCount &&
          isBoardTouched(saved.puzzle)
        ) {
          saved.difficulty = difficultyValue;
          await saveGame("x", saved);

          setResumeData(saved);
          setResumeVisible(true);
          setIsHydrating(false);
          return;
        }

        await clearGame("x");
        if (!alive) return;
        startNewBoard("easy");
      } catch (err) {
        console.warn("Init load failed:", err);
        if (!alive) return;
        startNewBoard("easy");
      }
    })();

    return () => {
      alive = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [])
);

useEffect(() => {
  AsyncStorage.getItem("username").then((name) => {
    if (name) setUsername(name);
  });
}, []);

// â­ Phase 10 â€” X onboarding (one-time)
useEffect(() => {
  let alive = true;

  (async () => {
    try {
      const seen = await AsyncStorage.getItem("onboarded:x");
      if (!seen && alive) {
        setShowOnboarding(true);

        setTimeout(() => {
          if (!alive) return;
          setShowOnboarding(false);
          AsyncStorage.setItem("onboarded:x", "1");
        }, 3000);
      }
    } catch {}
  })();

  return () => {
    alive = false;
  };
}, []);


  // ---- start new ----
 const startNewBoard = (lvl?: "easy" | "medium" | "hard") => {
  const diff =
    lvl === "easy" || lvl === "medium" || lvl === "hard"
      ? lvl
      : difficulty;

  setIsHydrating(true);

  const { puzzle: newPuzzle, solution: newSolution } = makePuzzle("x", diff);

  setPuzzle(newPuzzle);
  setSolution(newSolution);
  setSelected(null);
  setHighlightDigit(null);
  setContextCells([]);
  setHistory([]);
  setRedoStack([]);
  setHintsLeft(3);
  setWinVisible(false);
  setHasWon(false);
  setErrorCount(0);
  setResumeVisible(false);
  setResumeData(null);

  gameOverShown.current = false;
  setGameOverVisible(false);
  setIsPencilMode(false);

  if (timerRef.current) clearInterval(timerRef.current);
  setTimer(0);

  setIsHydrating(false);
  resumeTimer();
};


// ---- history helper ----
const pushHistory = () => {
  // Store a deep clone of the current board before making a change
  setHistory((prev) => [...prev, JSON.parse(JSON.stringify(puzzle))]);
  // Clear redo stack whenever a new move is made
  setRedoStack([]);
};

  const triggerBlink = (cells: [number, number][]) => {
    setBlinkCells(cells);
    const one = Animated.sequence([
      Animated.timing(blinkAnim, { toValue: 0.2, duration: 160, useNativeDriver: true }),
      Animated.timing(blinkAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]);
    Animated.sequence([one, one, one]).start(() => setBlinkCells([]));
  };

  const handleCellPress = (r: number, c: number) => {
  if (hasWon) return;

  const cell = puzzle?.[r]?.[c];
  setSelected([r, c]);

  if (cell?.value != null) {
    setHighlightDigit(cell.value);
  }

   // context: row + col + box + X diagonals
  let ctx: [number, number][] = [];

  // row
  for (let i = 0; i < 9; i++) ctx.push([r, i]);

  // column
  for (let i = 0; i < 9; i++) ctx.push([i, c]);

  // box
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++)
    for (let cc = bc; cc < bc + 3; cc++)
      ctx.push([rr, cc]);

  // main diagonal (r === c)
  if (r === c) {
    for (let i = 0; i < 9; i++) ctx.push([i, i]);
  }

  // anti diagonal (r + c === 8)
  if (r + c === 8) {
    for (let i = 0; i < 9; i++) ctx.push([i, 8 - i]);
  }
  

  setContextCells(ctx);

  try {
    Haptics.selectionAsync();
  } catch {}
};


  // ---- pencil helpers ----
  const toggleCandidate = (r: number, c: number, num: number) => {
    const next = clone(puzzle);
    if (!Array.isArray(next[r][c].notes)) next[r][c].notes = [];
    const idx = next[r][c].notes.indexOf(num);
    if (idx === -1) next[r][c].notes.push(num);
    else next[r][c].notes.splice(idx, 1);
    setPuzzle(next);
   saveGame("x", { puzzle: next, solution, timer, hintsLeft, errorCount });

  };

  // ---- row/col/box blink on completion ----
  const checkRowColBoxCompletion = (board: any[][], r: number, c: number) => {
    const rowCells = Array.from({ length: 9 }, (_, i) => [r, i] as [number, number]);
    const colCells = Array.from({ length: 9 }, (_, i) => [i, c] as [number, number]);
    const bR = Math.floor(r / 3) * 3;
    const bC = Math.floor(c / 3) * 3;
    const boxCells = Array.from({ length: 9 }, (_, i) => [bR + Math.floor(i / 3), bC + (i % 3)] as [number, number]);

    const doneRow = rowCells.every(([rr, cc]) => board[rr][cc].value === board[rr][cc].solution);
    const doneCol = colCells.every(([rr, cc]) => board[rr][cc].value === board[rr][cc].solution);
    const doneBox = boxCells.every(([rr, cc]) => board[rr][cc].value === board[rr][cc].solution);

    if (doneRow) triggerBlink(rowCells);
    if (doneCol) triggerBlink(colCells);
    if (doneBox) triggerBlink(boxCells);
  };

  // ---- main number input with X-rule live validation ----
  const handleNumberPress = (num: number) => {
    if (!selected || hasWon) return;
    const [r, c] = selected;
    const cell = puzzle?.[r]?.[c];
    if (!cell || cell.prefilled) return;

    // Pencil mode first
    if (isPencilMode) {
      toggleCandidate(r, c, num);
      try { Haptics.selectionAsync(); } catch {}
      return;
    }

   

    // Commit value
 pushHistory();
const next = clone(puzzle);
next[r][c].value = num;
setHighlightDigit(num);
// wiping notes on commit
if (Array.isArray(next[r][c].notes)) next[r][c].notes = [];
let isWrong = false;

// wrong vs solution
if (num !== next[r][c].solution) {
  isWrong = true;
}

// X-rule violation (AFTER placement)
if (violatesXRule(next, r, c, num)) {
  isWrong = true;

  const diagCells: [number, number][] = [];
  if (r === c) for (let i = 0; i < 9; i++) diagCells.push([i, i]);
  if (r + c === 8) for (let i = 0; i < 9; i++) diagCells.push([i, 8 - i]);
  triggerBlink(diagCells);
}

const nextErrors = isWrong
  ? Math.min(errorCount + 1, MAX_STRIKES)
  : errorCount;

setPuzzle(next);
saveGame("x", {
  puzzle: next,
  solution,
  timer,
  hintsLeft,
  errorCount: nextErrors,
});

if (isWrong) {
  setErrorCount(nextErrors);
  try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch {}
} else {
  try { Haptics.selectionAsync(); } catch {}
}

    checkRowColBoxCompletion(next, r, c);
    checkCompletion(next);
  };

  const handleDelete = () => {
    if (!selected || hasWon) return;
    const [r, c] = selected;
    const cell = puzzle?.[r]?.[c];
    if (!cell || cell.prefilled) return;
    pushHistory();
    const next = clone(puzzle);
    next[r][c].value = null;
    setPuzzle(next);
   saveGame("x", { puzzle: next, solution, timer, hintsLeft, errorCount });

  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setRedoStack((rs) => [clone(puzzle), ...rs]);
    setPuzzle(prev);
    setHistory((h) => h.slice(0, -1));
  };

  const redo = () => {
    if (!redoStack.length) return;
    const [next, ...rest] = redoStack;
    setHistory((h) => [...h, clone(puzzle)]);
    setPuzzle(next);
    saveGame("x", { puzzle: next, solution, timer, hintsLeft });
    setRedoStack(rest);
  };

  const handleHint = () => {
    if (!selected || hasWon) return;
    const [r, c] = selected;
    const cell = puzzle?.[r]?.[c];
    if (!cell || cell.prefilled || cell.value !== null || hintsLeft <= 0) return;

    pushHistory();
    const next = clone(puzzle);
    next[r][c].value = next[r][c].solution;
    if (Array.isArray(next[r][c].notes)) next[r][c].notes = [];
    setPuzzle(next);
    setHintsLeft((h) => Math.max(0, h - 1));
    saveGame("x", { puzzle: next, solution, timer, hintsLeft: Math.max(0, hintsLeft - 1) });

    triggerBlink([[r, c]]);
    checkRowColBoxCompletion(next, r, c);
    checkCompletion(next);
  };

  const checkCompletion = (board: any[][]) => {
    // fully filled?
    if (board.every((row) => row.every((cell) => cell.value !== null))) {
      const allCorrect = board.every((row) => row.every((cell) => cell.value === cell.solution));
      // X rule final sweep
      let xOk = true;
      for (let i = 0; i < 9; i++) {
        const v1 = board[i][i]?.value;
        if (!v1 || board.some((r, idx) => idx !== i && r[idx]?.value === v1)) {
          xOk = false;
          break;
        }
      }
      if (xOk) {
        for (let i = 0; i < 9; i++) {
          const v2 = board[i][8 - i]?.value;
          if (!v2) { xOk = false; break; }
          for (let j = 0; j < 9; j++) {
            const jj = 8 - j;
            if (j !== i && board[j][jj]?.value === v2) { xOk = false; break; }
          }
          if (!xOk) break;
        }
      }

      if (allCorrect && xOk) handleWin();
    }
  };
const handleGameOverClose = async () => {
  // stop timer
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  // clear saved X game so resume NEVER appears
  await clearGame("x");

  // reset state
  setPuzzle([]);
  setSolution([]);
  setSelected(null);
  setErrorCount(0);
  setTimer(0);
  setHistory([]);
  setRedoStack([]);
  setHintsLeft(3);
  setHasWon(false);
  gameOverShown.current = false;
  setResumeVisible(false);
  setResumeData(null);

  // close modal
  setGameOverVisible(false);

  // go back to Variant Hub
  router.replace("/variantHub");
};

  const handleWin = async () => {
  if (hasWon) return;
  setHasWon(true);
  await clearGame("x");

  if (timerRef.current) clearInterval(timerRef.current);

  // Lock solved board
  const solved = puzzle.map((row) =>
    row.map((cell) => ({ ...cell, value: cell.solution }))
  );
  setPuzzle(solved);

  // âœ… Correct identity (same as Classic / Hyper / Killer)
  const ladderUser = auth.currentUser?.uid || "Guest";

  // âœ… Update stats
  await updateStatsOnWin("x", timer, errorCount, 3 - hintsLeft, ladderUser);


  // â­ Award LADDER XP (same formula as other boards)
  try {
    const xp = calculateXpForLadder({
      mode: "x",
      difficulty,
      time: timer,
      errors: errorCount,
    });

    await awardLadderXP(xp);
    console.log("ðŸ”¥ Ladder XP awarded (X):", xp);
  } catch (err) {
    console.warn("âŒ Failed to award ladder XP (X):", err);
  }

  // Refresh cached Ladder stats
  await refreshLadderData(ladderUser);

  // â­ Seasonal leaderboard write (corrected username)
  try {
    await writeSeasonalScore(
      ladderUser,
      ladderUser,
      Math.max(0, 999 - timer),
      timer,
      await getCurrentStreak(ladderUser),
      "x"
    );
  } catch (err) {
    console.error("âŒ Seasonal write (X) failed:", err);
  }

await onGameFinished({
  mode: "x",
  win: true,
  time: timer,
  errors: errorCount,
  hintsUsed: 0,
  difficulty: "x",
  score: Math.max(0, 999 - timer),
});


  setWinVisible(true);
};


  // autosave on unmount if not won
 useEffect(() => {
  return () => {
    if (hasWon) return;

    if (!Array.isArray(puzzle) || puzzle.length !== 9) return;
    if (!puzzle.every(row => Array.isArray(row) && row.length === 9)) return;

    // ðŸ§  do not save untouched boards
    if (!isBoardTouched(puzzle)) return;

  saveGame("x", { puzzle, solution, timer, hintsLeft, errorCount });
  };
}, [puzzle, solution, timer, hintsLeft, hasWon]);


   useEffect(() => {
    if (errorCount >= MAX_STRIKES && !gameOverShown.current) {
      gameOverShown.current = true;
      setGameOverVisible(true);
    }
  }, [errorCount]);


  // digit counts for disabling numbers (optional)
  const getDigitCounts = () => {
    const counts = Array(9).fill(0);
    puzzle.forEach((row) =>
      row.forEach((cell) => {
        if (cell?.value) counts[cell.value - 1]++;
      })
    );
    return counts;
  };
  const digitCounts = getDigitCounts();

  // ---- UI ----
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

 if (isHydrating) {
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
          color: colors.buttonSecondaryBg,
          fontWeight: "700",
          fontSize: 16,
        }}
      >
        Loading...
      </Text>
    </View>
  );
}

 return (
  <View style={{ flex: 1 }}>
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
        Both diagonals must also contain the numbers 1â€“9.
      </Text>
    </View>
  </View>
)}

    <ImageBackground
    // removed old dark background
    style={s.bg}
    resizeMode="cover"
  >
 <View style={s.screen}>
 


        <View style={s.gameplayHeader}>
          <View style={s.modeTitleRow}>
            <Ionicons name="close-outline" size={22} color={"#F5B943"} />
            <Text style={s.modeTitle}>X Sudoku</Text>
          </View>

          <View style={s.statusRow}>
            <TouchableOpacity
              activeOpacity={0.82}
              style={[s.statusChip, s.difficultyChip]}
              onPress={() => setMenuVisible(true)}
            >
              <Text style={s.statusChipText}>{difficulty.toUpperCase()}</Text>
              <Ionicons name="chevron-down" size={13} color={"#12385A"} />
            </TouchableOpacity>

            <View style={s.statusChip}>
              <Ionicons name="time-outline" size={14} color={"#12385A"} />
              <Text style={s.statusChipText}>{formatTime(timer)}</Text>
            </View>

            <View style={s.statusChip}>
              <Ionicons name="close-circle-outline" size={14} color={errorCount > 0 ? "#D9534F" : "#12385A"} />
              <Text style={[s.statusChipText, errorCount > 0 && s.strikeChipText]}>
                {Math.min(errorCount, MAX_STRIKES)}/{MAX_STRIKES}
              </Text>
            </View>
          </View>
        </View>


  {/* Board container */}
{puzzle.length === 9 && puzzle[0]?.length === 9 && (
  <View style={styles(colors).boardContainer}>
    <View style={styles(colors).board}>


  <Svg height={BOARD_SIZE} width={BOARD_SIZE} style={{ position:"absolute", top:0, left:0 }}>

  {/* X-diagonal lines */}
 <Line
  x1={0}
  y1={0}
  x2={BOARD_SIZE}
  y2={BOARD_SIZE}
  stroke={"rgba(143, 121, 255, 0.62)"}
  strokeWidth={2.2}
  strokeOpacity={0.55}
/>

<Line
  x1={BOARD_SIZE}
  y1={0}
  x2={0}
  y2={BOARD_SIZE}
  stroke={"rgba(143, 121, 255, 0.62)"}
  strokeWidth={2.2}
  strokeOpacity={0.55}
/>



{Array.from({ length: 10 }).map((_, i) => (
  <Line
    key={`v-${i}`}
    x1={i * CELL_SIZE}
    y1={0}
    x2={i * CELL_SIZE}
    y2={BOARD_SIZE}
    stroke={colors.border}
    strokeWidth={i % 3 === 0 ? 2 : 1}
  />
))}

{Array.from({ length: 10 }).map((_, i) => (
  <Line
    key={`h-${i}`}
    x1={0}
    y1={i * CELL_SIZE}
    x2={BOARD_SIZE}
    y2={i * CELL_SIZE}
    stroke={colors.border}
    strokeWidth={i % 3 === 0 ? 2 : 1}
  />
))}


</Svg>

{/* === CORRECTED HYPER-STYLE CELL CONTAINER === */}
<View
  style={{
    width: BOARD_SIZE,
    height: BOARD_SIZE,
    position: "absolute",
    top: 0,
    left: 0,
    flexDirection: "column",
  }}
>
  {Array.from({ length: 9 }).map((_, r) => (
    <View key={r} style={{ flexDirection: "row" }}>
      {Array.from({ length: 9 }).map((_, c) => (
        <SudokuCell
          key={`${r}-${c}`}
          cell={puzzle[r][c]}
          row={r}
          col={c}
          isSelected={selected && selected[0] === r && selected[1] === c}
          isHighlighted={
            highlightDigit != null &&
            puzzle[r][c] &&
            puzzle[r][c].value === highlightDigit
          }
          isContext={contextCells.some(([rr, cc]) => rr === r && cc === c)}
          isDiagonal={r === c || r + c === 8}
          isWrong={
            puzzle[r][c] &&
            puzzle[r][c].value &&
            puzzle[r][c].value !== puzzle[r][c].solution &&
            !puzzle[r][c].prefilled
          }
          hideBorders={false}
          forceClearBackground={false}
          blinkCells={blinkCells}
          blinkAnim={blinkAnim}
          onPress={() => handleCellPress(r, c)}
        />
      ))}
    </View>
  ))}
</View>

</View>
        </View>
)}


 {/* Controls (MATCH Hyper spacing) */}
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

{/* NumberPad */}
<NumberPad
  onNumberPress={handleNumberPress}
  disabledNumbers={digitCounts.map((cnt, idx) => (cnt >= 9 ? idx + 1 : null))
  .filter((n): n is number => n !== null)}
/>

</View>

</ImageBackground>

{/* Win modal */}
<WinModal
  visible={winVisible}
  onRestart={(level) => {
    const nextDifficulty =
      level === "easy" || level === "medium" || level === "hard"
        ? level
        : difficulty;

    setDifficulty(nextDifficulty);
    startNewBoard(nextDifficulty);
  }}
  onClose={() => {
    skipNextResumeRef.current = true;
    skipNextSaveRef.current = true;

    clearGame("x");
    setWinVisible(false);

    requestAnimationFrame(() => {
      router.replace("/variantHub");
    });
  }}
  difficulty={difficulty}
  isDaily={false}
/>

      {/* Resume Game Modal (like Hyper/Killer) */}
      {resumeVisible && (
      <UniversalModal
        visible={resumeVisible}
        title="Resume Game?"
        message="Would you like to continue your previous X Sudoku?"
        actions={[
          {
  label: "YES",
  onPress: () => {
    if (resumeData) {
      setIsHydrating(true);

      const restoredDifficulty =
        resumeData.difficulty === "easy" ||
        resumeData.difficulty === "medium" ||
        resumeData.difficulty === "hard"
          ? resumeData.difficulty
          : "easy";

      setDifficulty(restoredDifficulty);

      if (resumeData.puzzle) {
        setPuzzle(resumeData.puzzle);
      }
      if (resumeData.solution) {
        setSolution(resumeData.solution);
      }

      setHintsLeft(
        typeof resumeData.hintsLeft === "number"
          ? resumeData.hintsLeft
          : 3
      );
      setTimer(
        typeof resumeData.timer === "number"
          ? resumeData.timer
          : 0
      );
      setErrorCount(
        typeof resumeData.errorCount === "number"
          ? resumeData.errorCount
          : 0
      );

      setSelected(null);
      setHighlightDigit(null);
      setContextCells([]);
      setHistory([]);
      setRedoStack([]);
      setHasWon(false);
      setWinVisible(false);

      setResumeVisible(false);
      setResumeData(null);
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
    await clearGame("x");
    setResumeVisible(false);
    setResumeData(null);
    startNewBoard(difficulty);
  },
},
        ]}
      />
)}
      {/* Difficulty menu (themed, like Hyper) */}

      {menuVisible && (
     <UniversalModal
  visible={menuVisible}
  title="Choose Difficulty"
  actions={[
    {
      label: "EASY",
      onPress: () => {
        setPendingDifficulty("easy");
        setMenuVisible(false);
        setTimeout(() => setConfirmVisible(true), 120);
      },
    },
    {
      label: "MEDIUM",
      onPress: () => {
        setPendingDifficulty("medium");
        setMenuVisible(false);
        setTimeout(() => setConfirmVisible(true), 120);
      },
    },
    {
      label: "HARD",
      onPress: () => {
        setPendingDifficulty("hard");
        setMenuVisible(false);
        setTimeout(() => setConfirmVisible(true), 120);
      },
    },
    {
      label: "Cancel",
      onPress: () => setMenuVisible(false),
    },
  ]}
/>
)}

      {/* Confirm difficulty switch */}
      {confirmVisible && (
    <UniversalModal
  visible={confirmVisible}
  title={`Start a new ${pendingDifficulty?.toUpperCase()} game?`}
  actions={[
    {
      label: "Yes, Start",
     onPress: () => {
  const diff = pendingDifficulty as "easy" | "medium" | "hard";
  setDifficulty(diff);
  setConfirmVisible(false);
  setPendingDifficulty(null);
  startNewBoard(diff);   
},

    },
    {
      label: "Cancel",
      onPress: () => {
        setConfirmVisible(false);
        setPendingDifficulty(null);
      },
    },
  ]}
/>
)}

      {/* Game Over Modal */}
   {gameOverVisible && (
  <UniversalModal
    visible={gameOverVisible}
    title="Too Many Mistakes"
    message={`You reached ${MAX_STRIKES} strikes!`}
    actions={[
      {
        label: "Restart",
        onPress: () => {
          setGameOverVisible(false);
          setErrorCount(0);
          gameOverShown.current = false;
          startNewBoard(difficulty || "easy");
        },
      },
      {
        label: "Close",
        onPress: handleGameOverClose,
      },
    ]}
  />
)}

</View>
  );
}

const styles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    bg: { flex: 1, width: "100%", height: "100%", backgroundColor: "#F6FBFF" },

    // ===== Screen & Header =====
    screen: {
  flex: 1,
  backgroundColor: "transparent",
  justifyContent: "flex-start",
  alignItems: "center",
  paddingTop: 76,
  paddingBottom: 18,
},


    headerContainer: {
      alignItems: "center",
      marginTop: 30,
      marginBottom: 10,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginBottom: 4,
    },
    star: {
      fontSize: 24,
      color: "#FFD700",
      textShadowColor: "#D8B24A",
      textShadowRadius: 6,
    },
    gameTitle: {
      fontSize: 24,
      fontWeight: "800",
      color: "#FBE7A1",
      textShadowColor: "#D8B24A",
      textShadowRadius: 8,
    },
  infoRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingTop: 4,
  paddingBottom: 4,
  width: "100%",
},

/* CLASSIC HEADER BLOCK */
headerRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  width: "90%",
  marginTop: 6,
  marginBottom: 4,
},

timerTextGold: {
  fontSize: 16,
  fontWeight: "700",
  color: "#12385A", // Classic/Hyper shell
},

difficultyTextGold: {
  fontSize: 16,
  fontWeight: "600",
  color: "#12385A", // same as Classic/Hyper
},




   difficultyButton: {
  backgroundColor: "#1E90FF",
  paddingHorizontal: 12,
  paddingVertical: 5,
  borderRadius: 6,
  transform: [{ scale: 0.85 }],   // larger button
  shadowColor: "#00BFFF",
  shadowOpacity: 0.4,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 2 },
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



    // ===== Board & Cells =====

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

   boardWrap: {
  alignItems: "center",
  marginTop: 12,
  marginBottom: 12,
},

boardContainer: {
  alignSelf: "center",
  marginTop: 0,
  marginBottom: 6,
},

board: {
  width: BOARD_SIZE,
  aspectRatio: 1,
  alignSelf: "center",
  marginTop: 2,
  marginBottom: 0,
},



   cell: {
  width: CELL_SIZE,
  height: CELL_SIZE,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.cellBackground,

},

  cellText: {
  fontSize: 20,
  fontWeight: "500",
  color: colors.number,
},

    // ===== Menus / Modals =====
    menuOverlay: {
      flex: 1,
      backgroundColor: "colors.shadowDark",
      alignItems: "center",
      justifyContent: "center",
    },
    menuBox: {
      width: "75%",
      backgroundColor: colors.modalBg,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
    },
    menuTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.modalTitle,
      marginBottom: 10,
    },
    menuButton: {
      width: "100%",
      paddingVertical: 10,
      marginVertical: 5,
      borderRadius: 8,
      backgroundColor: colors.cellBackground,
      borderWidth: 2,
      borderColor: colors.gold,
      alignItems: "center",
     
    },

   menuButtonText: {
  color: colors.gold,
  fontSize: 15,
  fontWeight: "800",
},


    // ===== (Legacy header styles you can delete if unused) =====
    // Keeping these names only if other places still reference them.
    title: {
      fontSize: 24,
      fontWeight: "800",
      color: colors.gold,
      textShadowColor: colors.enteredNumber,
      textShadowRadius: 8,
      marginBottom: 8,
    },
    smallGold: {
      color: "#FFD700",
      fontWeight: "700",
      fontSize: 16,
      textShadowColor: "colors.text",
      textShadowRadius: 4,
    },
  });







