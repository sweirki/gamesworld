import React, { useEffect, useState, useRef } from "react";
import Svg, { Rect, Line } from "react-native-svg";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Modal,
  ImageBackground, // Ã…Â½Ã‚Â¨ THEME: added for background image
} from "react-native";
import { getColors } from "./theme/index";
import { writeSeasonalScore } from "../utils/ladder/scoreEngine";
import { getCurrentStreak } from "../utils/ladder/scoreEngine";
import { calculateXpForLadder, getLadderRank } from "../utils/ladder/scoreEngine";
import { refreshLadderData } from "./lib/ladderBridge";
import { recordGameStart, updateStatsOnWin } from "../lib/statsManager";
import { auth } from "../firebase";
import { makePuzzle } from "../utils/puzzleFactory";
import { saveWin } from "../src/lib/saveWin";
import { saveGame, loadGame, clearGame } from "../utils/storageUtils";
import NumberPad from "./components/NumberPad";
import Controls from "./components/Controls";
import WinModal from "./components/WinModal";
import UniversalModal from "./components/UniversalModal";
import SudokuCell from "./components/SudokuCell";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { strokeBase } from "./theme/boardTheme";
import { onGameFinished } from "../src/game/onGameFinished";


const typedStrokeBase = strokeBase as unknown as {
  stroke: string;
  strokeWidthBold: number;
  strokeWidthThin: number;
};


const {
  stroke,
  strokeWidthBold,
  strokeWidthThin,
} = typedStrokeBase;


const { width } = Dimensions.get("window");
const CELL_SIZE = Math.floor((width - 40) / 9);
const GRID_SIZE = CELL_SIZE * 9;




