import React, { useState, useEffect, useRef } from "react";
import { calculateScore } from "../ladder";
import * as Haptics from "expo-haptics";
import { generateKillerCages } from "../utils/sudokuGen";
import { auth } from "../firebase"; // check if logged in
import AsyncStorage from "@react-native-async-storage/async-storage";
import { onGameFinished } from "../src/game/onGameFinished";

import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  Animated,
  ImageBackground,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { saveGame, loadGame, clearGame } from "../utils/storageUtils";
import { useLocalSearchParams } from "expo-router";
import { Alert } from "react-native";
import { getCurrentStreak } from "../utils/ladder/scoreEngine"; // Ã¢Å“â€¦ NEW
import { db } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { saveWin } from "../src/lib/saveWin";

import { Ionicons } from "@expo/vector-icons";
import SudokuCell from './components/SudokuCell';
import WinModal from "./components/WinModal";
import Controls from "./components/Controls";
import NumberPad from "./components/NumberPad";
import UniversalModal from "./components/UniversalModal";  // â­ ADD THIS
import RankUpPopup from "./components/RankUpPopup";   // this goes at the top with imports
import { generateSudoku, validateCages } from "../utils/sudokuGen";
import { getColors } from "./theme/index";
import { sweirkiTheme } from "./theme/sweirkiTheme";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback } from "react";
import { calculateXpForLadder } from "../utils/ladder/scoreEngine";
import { refreshLadderData } from "./lib/ladderBridge";



const SCREEN = Dimensions.get("window");
const width = SCREEN.width;                   
const BOARD_SIZE = Math.floor(width - 40);
const CELL_SIZE = Math.floor(BOARD_SIZE / 9);
interface SudokuProps {
  onWin?: (result: {
    difficulty: string;
    time: number;
    hints: number;
    undos: number;
    score: number;
    user: string;
  }) => void;
  isDaily?: boolean;
  onDailyWin?: (result: any) => void;
    onDailyLose?: () => void;

  initialPuzzle?: any;
}

export default function SudokuScreen(
  {
    onWin,
    isDaily: isDailyProp = false,
    onDailyWin,
    onDailyLose,
    initialPuzzle,
  }: SudokuProps
)

{
const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isDaily = mode === "daily" || isDailyProp;



   // THEME MUST BE SYNC
const colors = getColors();


  const s = styles(colors); // dynamic stylesheet
  const router = useRouter();
   const [winVisible, setWinVisible] = useState(false);
   const [showOnboarding, setShowOnboarding] = useState(false);
 // ---------- State ----------
const [puzzle, setPuzzle] = useState<any | null>(initialPuzzle ?? null);

useEffect(() => {
  if (!isDaily) return;
  if (!initialPuzzle) return;

  setPuzzle((prev: any) => prev ?? initialPuzzle);
  setIsHydrating(false);
}, [isDaily, initialPuzzle]);

  const [score, setScore] = useState<number | null>(null);
 const [initialSnapshot, setInitialSnapshot] = useState<any | null>(
  puzzle ? JSON.parse(JSON.stringify(puzzle)) : null
);

  const [selected, setSelected] = useState<[number, number] | null>(null);
 const [resumeVisible, setResumeVisible] = useState(false);
const [resumeData, setResumeData] = useState<any | null>(null);
const [invalidGridVisible, setInvalidGridVisible] = useState(false);
const [isHydrating, setIsHydrating] = useState(true);
  const { level } = useLocalSearchParams<{ level?: string }>();
  // Initialize puzzle AFTER level is known

  useEffect(() => {
  if (!puzzle && !isDaily) {
    const diff =
      level === "easy" || level === "medium" || level === "hard"
        ? level
        : "easy";

    setPuzzle(generateSudoku(diff));
    setIsHydrating(false);
  }
}, [level, isDaily, puzzle]);

  const [history, setHistory] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);
  const [username, setUsername] = useState("Guest");
  // Ã¢Å“â€¦ Killer Sudoku support