export default function HyperSudoku() {
  const skipNextResumeRef = useRef(false);
const skipNextSaveRef = useRef(false);
const colors = getColors();



  const router = useRouter();
  const s = styles(colors);
  const [puzzle, setPuzzle] = useState<any[][]>([]);
 const emptyGrid = Array.from({ length: 9 }, () => []);
const getRegion = (row: number, col: number) => {
  return Math.floor(row / 3) * 3 + Math.floor(col / 3);
};

  const [solution, setSolution] = useState<any[][]>([]);
  const [selected, setSelected] = useState<[number, number] | null>(null);
  const [history, setHistory] = useState<any[][][]>([]);
  const [redoStack, setRedoStack] = useState<any[][][]>([]);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [hasWon, setHasWon] = useState(false);
  const [winVisible, setWinVisible] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [Timer, setTimer] = useState(0);
 const [highlightDigit, setHighlightDigit] = useState<number | null>(null);
const [contextCells, setContextCells] = useState<[number, number][]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [difficultyVisible, setDifficultyVisible] = useState(false);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
const [username, setUsername] = useState("Guest");
  const [pendingDifficulty, setPendingDifficulty] =
    useState<"easy" | "medium" | "hard" | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
const [isPencilMode, setIsPencilMode] = useState(false);
  const [resumeVisible, setResumeVisible] = useState(false);
  const [resumeData, setResumeData] = useState<any | null>(null);
const [isHydrating, setIsHydrating] = useState(true);
  const [gameOverVisible, setGameOverVisible] = useState(false);
const [hintPopup, setHintPopup] = useState(false);

useEffect(() => {
  AsyncStorage.getItem("username").then((name) => {
    if (name) setUsername(name);
  });
}, []);

// â­ Phase 10 â€” Hyper onboarding (one-time)
useEffect(() => {
  let alive = true;

  (async () => {
    try {
      const seen = await AsyncStorage.getItem("onboarded:hyper");
      if (!seen && alive) {
        setShowOnboarding(true);

        setTimeout(() => {
          if (!alive) return;
          setShowOnboarding(false);
          AsyncStorage.setItem("onboarded:hyper", "1");
        }, 3000);
      }
    } catch {}
  })();

  return () => {
    alive = false;
  };
}, []);


  const BOARD_SIZE = width - 40;
  // Ã°Å¸Å¸Â¥ Strike system (max 5 mistakes)
const [errorCount, setErrorCount] = useState(0);
const MAX_STRIKES = 5;
const gameOverShown = useRef(false);
  useEffect(() => {
    if (errorCount >= MAX_STRIKES && !gameOverShown.current) {
      gameOverShown.current = true;
    gameOverTimeoutRef.current = setTimeout(() => {
  setGameOverVisible(true);
}, 200);
    }
  }, [errorCount]);

 const TimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
const gameOverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track whether this Hyper game has already been counted
const hasStartedRef = useRef(false);
const changingDiffRef = useRef(false);
const initializingRef = useRef(true);

  const resumeTimer = () => {
    if (TimerRef.current) clearInterval(TimerRef.current);
    TimerRef.current = setInterval(() => setTimer((t) => t + 1), 1000);
  };

  const blinkAnim = useRef(new Animated.Value(1)).current;
  const [blinkCells, setBlinkCells] = useState<[number, number][]>([]);

  const triggerBlink = (cells: [number, number][]) => {
    setBlinkCells(cells);
    const blinkOnce = Animated.sequence([
      Animated.timing(blinkAnim, { toValue: 0.2, duration: 180, useNativeDriver: true }),
      Animated.timing(blinkAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]);
    Animated.sequence([blinkOnce, blinkOnce, blinkOnce]).start(() => setBlinkCells([]));
  };

  const clone = (p: any[][]) => JSON.parse(JSON.stringify(p));
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
        const saved = await loadGame("hyper");
        const savedTimer = (saved as { timer?: unknown })?.timer;

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
                  "prefilled" in cell &&
                  "solution" in cell &&
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
          saved && (savedTimer === undefined || typeof savedTimer === "number");

        const validErrorCount =
          saved &&
          (saved.errorCount === undefined ||
            typeof saved.errorCount === "number");

        if (
          alive &&
          validPuzzle &&
          validSolution &&
          validTimer &&
          validErrorCount &&
          isBoardTouched(saved.puzzle)
        ) {
          setResumeData(saved);
          setResumeVisible(true);
          setIsHydrating(false);
          return;
        }

        await clearGame("hyper");
        if (!alive) return;
        startNewBoard();
      } catch (err) {
        console.warn("Init load failed:", err);
        if (!alive) return;
        startNewBoard();
      }
    })();

    return () => {
      alive = false;

      if (TimerRef.current) {
        clearInterval(TimerRef.current);
        TimerRef.current = null;
      }

      if (gameOverTimeoutRef.current) {
        clearTimeout(gameOverTimeoutRef.current);
        gameOverTimeoutRef.current = null;
      }
    };
  }, [])
);

const startNewBoard = (forcedDifficulty?: "easy" | "medium" | "hard") => {
  const nextDifficulty = forcedDifficulty ?? difficulty;
  setIsHydrating(true);

  if (!hasStartedRef.current) {
    hasStartedRef.current = true;
    const uid = auth?.currentUser?.email ?? "Guest";
    recordGameStart(uid).catch(() => {});
  }

  const { puzzle: rawPuzzle, solution: newSolution } = makePuzzle("hyper", nextDifficulty);

  const fixedPuzzle = Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => {
      const cell = rawPuzzle?.[r]?.[c];
      if (cell) {
        return {
          value: cell.value ?? null,
          prefilled: cell.prefilled ?? false,
          solution: cell.solution ?? null,
          notes: Array.isArray(cell.notes) ? cell.notes : [],
        };
      }
      return {
        value: null,
        prefilled: false,
        solution: null,
        notes: [],
      };
    })
  );

  setPuzzle(fixedPuzzle);
  setSolution(newSolution);
  setSelected(null);
  setHighlightDigit(null);
  setContextCells([]);
  setHistory([]);
  setRedoStack([]);
  setHintsLeft(3);
  setHasWon(false);
  setGameWon(false);
  setWinVisible(false);
  setErrorCount(0);
  setGameOverVisible(false);
  gameOverShown.current = false;
  setResumeVisible(false);
  setResumeData(null);

  setTimer(0);
  if (TimerRef.current) {
    clearInterval(TimerRef.current);
    TimerRef.current = null;
  }

  initializingRef.current = false;
  setIsHydrating(false);
  resumeTimer();
};

  const pushHistory = () => {
    setHistory((h) => [...h, clone(puzzle)]);
    setRedoStack([]);
  };

const handleCellPress = (r: number, c: number) => {
  if (gameWon) return;
  const cell = puzzle?.[r]?.[c];
  setSelected([r, c]);

  if (cell?.value != null) {
    setHighlightDigit(cell.value);
  }

  // context: same row, column, box

  let ctx: [number, number][] = [];

  for (let i = 0; i < 9; i++) ctx.push([r, i]); // row
  for (let i = 0; i < 9; i++) ctx.push([i, c]); // col

  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let rr = br; rr < br + 3; rr++)
    for (let cc = bc; cc < bc + 3; cc++)
      ctx.push([rr, cc]);

  setContextCells(ctx);

  try { Haptics.selectionAsync(); } catch {}
};

const toggleCandidate = (r: number, c: number, num: number) => {
  const next = JSON.parse(JSON.stringify(puzzle));
  if (!Array.isArray(next[r][c].notes)) next[r][c].notes = [];
  const idx = next[r][c].notes.indexOf(num);
  if (idx === -1) next[r][c].notes.push(num);
  else next[r][c].notes.splice(idx, 1);
  setPuzzle(next);
};

  const handleNumberPress = async (num: number) => {
    if (!selected || gameWon) return;
    const [r, c] = selected;
    const cell = puzzle[r][c];
    if (cell.prefilled) return;
    // Ã¢Å“ÂÃ¯Â¸Â Pencil first Ã¢â‚¬â€ if on, toggle notes and stop
if (isPencilMode) {
  toggleCandidate(r, c, num);
  try { Haptics.selectionAsync(); } catch {}
  return; // do NOT place a big number
}

pushHistory();
const next = clone(puzzle);

    next[r][c].value = num;
    setHighlightDigit(num);

    // erase small pencil notes when you write a real number

    if (Array.isArray(next[r][c].notes)) next[r][c].notes = [];

    const nextErrors =
  num !== next[r][c].solution
    ? Math.min(errorCount + 1, MAX_STRIKES)
    : errorCount;

setPuzzle(next);
saveGame("hyper", {
  puzzle: next,
  solution,
  timer: Timer,
  errorCount: nextErrors,
});

if (num !== next[r][c].solution) {
  setErrorCount(nextErrors);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
} else {
  Haptics.selectionAsync();
}

checkRowColBoxCompletion(next, r, c);
checkCompletion(next);


  };

  const checkRowColBoxCompletion = (board: any[][], r: number, c: number) => {
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

  const handleDelete = () => {
    if (!selected || gameWon) return;
    const [r, c] = selected;
    if (puzzle[r][c].prefilled) return;
    pushHistory();
    const next = clone(puzzle);
    next[r][c].value = null;
    setHighlightDigit(null);
    setPuzzle(next);
  };

  const undo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack((rs) => [clone(puzzle), ...rs]);
    setPuzzle(prev);
    setHistory((h) => h.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const [next, ...rest] = redoStack;
    setHistory((h) => [...h, clone(puzzle)]);
    setPuzzle(next);
    setRedoStack(rest);
  };

  // HINT: fill ONLY the selected cell with its solution
// Ã¢â‚¬â„¢Ã‚Â¡ Fill only the selected cell with its correct number
const handleHint = async () => {
 if (!selected) {
  setHintPopup(true);
  return;
}


  const [r, c] = selected;
  const cell = puzzle[r][c];
 if (cell.prefilled || hintsLeft <= 0) return;

  // deep-clone puzzle safely
  const updated = puzzle.map((row) => row.map((x) => ({ ...x })));
  updated[r][c].value = updated[r][c].solution;

  setPuzzle(updated);
  setHintsLeft((prev) => Math.max(0, prev - 1));

  triggerBlink([[r, c]]);
  checkRowColBoxCompletion(updated, r, c);
  checkCompletion(updated);
  
  console.log("Ã¢â‚¬â„¢Ã‚Â¡ [Hint] Filled cell", r, c, "with", updated[r][c].solution);
};

const handleErase = () => {
  if (!selected || gameWon) return;
  const [r, c] = selected;

  // Prevent erasing prefilled cells
  if (puzzle[r][c].prefilled) return;

  pushHistory();

  const next = puzzle.map((row) =>
    row.map((cell) => ({ ...cell }))
  );

  next[r][c].value = null;
  next[r][c].notes = [];

  setPuzzle(next);
};


  const validateHyper = (board: any[][]) => {

    const hyperStarts = [
      [1, 1],
      [1, 5],
      [5, 1],
      [5, 5],
    ];
    for (const [sr, sc] of hyperStarts) {
      const seen = new Set();
      for (let r = sr; r < sr + 3; r++) {
        for (let c = sc; c < sc + 3; c++) {
          const v = board[r][c].value;
          if (!v || seen.has(v)) return false;
          seen.add(v);
        }
      }
    }
    return true;
  };

  const checkCompletion = (board: any[][]) => {
    if (board.every((r) => r.every((c) => c.value !== null))) {
      const allCorrect = board.every((r) => r.every((c) => c.value === c.solution));
      if (allCorrect && validateHyper(board)) handleWin();
    }
  };
const handleGameOverClose = async () => {
  // stop timer
  if (TimerRef.current) {
    clearInterval(TimerRef.current);
    TimerRef.current = null;
  }

  // clear saved hyper game
  await clearGame("hyper");

  // reset state
  setPuzzle([]);
  setSolution([]);
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

  // go back to VariantHub
  router.replace("/variantHub");
};
  const handleWin = async () => {
    if (gameWon) return;

    setHasWon(true);
    clearGame("hyper");
    setGameWon(true);
     const ladderUser = auth.currentUser?.uid || "Guest";

   await updateStatsOnWin("hyper", Timer, errorCount, 3 - hintsLeft, ladderUser);
   await refreshLadderData(ladderUser);


     console.log("âš” [ Hyper Sudoku] Win saved for user:", "Guest", {
    Timer,
    hintsUsed: 3 - hintsLeft,
  });

  

// â­ LADDER XP for Hyper
try {
  const xp = calculateXpForLadder({
    mode: "hyper",
    difficulty,
    time: Timer,
    errors: errorCount,
  });


  console.log("ðŸ”¥ Ladder XP awarded (Hyper):", xp);
} catch (err) {
  console.warn("âŒ Failed to award ladder XP (Hyper):", err);
}

  // â­ Seasonal leaderboard write for Hyper
  try {
    await writeSeasonalScore(
      username || "Guest",                 // uid substitute
      username || "Guest",                 // username
      Math.max(0, 999 - Timer),           // simple Hyper score: faster = higher
      Timer,                               // time
      await getCurrentStreak(username || "Guest"),
      "hyper"                              // mode id
    );
  } catch (err) {
    console.error("âŒ Seasonal write (Hyper) failed:", err);
  }

  if (TimerRef.current) clearInterval(TimerRef.current);

const solved = puzzle.map((row) =>
  row.map((cell) => ({ ...cell, value: cell.solution }))
);

setPuzzle(solved);

// âœ… HISTORY (UNIFIED PATTERN)
await onGameFinished({
  mode: "hyper",
  win: true,
  time: Timer,
  errors: errorCount,
  hintsUsed: 0,
  difficulty: "hyper",
  score: Math.max(0, 999 - Timer),
});


setWinVisible(true);
saveWin(username, "hyper", Timer, errorCount);
};


  const getDigitCounts = () => {
    const counts = Array(9).fill(0);
    puzzle.forEach((row) => row.forEach((cell) => cell.value && counts[cell.value - 1]++));
    return counts;
  };

  const digitCounts = getDigitCounts();
useEffect(() => {
  if (hasWon) return;
  if (!Array.isArray(puzzle) || puzzle.length !== 9) return;
  if (!puzzle.every(row => Array.isArray(row) && row.length === 9)) return;

  // ðŸ§  do not save untouched boards
  if (!isBoardTouched(puzzle)) return;

 saveGame("hyper", { puzzle, solution, timer: Timer, errorCount });

}, [puzzle, solution, Timer, hasWon]);


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

  // THEME: wrapped root in ImageBackground
return (
  <ImageBackground
    // removed old dark background
    style={styles(colors).bg}
    resizeMode="cover"
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
        The shaded regions follow the same rules as regular boxes.
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
        color={colors.buttonSecondaryBg}
      />
      <Text style={styles(colors).modeTitle}>Hyper Sudoku</Text>
    </View>

    <View style={styles(colors).statusRow}>
      <TouchableOpacity
        activeOpacity={0.82}
        style={[styles(colors).statusChip, styles(colors).difficultyChip]}
        onPress={() => setMenuVisible(true)}
      >
        <Text style={styles(colors).statusChipText}>{difficulty.toUpperCase()}</Text>
        <Ionicons name="chevron-down" size={13} color={"#12385A"} />
      </TouchableOpacity>

      <View style={styles(colors).statusChip}>
        <Ionicons name="time-outline" size={14} color={"#12385A"} />
        <Text style={styles(colors).statusChipText}>
          {Math.floor(Timer / 60)}:{String(Timer % 60).padStart(2, "0")}
        </Text>
      </View>

      <View style={styles(colors).statusChip}>
        <Ionicons
          name="close-circle-outline"
          size={14}
          color={errorCount > 0 ? "#D9534F" : "#12385A"}
        />
        <Text style={[styles(colors).statusChipText, errorCount > 0 && styles(colors).strikeChipText]}>
          {errorCount}/{MAX_STRIKES}
        </Text>
      </View>
    </View>
  </View>

      <UniversalModal
  visible={menuVisible}
  title="Choose Difficulty"
  actions={[
    { label: "EASY", onPress: () => { setPendingDifficulty("easy"); setMenuVisible(false); setTimeout(() => setConfirmVisible(true), 120); } },
    { label: "MEDIUM", onPress: () => { setPendingDifficulty("medium"); setMenuVisible(false); setTimeout(() => setConfirmVisible(true), 120); } },
    { label: "HARD", onPress: () => { setPendingDifficulty("hard"); setMenuVisible(false); setTimeout(() => setConfirmVisible(true), 120); } },
    { label: "Cancel", onPress: () => setMenuVisible(false) },
  ]}
/>

  <UniversalModal
  visible={confirmVisible}
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

    { label: "Cancel", onPress: () => {
      setConfirmVisible(false);
      setPendingDifficulty(null);
    }},
  ]}