const [cages, setCages] = useState<any[]>([]);

  useEffect(() => {
    AsyncStorage.getItem("username").then((name) => {
      if (name) setUsername(name);
    });
  }, []);
// â­ Phase 10 â€” Classic onboarding (one-time)
useEffect(() => {
  let alive = true;

  (async () => {
    try {
      const seen = await AsyncStorage.getItem("onboarded:classic");
      if (!seen && alive) {
        setShowOnboarding(true);

        setTimeout(() => {
          if (!alive) return;
          setShowOnboarding(false);
          AsyncStorage.setItem("onboarded:classic", "1");
        }, 3000);
      }
    } catch {}
  })();

  return () => {
    alive = false;
  };
}, []);
  const [gameWon, setGameWon] = useState(false);
  const [hintsLeft, setHintsLeft] = useState(3);
  const [errorCount, setErrorCount] = useState(0);
  const [time, setTime] = useState(0);
  const [digitCounts, setDigitCounts] = useState<number[]>(Array(10).fill(0));
  const [showMenu, setShowMenu] = useState(false);
const [difficulty, setDifficulty] = useState(
  isDaily ? "medium" : level?.toString() || "easy"
);

  const [pendingDifficulty, setPendingDifficulty] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
 
  const [hasWon, setHasWon] = useState(false);
  const [highlightDigit, setHighlightDigit] = useState<number | null>(null);
  const [isPencilMode, setIsPencilMode] = useState(false);


// Game Over popup logic (must be before return, inside hook zone)
const [gameOverVisible, setGameOverVisible] = useState(false);
const gameOverShown = useRef(false);
useEffect(() => {
  if (errorCount >= 4 && !gameOverShown.current) {
    gameOverShown.current = true;

    // ðŸ”’ DAILY: one attempt only
    if (isDaily && onDailyLose) {
      onDailyLose();
      return;
    }

    // non-daily behavior unchanged
    setGameOverVisible(true);
  }
}, [errorCount, isDaily, onDailyLose]);



  const [blinkCells, setBlinkCells] = useState<[number, number][]>([]);
  const [contextCells, setContextCells] = useState<[number, number][]>([]);
  const blinkAnim = useRef(new Animated.Value(1)).current;

 const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
const loginRedirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const postWinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

const winHandledRef = useRef(false);
const skipNextResumeRef = useRef(false);
const forceFreshStartRef = useRef(false);
const skipNextSaveRef = useRef(false);
const restartingFromWinRef = useRef(false);


// âœ… AUTO-RESUME (CLASSIC ONLY) â€” refresh on every focus