/>
<Modal transparent visible={hintPopup} animationType="fade">
  <View style={styles(colors).menuOverlay}>
    <View style={styles(colors).menuBox}>
      <Text style={styles(colors).menuTitle}>Hint</Text>

      <Text
        style={{
          textAlign: "center",
          marginBottom: 16,
          color: colors.number,
          fontSize: 15,
          fontWeight: "600",
        }}
      >
        Select a cell first to use a hint.
      </Text>

      <TouchableOpacity
        style={styles(colors).menuButton}
        onPress={() => setHintPopup(false)}
      >
        <Text style={styles(colors).menuButtonText}>OK</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>



        {/* Board with Frosted Container */}
        <View style={styles(colors).boardContainer}>
          <View style={styles(colors).board}>
     {/* --- A+++++ CELLS (match Killer usage) --- */}
<View
  pointerEvents="box-none"
  style={{
    width: GRID_SIZE,
    height: GRID_SIZE,
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 20,
    flexDirection: "column",
  }}
>

  {puzzle.length === 9 &&
    puzzle.map((rowArr, r) => (
      <View key={r} style={styles(colors).row}>
        {Array.isArray(rowArr) &&
          rowArr.map((cell, c) => {
            const isSelected =
              selected && selected[0] === r && selected[1] === c;

            const isContext = contextCells.some(
              ([rr, cc]) => rr === r && cc === c
            );

            const isHighlighted =
              highlightDigit != null &&
              cell &&
              cell.value === highlightDigit;

            const isWrong =
              cell &&
              cell.value &&
              cell.value !== cell.solution &&
              !cell.prefilled;

              const isRegion =
  ((r >= 1 && r <= 3) && (c >= 1 && c <= 3)) ||   // top-left
  ((r >= 1 && r <= 3) && (c >= 5 && c <= 7)) ||   // top-right
  ((r >= 5 && r <= 7) && (c >= 1 && c <= 3)) ||   // bottom-left
  ((r >= 5 && r <= 7) && (c >= 5 && c <= 7));     // bottom-right

            return (
           <SudokuCell
  key={`${r}-${c}`}
  cell={cell}
  row={r}
  col={c}
  hideBorders={false}
  forceClearBackground={false}
  isSelected={selected && selected[0] === r && selected[1] === c}
  isHighlighted={!!isHighlighted}
  isContext={!!isContext}
  isWrong={!!isWrong}
  blinkCells={blinkCells}
  blinkAnim={blinkAnim}
  onPress={() => handleCellPress(r, c)}
  isHyper={true}
  region={getRegion(r, c)}
  notesGridStyle={styles(colors).notesGrid}   // NEW
  noteTextStyle={styles(colors).noteText}     // NEW
 isRegion={isRegion}   // NOW VALID because we defined it above
/>

            );
          })}
      </View>
    ))}
</View>

{/* --- PREMIUM GRID (MATCHES KILLER) --- */}
<Svg
  height={GRID_SIZE}
  width={GRID_SIZE}
  style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
  pointerEvents="none"
>
  {/* Vertical lines */}
  {Array.from({ length: 10 }, (_, i) => (
    <Line
      key={`v-${i}`}
      x1={i * CELL_SIZE}
      y1={0}
      x2={i * CELL_SIZE}
      y2={GRID_SIZE}
     stroke={stroke}
strokeWidth={i % 3 === 0 ? strokeWidthBold : strokeWidthThin}
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
     stroke={stroke}
strokeWidth={i % 3 === 0 ? strokeWidthBold : strokeWidthThin}
    />
  ))}
</Svg>


{/* --- A+++++ PREMIUM HYPER REGIONS (SOFT GOLD DOTS) --- */}

<Svg
  height={GRID_SIZE}
  width={GRID_SIZE}
  style={{ position: "absolute", top: 0, left: 0, zIndex: 2 }}
  pointerEvents="none"
>
  {[
    [1, 1],
    [1, 5],
    [5, 1],
    [5, 5],
  ].map(([sr, sc], i) => (

 <Rect
  key={i}
  x={sc * CELL_SIZE}
  y={sr * CELL_SIZE}
  width={CELL_SIZE * 3}
  height={CELL_SIZE * 3}
  fill={colors.hyperZoneFill}
  stroke={colors.hyperZoneBorder}

/>


  ))}