useFocusEffect(
  useCallback(() => {
    if (isDaily) return;
    if (skipNextResumeRef.current) {
      skipNextResumeRef.current = false;
      return;
    }


    let alive = true;

    (async () => {
        try {
        const finished = await AsyncStorage.getItem("gameFinished");
        if (finished === "true") {
          // win already happened -> never offer resume
          await AsyncStorage.removeItem("gameFinished");
          await clearGame("classic");
          return;
        }

        const saved = await loadGame("classic");

      if (
  alive &&
  saved &&
  Array.isArray(saved.puzzle) &&
  saved.puzzle.length === 9 &&
  isBoardTouched(saved.puzzle)
) {
  setResumeData(saved);
  setResumeVisible(true);
  setIsHydrating(false);   // â­ ADD THIS
}


         } catch {
        setIsHydrating(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [isDaily])
);
// âœ… Save on leave (so timer updates even if you just leave without entering a number)
useFocusEffect(
  useCallback(() => {
    return () => {
      if (isDaily) return;

      // ðŸš« do not save after Game Over â†’ Close
      if (skipNextSaveRef.current) {
        skipNextSaveRef.current = false;
        return;
      }

    if (!puzzle) return;
if (winVisible) return;

// ðŸ§  do not save pristine boards
if (!isBoardTouched(puzzle)) return;


      saveGame("classic", {
        puzzle,
        solution: puzzle.map((r: any) => r.map((c: any) => c.solution)),
        timer: time,
        hintsLeft,
        difficulty,
        errors: errorCount,
        errorCount,
      });
    };
  }, [isDaily, puzzle, winVisible, time, hintsLeft, difficulty, errorCount])
);



 // ---------- Effects ----------
useEffect(() => {
  if (!resumeVisible) {
    startTimer();
  }

  if (puzzle) {
    updateDigitCounts(puzzle);
  }

  return () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (postWinTimeoutRef.current) {
      clearTimeout(postWinTimeoutRef.current);
      postWinTimeoutRef.current = null;
    }

    if (loginRedirectTimeoutRef.current) {
      clearTimeout(loginRedirectTimeoutRef.current);
      loginRedirectTimeoutRef.current = null;
    }
  };
}, [resumeVisible]);


 
  // ---------- Timer ----------
  const startTimer = () => {
   if (timerRef.current) {
  clearInterval(timerRef.current);
}

    timerRef.current = setInterval(() => setTime((t) => t + 1), 1000);
  };
  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ---------- Helpers ----------
  const updateDigitCounts = (board: any[][]) => {
    const counts = Array(10).fill(0);
    board.forEach((row) =>
      row.forEach((cell) => {
        if (cell.value) counts[cell.value]++;
      })
    );
    setDigitCounts(counts);
  };

    const isBoardTouched = (board: any[][] | null) => {
    if (!Array.isArray(board)) return false;

    for (const row of board) {
      for (const cell of row) {
        // entered number
        if (!cell.prefilled && cell.value != null) return true;

        // pencil notes
        if (Array.isArray(cell.notes) && cell.notes.length > 0) return true;
      }
    }

    return false;
  };

  // ---------- Placement ----------
  const handleSelectNumber = (num: number) => {
  if (gameWon) return;   // â­ STOP NUMBER PLACEMENT ONLY ON FULL WIN

    if (!selected) return;
    const [r, c] = selected;


    // Pencil mode first
if (isPencilMode) {
  toggleCandidate(r, c, num);
  try { Haptics.selectionAsync(); } catch {}
  return; // skip normal number placement
}


    if (puzzle[r][c].prefilled) return;

setHistory([...history, JSON.parse(JSON.stringify(puzzle))]);

const newPuzzle = puzzle.map((row, ri) =>
  row.map((cell: any, ci: number) =>
    ri === r && ci === c ? { ...cell, value: num } : cell
  )
);

// â­ FIRST UPDATE THE UI
setPuzzle(newPuzzle);
setRedoStack([]);
updateDigitCounts(newPuzzle);

// â­ THEN SAVE TO STORAGE
if (!isDaily) {
  saveGame("classic", {
  puzzle: newPuzzle,
  solution: newPuzzle.map((r: any[]) => r.map((c: any) => c.solution)),
  timer: time,
  hintsLeft: hintsLeft,
  difficulty: difficulty,
  errors:
    num !== puzzle[r][c].solution
      ? errorCount + 1
      : errorCount,
  errorCount:
    num !== puzzle[r][c].solution
      ? errorCount + 1
      : errorCount,
});


}


    //Killer cage live validation
if (level === "killer") {
  try {
    const { valid, errors } = validateCages(newPuzzle, cages || []);
    if (!valid && errors.length > 0) {
      const bad = errors[0];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  } catch (e) {
  }
}
   // ---------- Strike counter ----------
if (num !== puzzle[r][c].solution) {
  setErrorCount((prev) => prev + 1);
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
} else {
  Haptics.selectionAsync(); //light click for correct entry
}


    // ---------- Blink check ----------
    let blinkTargets: [number, number][] = [];

    if (newPuzzle[r].every((c) => c.value === c.solution)) {
      blinkTargets = blinkTargets.concat(newPuzzle[r].map((_, ci) => [r, ci]));
    }
    if (newPuzzle.every((row) => row[c].value === row[c].solution)) {
      blinkTargets = blinkTargets.concat(newPuzzle.map((_, ri) => [ri, c]));
    }
    const boxRow = Math.floor(r / 3);
    const boxCol = Math.floor(c / 3);
    let boxCells: [number, number][] = [];
    for (let rr = boxRow * 3; rr < boxRow * 3 + 3; rr++) {
      for (let cc = boxCol * 3; cc < boxCol * 3 + 3; cc++) {
        boxCells.push([rr, cc]);
      }
    }
    if (boxCells.every(([rr, cc]) => newPuzzle[rr][cc].value === newPuzzle[rr][cc].solution)) {
      blinkTargets = blinkTargets.concat(boxCells);
    }

    if (blinkTargets.length > 0) {
      triggerBlink(blinkTargets);
    }

  // Win check
const won = newPuzzle.every((row: any[]) =>
  row.every((cell: any) => cell.value === cell.solution)
);
if (won && !gameWon && !winHandledRef.current) {
  setGameWon(true);
  setErrorCount(0);
  handleWin();
}

  };

  const handleCellPress = (row: number, col: number, cell: any) => {
    setSelected([row, col]);
    if (cell.value) setHighlightDigit(cell.value);

    // ---------- Context highlight ----------
    let context: [number, number][] = [];
   context = context.concat(puzzle[row].map((_: any, ci: number) => [row, ci]));
context = context.concat(puzzle.map((_: any, ri: number) => [ri, col]));

    const boxRow = Math.floor(row / 3);
    const boxCol = Math.floor(col / 3);
    for (let rr = boxRow * 3; rr < boxRow * 3 + 3; rr++) {
      for (let cc = boxCol * 3; cc < boxCol * 3 + 3; cc++) {
        context.push([rr, cc]);
      }
    }
    setContextCells(context);
  };
// ---------- Pencil helpers ----------
const toggleCandidate = (r: number, c: number, num: number) => {
  const next = JSON.parse(JSON.stringify(puzzle));
  if (!Array.isArray(next[r][c].notes)) next[r][c].notes = [];
  const idx = next[r][c].notes.indexOf(num);
  if (idx === -1) next[r][c].notes.push(num);
  else next[r][c].notes.splice(idx, 1);
  setPuzzle(next);
 if (!isDaily) {
 saveGame("classic", {
  puzzle: next,
  solution: next.map(r => r.map(c => c.solution)),
  timer: time,
  hintsLeft,
  difficulty,
  errors: errorCount,
  errorCount: errorCount,
});


}


};

  // ---------- Undo/Redo/Delete/Hints/AutoSolve/Restart ----------
  const handleUndo = () => {
    if (gameWon || winVisible) return;   // â­ STOP UNDO AFTER WIN

    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack([JSON.parse(JSON.stringify(puzzle)), ...redoStack]);
    setPuzzle(prev);
    setHistory(history.slice(0, -1));
    updateDigitCounts(prev);
  };

  const handleRedo = () => {
    if (gameWon || winVisible) return;   // â­ STOP REDO AFTER WIN

    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory([...history, JSON.parse(JSON.stringify(puzzle))]);
    setPuzzle(next);
    setRedoStack(redoStack.slice(1));
    updateDigitCounts(next);
  };

  const handleDelete = () => {
    if (gameWon || winVisible) return;   // â­ STOP DELETE AFTER WIN
    if (!selected) return;
    const [r, c] = selected;
  if (puzzle[r][c].prefilled === true) return;


    const newPuzzle = puzzle.map((row, ri) =>
      row.map((cell: any, ci: number) => (ri === r && ci === c ? { ...cell, value: null } : cell))
    );

    setHistory([...history, JSON.parse(JSON.stringify(puzzle))]);
    setRedoStack([]);
    setPuzzle(newPuzzle);
    updateDigitCounts(newPuzzle);

    const won = newPuzzle.every((row) => row.every((cell) => cell.value === cell.solution));
   if (won && !gameWon && !winHandledRef.current) {
  setGameWon(true);
  handleWin();
}

  };

  const handleHint = () => {
    if (gameWon || winVisible) return;   // â­ STOP HINT AFTER WIN
    if (!selected || hintsLeft <= 0) return;
    const [r, c] = selected;
    if (puzzle[r][c].prefilled) return;

    const solution = puzzle[r][c].solution;
   const newPuzzle = puzzle.map((row: any[], ri: number) =>
  row.map((cell: any, ci: number) =>
    ri === r && ci === c ? { ...cell, value: solution } : cell
  )
);

     setHistory([...history, JSON.parse(JSON.stringify(puzzle))]);
  setRedoStack([]);
  setPuzzle(newPuzzle);
  setHintsLeft(hintsLeft - 1);
if (!isDaily) {

saveGame("classic", {
  puzzle: newPuzzle,
  solution: newPuzzle.map((row) => row.map((cell: any) => cell.solution)),
  timer: time,
  hintsLeft: hintsLeft - 1,
  difficulty,
  errors: errorCount,
  errorCount: errorCount,
});


}
 updateDigitCounts(newPuzzle);
const won = newPuzzle.every(
  (row: any[]) => row.every((cell: any) => cell.value === cell.solution)
)

if (won && !gameWon && !winHandledRef.current) {
  setGameWon(true);
  handleWin();
}

  };

 const handleAutoSolve = () => {
  if (gameWon || winVisible || winHandledRef.current) return;

const solved = puzzle.map((row: any[]) =>
  row.map((cell: any) => ({ ...cell, value: cell.solution }))
);

  setPuzzle(JSON.parse(JSON.stringify(solved)));
  updateDigitCounts(solved);

  if (!winHandledRef.current) {
    setGameWon(true);
    handleWin();
  }
};


  const handleRestart = (levelInput: any = difficulty) => {
    if (isDaily) return;
    winHandledRef.current = false;

    setGameWon(false);
    setHasWon(false);  //ensures stats reset even if you closed WinModal
  setErrorCount(0); // immediate reset to avoid carry-over

    const level = typeof levelInput === "string" ? levelInput : difficulty;
    setDifficulty(level);
AsyncStorage.removeItem("activeGame"); // clear old autosave
AsyncStorage.removeItem("gameFinished");

    const newBoard = generateSudoku(level);
    if (level === "killer") {
  const solution = newBoard.map(r => r.map(c => c.solution));
 setCages(generateKillerCages(solution));
}

    setPuzzle(JSON.parse(JSON.stringify(newBoard)));
    setInitialSnapshot(JSON.parse(JSON.stringify(newBoard)));
    setHistory([]);
    setRedoStack([]);
    updateDigitCounts(newBoard);
    setHintsLeft(level === "easy" ? 3 : level === "medium" ? 2 : 1);
    setWinVisible(false);
    setTime(0);
    startTimer();
    setErrorCount(0);
  };

  // ðŸ”’ WinModal helpers â€” MUST be here (component scope, before return)

const handleWinCloseToHub = () => {
  requestAnimationFrame(() => {
    router.replace("/variantHub");
  });
};

const handleWinRestart = (level: string) => {
  requestAnimationFrame(() => {
    AsyncStorage.removeItem("gameFinished");
    clearGame(isDaily ? "daily" : "classic");
    handleRestart(level);
  });
};

const handleWin = async () => {
  if (winHandledRef.current) return;
  winHandledRef.current = true;

  // ðŸ”’ FINALIZE: no resume + no autosave after a win
  skipNextResumeRef.current = true;
  skipNextSaveRef.current = true;
  await AsyncStorage.setItem("gameFinished", "true");

  // also delete any saved autosave so resume never triggers
  await clearGame("classic");

  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  blinkAnim.stopAnimation();
  setBlinkCells([]);

  setGameWon(true);
  setWinVisible(true);


if (isDaily) {
  setWinVisible(true);

  if (onDailyWin) {
    onDailyWin({
      user: username,
      difficulty,
      time,
      errors: errorCount,
      points: calculateScore({
        difficulty,
        time,
        hints: 3 - hintsLeft,
        undos: history.length,
        errors: errorCount,
        streak: 0,
      }),
    });
    
  }

  return;
}

  // âœ… NON-DAILY FLOW
  try {
    Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success
    );
  } catch {}

 postWinTimeoutRef.current = setTimeout(async () => {
  try {
    const xp = calculateXpForLadder({
      mode: "classic",
      difficulty,
      time,
      errors: errorCount,
    });
    await refreshLadderData(username);

    const newScore = calculateScore({
      difficulty,
      time,
      hints: 3 - hintsLeft,
      undos: history.length,
      errors: errorCount,
      streak: await getCurrentStreak(username),
    });

    setScore(newScore);

    await saveWin(
  username || "Guest",
  difficulty,
  time,
  errorCount,
  false
);

await onGameFinished({
  mode: "classic",
  win: true,
  time,
  errors: errorCount,
  hintsUsed: 3 - hintsLeft,
  difficulty,
  score: newScore,
});

  } catch (err) {
    // silent fail
  }
}, 0);
};

const handleGameOverClose = async () => {
  // 1ï¸âƒ£ Stop timer
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }

  // 2ï¸âƒ£ Clear saved game
  await clearGame("classic");
// ðŸš« block auto-save AFTER game over close
skipNextSaveRef.current = true;
  // ðŸš« IMPORTANT: block next auto-resume
  skipNextResumeRef.current = true;
  forceFreshStartRef.current = true;
  setResumeData(null);
  setResumeVisible(false);

  // 3ï¸âƒ£ Clear board + state
  setPuzzle(null);
  setHistory([]);
  setRedoStack([]);
  setSelected(null);
  setHighlightDigit(null);
  setContextCells([]);
  setBlinkCells([]);

  setGameWon(false);
  setHasWon(false);
  setWinVisible(false);

  // 4ï¸âƒ£ Reset loss state
  setErrorCount(0);
  gameOverShown.current = false;

  // 5ï¸âƒ£ Close modal
  setGameOverVisible(false);

  // 6ï¸âƒ£ Navigate out
  router.replace("/variantHub");
};



  function triggerBlink(cells: [number, number][]) {
    setBlinkCells(cells);
    Animated.sequence([
      Animated.timing(blinkAnim, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      Animated.timing(blinkAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(blinkAnim, { toValue: 0.3, duration: 200, useNativeDriver: true }),
      Animated.timing(blinkAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start(() => setBlinkCells([]));
  }

// ---------- Render ----------
const controlsLocked = gameWon || gameOverVisible;
const maxStrikes = 4;

// Prevent rendering until puzzle is initialized
if (isHydrating || !puzzle) {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#D6A21F", fontWeight: "700" }}>
        Loadingâ€¦
      </Text>
    </View>
  );
}
return (
  <View style={{ flex: 1 }}>
    {showOnboarding && !isDaily && (
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
          color: "#F5E6A8", // soft gold, theme-aligned
          textAlign: "center",
          fontWeight: "600",
          lineHeight: 20,
        }}
      >
        Complete the grid so every row, column, and box contains 1â€“9.
      </Text>
    </View>
  </View>
)}

  <View style={s.bg}>

  <View style={s.gameplayHeader}>
    <View style={s.modeTitleRow}>
      <Ionicons
        name={isDaily ? "sunny-outline" : "grid-outline"}
        size={18}
        color={"#12385A"}
      />
      <Text style={s.modeTitle}>
        {isDaily ? "Daily Challenge" : "Classic Sudoku"}
      </Text>
    </View>

    <View style={s.statusRow}>
      {!isDaily ? (
        <TouchableOpacity
          activeOpacity={0.82}
          style={[s.statusChip, s.difficultyChip]}
          onPress={() => setShowMenu(true)}
        >
          <Text style={s.statusChipText}>{difficulty.toUpperCase()}</Text>
          <Ionicons name="chevron-down" size={13} color={"#12385A"} />
        </TouchableOpacity>
      ) : (
        <View style={[s.statusChip, s.difficultyChip]}>
          <Text style={s.statusChipText}>DAILY</Text>
        </View>
      )}

      <View style={s.statusChip}>
        <Ionicons name="time-outline" size={14} color={"#12385A"} />
        <Text style={s.statusChipText}>{formatTime(time)}</Text>
      </View>

      <View style={s.statusChip}>
        <Ionicons name="close-circle-outline" size={14} color={errorCount > 0 ? "#D9534F" : colors.buttonPrimaryBg} />
        <Text style={[s.statusChipText, errorCount > 0 && s.strikeChipText]}>
          {errorCount}/{maxStrikes}
        </Text>
      </View>
    </View>
  </View>


<View style={[s.board, winVisible && { opacity: 0.35 }]}>
  {puzzle.map((row, ri) => (
    <View key={ri} style={s.row}>
      {row.map((cell, ci) => (
        <SudokuCell
          key={`${ri}-${ci}`}
          cell={cell}
          row={ri}
          col={ci}
          isSelected={selected && selected[0] === ri && selected[1] === ci}
          isHighlighted={highlightDigit !== null && cell.value === highlightDigit}
          isContext={contextCells.some(([r, c]) => r === ri && c === ci)}
          isWrong={cell.value && cell.value !== cell.solution && !cell.prefilled}
          blinkCells={blinkCells}
          blinkAnim={blinkAnim}
          onPress={() => {
            if (winVisible) return; // ðŸ”’ lock board
            handleCellPress(ri, ci, cell);
          }}
        />
      ))}
    </View>
  ))}
</View>

      {/* Win Modal */}
 {!winVisible && (
  <>
    {/* Controls */}
    <View style={{ marginTop: 12, marginBottom: 24 }}>
      <Controls
        onUndo={handleUndo}
        onRedo={handleRedo}
        onHint={handleHint}
        onDelete={handleDelete}
        onRestart={handleRestart}
        onSolve={handleAutoSolve}
        hintsLeft={hintsLeft}
        pencilMode={isPencilMode}
        onTogglePencil={() => setIsPencilMode((p) => !p)}
        disableUndo={history.length === 0}
        disableRedo={redoStack.length === 0}
        locked={controlsLocked}
        hideRestart={isDaily}
      />
    </View>

    {/* Number Pad */}
    <NumberPad
      disabledNumbers={digitCounts
        .map((count, num) => (count >= 9 ? num : null))
        .filter((n): n is number => n !== null)

      }
      onNumberPress={handleSelectNumber}
    />
  </>
)}


        </View>

 



        {/* GAME OVER MODAL */}
<UniversalModal
  visible={gameOverVisible}
  title="Game Over"
  message={`You made ${errorCount} mistakes!`}
  actions={[
    {
      label: "Play Again",
      onPress: () => {
        setGameOverVisible(false);
        setErrorCount(0);
        gameOverShown.current = false;
        handleRestart(difficulty);
      },
    },
   {
  label: "Close",
  onPress: handleGameOverClose,
},

  ]}
/>

{/* RESUME GAME MODAL ðŸ‘‡ PASTE THIS BLOCK */}
<UniversalModal
  visible={resumeVisible}
  title="Resume Game?"
  message="Would you like to continue your previous puzzle?"
  actions={[
{
  label: "YES",
  onPress: () => {
    if (resumeData) {
      const rebuilt = resumeData.puzzle.map((row: any[]) =>
        row.map((cell: any) => ({
          ...cell,
          value: cell.value ?? null,
          solution: cell.solution ?? 0,
          prefilled: cell.prefilled === true,
          notes: Array.isArray(cell.notes) ? cell.notes : [],
        }))
      );

      setPuzzle(rebuilt);
      setInitialSnapshot(JSON.parse(JSON.stringify(rebuilt)));

      setHistory([]);
      setRedoStack([]);

    setErrorCount(resumeData.errorCount ?? 0);

     setHintsLeft(resumeData.hintsLeft ?? 3);
      setTime(resumeData.timer ?? 0);
      setDifficulty(resumeData.difficulty ?? "easy");
      updateDigitCounts(rebuilt);
    }

  setResumeVisible(false);
setIsHydrating(false);   // â­ ADD THIS
startTimer();
  },
},



  {
  label: "NO",
 onPress: async () => {
  await clearGame("classic");
  setResumeVisible(false);
  setIsHydrating(false);   // â­ ADD THIS
},
},

  ]}
/>



      {/* Difficulty Modal */}
     <UniversalModal
 visible={showMenu && !isDaily}
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


      {/* Confirmation Modal */}
      <UniversalModal
  visible={confirmVisible && !isDaily}
  title={`Start a new ${pendingDifficulty?.toUpperCase()} game?`}
  actions={[
    {
      label: "Yes, Start",
    onPress: () => {
  if (pendingDifficulty) {
    handleRestart(pendingDifficulty); // âœ… this regenerates the board
  }
  setPendingDifficulty(null);
  setConfirmVisible(false);
},

    },
    { label: "Cancel", onPress: () => setConfirmVisible(false) },
  ]}
/>


    {/* âœ… Win Modal only mounts when visible */}
 {!isDaily && winVisible && (
  <WinModal
    visible={winVisible}

onClose={() => {
  // ðŸ”’ block resume & autosave
  skipNextResumeRef.current = true;
  skipNextSaveRef.current = true;

  // clear save (fire-and-forget â€” NO await)
  clearGame("classic");

  // close modal first
  setWinVisible(false);

  // ðŸš€ navigate AFTER modal unmount
  requestAnimationFrame(() => {
    router.replace("/variantHub");
  });
}}


  onRestart={(level) => {
  // ðŸ”’ This restart starts a BRAND NEW session
  skipNextResumeRef.current = true;
  skipNextSaveRef.current = true;

  // ðŸš« absolutely forbid resume from previous win
  AsyncStorage.removeItem("gameFinished");
  clearGame("classic");

  setResumeData(null);
  setResumeVisible(false);

  setWinVisible(false);
  handleRestart(level);
}}


    difficulty={difficulty}
    isDaily={isDaily}
  />
)}



    {/* âœ… Ladder Rank-Up Popup */}
    <RankUpPopup />
  
  </View>
);
}



const styles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
 button: {
 backgroundColor: "transparent",          // white / themed base
  paddingVertical: 10,
  borderRadius: 16,
  marginBottom: 8,
  width: "80%",
  alignItems: "center",

  borderWidth: 2,                                  // gold outline
  borderColor: colors.buttonSecondaryBg,

  shadowColor: colors.buttonSecondaryBg,           // soft gold glow
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 5,
  elevation: 4,
},
buttonText: {
  color: colors.buttonSecondaryBg,                 // gold text
  fontSize: 15,
  fontWeight: "700",
},


   bg: {
  flex: 1,
  resizeMode: "cover",
 backgroundColor: sweirkiTheme.colors.screen,

  justifyContent: "flex-start",
  paddingTop: 64,
  paddingBottom: 30,   // â­ ADD THIS
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
    borderColor: "rgba(212, 160, 32, 0.95)",
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

 board: {
  width: CELL_SIZE * 9,
  height: CELL_SIZE * 9,
  alignSelf: "center",
  marginTop: 6,
  marginBottom: 8,
},

    row: {
      flexDirection: "row",
      flex: 1,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      alignItems: "center",
    },

  modalCard: {
  width: "80%",
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  padding: 24,
  alignItems: "center",
  shadowColor: colors.gold,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 6,
  elevation: 8,
},

    modalTitle: {
  fontSize: 16,
  fontWeight: "600",
  marginBottom: 12,
  color: colors.gold,
  textAlign: "center",
},


strikeBox: {
  marginTop: 8,
  marginBottom: 8,
  alignSelf: "center",
  padding: 8,
  borderRadius: 6,
  backgroundColor: colors.wrongBackground,
},
strikeText: {
  fontSize: 16,
  fontWeight: "bold",
  color: colors.wrongNumber,
},

// --- Killer-style menu visuals for Classic ---
menuOverlay: {
  flex: 1,
  backgroundColor: "rgba(0,0,0,0.5)",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 999,
},
menuBox: {
  width: "70%",
  backgroundColor: "#FFFFFF",
  borderRadius: 14,
  padding: 16,
  alignItems: "center",
},

menuTitle: {
  fontSize: 16,
  fontWeight: "800",
  color: colors.gold,
  marginBottom: 10,
},

  })