</Svg>

          </View>
        </View>

        <Controls
  onUndo={undo}
  onRedo={redo}
  onHint={handleHint}
  onDelete={handleDelete}
  onRestart={() => startNewBoard()}
  onSolve={handleWin}
  disableUndo={history.length === 0}
  disableRedo={redoStack.length === 0}
  hintsLeft={hintsLeft}
  pencilMode={isPencilMode}
  onTogglePencil={() => setIsPencilMode((p) => !p)}
  locked={gameWon || winVisible}
/>


 <NumberPad
  onNumberPress={handleNumberPress}
  onErase={handleErase}
  onHint={handleHint}
  isPencilMode={isPencilMode}
  onTogglePencil={() => setIsPencilMode((prev) => !prev)}
  disabledNumbers={digitCounts
    .map((cnt, idx) => (cnt >= 9 ? idx + 1 : null))
    .filter(Boolean)}
/>



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

    clearGame("hyper");
    setWinVisible(false);

    requestAnimationFrame(() => {
      router.replace("/variantHub");
    });
  }}
  difficulty={difficulty}
  isDaily={false}
/>

        {/* Resume Game Modal (like Killer) */}
        <UniversalModal
          visible={resumeVisible}
          title="Resume Game?"
          message="Would you like to continue your previous Hyper puzzle?"
          actions={[
                      {
              label: "YES",
              onPress: () => {
                if (resumeData) {
                  setIsHydrating(true);

                  setPuzzle(resumeData.puzzle);
                  if (resumeData.solution) {
                    setSolution(resumeData.solution);
                  }

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

                  setHintsLeft(
                    typeof resumeData.hintsLeft === "number"
                      ? resumeData.hintsLeft
                      : 3
                  );

                  const restoredDifficulty =
                    resumeData.difficulty === "easy" ||
                    resumeData.difficulty === "medium" ||
                    resumeData.difficulty === "hard"
                      ? resumeData.difficulty
                      : "easy";

                  setDifficulty(restoredDifficulty);
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
                await clearGame("hyper");
                setResumeVisible(false);
                setResumeData(null);
                startNewBoard();
              },
            },
          ]}
        />



      <UniversalModal
  visible={gameOverVisible}
  title="Too Many Mistakes"
  message={`You reached ${MAX_STRIKES} strikes!`}
  actions={[
    {
      label: "Restart",
      onPress: () => {
        setErrorCount(0);
        gameOverShown.current = false;
        setGameOverVisible(false);
        startNewBoard(difficulty);
      },
    },
  {
      label: "Close",
      onPress: handleGameOverClose,
    },
  ]}
/>


      </View>
    </ImageBackground>
  );
}

const styles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    bg: { flex: 1, width: "100%", height: "100%" },

 screen: {
  flex: 1,
  backgroundColor: "transparent",
  justifyContent: "flex-start",
  alignItems: "center",
  paddingTop: 76,
  paddingBottom: 18,
},


    title: {
      fontSize: 20,
      fontWeight: "800",
      color: "#12385A",
      fontFamily: "Rajdhani-Bold",
      textShadowColor: colors.enteredNumber,
      textShadowRadius: 8,
      marginBottom: 2,
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

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "90%",
     marginTop: 6,
marginBottom: 4,

    },
  TimerText: {
  color: "#12385A",
  fontSize: 16,
  fontWeight: "700",
},

 difficultyText: {
  fontSize: 16,
  fontWeight: "600",
  color: "#12385A",
},


boardContainer: {
  alignSelf: "center",
  marginTop: 6,
  marginBottom: 6,
},



board: {
  width: GRID_SIZE,
  aspectRatio: 1,
  alignSelf: "center",
  marginTop: 2,
  marginBottom: 0,
},


    row: { flexDirection: "row" },

    cell: {
  width: CELL_SIZE,
  height: CELL_SIZE,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: colors.cellBackground,
  borderWidth: 0.5,
  borderColor: colors.border,
},

   cellText: {
  fontSize: 20,
  fontWeight: "600",
  color: colors.number,
},
notesGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  width: CELL_SIZE,
  height: CELL_SIZE,
  padding: 2,
},

noteText: {
  width: CELL_SIZE / 3,
  height: CELL_SIZE / 3,
  textAlign: "center",
  textAlignVertical: "center",
  fontSize: 10,
  color: colors.number,
  opacity: 0.8,
},


    menuOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
    },
   menuBox: {
  width: "70%",                   // smaller overall width
  backgroundColor: colors.card,
  borderRadius: 14,               // slightly tighter corners
  padding: 14,                    // reduced inner padding
  alignItems: "center",
},
menuTitle: {
  fontSize: 18,                   // smaller title
  fontWeight: "700",
    color: "#12385A",
  fontFamily: "Rajdhani-Bold",
  textShadowColor: colors.enteredNumber,
  textShadowRadius: 6,
  marginBottom: 14,               // less spacing below title
},
menuButton: {
  width: "100%",
  paddingVertical: 10,
  marginVertical: 6,
  borderRadius: 8,
  backgroundColor: colors.cellBackground,
  borderWidth: 2,
  borderColor: colors.buttonSecondaryBg,
  alignItems: "center",
  shadowColor: colors.buttonSecondaryBg,
  shadowOpacity: 0.35,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 2 },
},

menuButtonText: {
  fontSize: 15,
  fontWeight: "700",
  color: "#12385A",
},

strikeTextInline: {
  textAlign: "center",
  fontSize: 16,
  fontWeight: "700",
  color: colors.wrongNumber,                 // bright red like Classic
  textShadowColor: "rgba(255,255,255,0.2)",
  textShadowRadius: 4,
  marginTop: 2,
marginBottom: 6,

},

  });









