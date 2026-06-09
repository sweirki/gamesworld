import React, { useEffect, useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getColors } from "../theme/index";
import { CELL_SIZE } from "../killerSudoku";

interface Cell {
  value: number | null;
  solution: number;
  prefilled?: boolean;
  notes?: number[];
}

interface Props {
  [extraProp: string]: any;
  key?: string | number;
  cell: Cell;
  row: number;
  col: number;
  isSelected: boolean;
  isHighlighted: boolean;
  isContext: boolean;
  isWrong: boolean;
  blinkCells: [number, number][];
  blinkAnim: Animated.Value;
  onPress: () => void;
  hideBorders?: boolean;
  forceClearBackground?: boolean;
  isDiagonal?: boolean;
   isRegion?: boolean;
  isHyper?: boolean;

}

export default function SudokuCell({
  cell,
  row,
  col,
  isSelected,
  isHighlighted,
  isContext,
  isWrong,
  hideBorders = false,
  forceClearBackground = false,
  blinkCells,
  blinkAnim,
  onPress,
    isDiagonal,        // â­ ADD THIS
     isRegion,        // â­ ADD THIS
}: Props) {

    // â­ DEFENSIVE NORMALIZATION (prevents crashes)
  const safeCell = {
    value:
      typeof cell?.value === "number" || cell?.value === null
        ? cell.value
        : null,

    solution:
      typeof cell?.solution === "number"
        ? cell.solution
        : 0,

    prefilled:
      typeof cell?.prefilled === "boolean"
        ? cell.prefilled
        : false,

    notes:
      Array.isArray(cell?.notes)
        ? cell.notes
        : [],
  };



  const isBlinking = blinkCells.some(([r, c]) => r === row && c === col);

  // USER SETTINGS
  const [highlightSame, setHighlightSame] = useState(true);
  const [highlightRCB, setHighlightRCB] = useState(true);
  const [colorblind, setColorblind] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const kv = await AsyncStorage.multiGet([
          "highlightSame",
          "highlightRCB",
          "colorblind",
          "zenMode",
        ]);
        const obj = Object.fromEntries(kv);
        setHighlightSame(obj.highlightSame !== "0");
        setHighlightRCB(obj.highlightRCB !== "0");
        setColorblind(obj.colorblind === "1");
        setZenMode(obj.zenMode === "1");
      } catch {}
    })();
  }, []);

  const colors = getColors();

  //  NORMAL WHITE BACKGROUND FOR ALL MODES EXCEPT KILLER
  const cellBackground =
    forceClearBackground ? "transparent" : colors.cellBackground;

  //  BORDER LOGIC
  const borderStyle = {
    borderTopWidth: hideBorders ? 0 : row % 3 === 0 ? 2 : 1,
    borderLeftWidth: hideBorders ? 0 : col % 3 === 0 ? 2 : 1,
    borderRightWidth: hideBorders ? 0 : col === 8 ? 2 : 1,
    borderBottomWidth: hideBorders ? 0 : row === 8 ? 2 : 1,
    borderColor: colors.cellBorder,
  };

  //  FINAL CELL STYLE
  const cellStyles = [
    styles.cell,
    borderStyle,
    { backgroundColor: cellBackground },
  ];

  // -----------------------------------------
  // HIGHLIGHTS
  // -----------------------------------------
  let overlayColor: string | null = null;

  const highlightPalette = {
    highlight: colors.highlightCell,
    context: colors.contextHighlight,
    selected: colors.selectionBackground,
    wrong: colors.wrongBackground,
    text: colors.enteredNumber,
  };

  if (highlightRCB && isContext) overlayColor = highlightPalette.context;
  if (highlightSame && isHighlighted) overlayColor = highlightPalette.highlight;
if (isDiagonal) overlayColor = "rgba(116, 148, 75, 0.28)"; // soft purple

//  HYPER REGIONS YELLOW SHADING
if (isContext === false && isHighlighted === false && isRegion) {
  overlayColor = "rgba(255, 180, 120, 0.30)";

}

// â­ PROFESSIONAL 3Ã—3 BOX SHADING (all boxes evenly shaded)
if (!overlayColor) {
  const boxRow = Math.floor(row / 3);
  const boxCol = Math.floor(col / 3);
  const isBoxEven = (boxRow + boxCol) % 2 === 0;

  // Light, clean shading for pro sudoku look
  if (isBoxEven) {
    overlayColor = "rgba(200, 200, 200, 0.40)";
  }
}



  if (isSelected) overlayColor = highlightPalette.selected;
  if (isWrong) overlayColor = highlightPalette.wrong;

  if (zenMode) overlayColor = "rgba(255,255,255,0.05)";

 const showNotes =
    !zenMode && safeCell.notes.length > 0;

  const showValue = !zenMode && safeCell.value !== null;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Animated.View
        style={[
          ...cellStyles,
          isBlinking && { opacity: blinkAnim },
          zenMode && { backgroundColor: "rgba(255,255,255,0.05)" },
        ]}
      >
        {overlayColor && (
          <View style={[styles.overlay, { backgroundColor: overlayColor }]} />
        )}

        {showValue ? (
          <Text
            style={[
              styles.text,
             safeCell.prefilled
                ? { color: colors.givenNumber, fontWeight: "700" }
                : { color: colors.enteredNumber },
              highlightSame && isHighlighted && { color: highlightPalette.text },
              isWrong && { color: colors.wrongNumber, fontWeight: "700" },
            ]}
          >
         {safeCell.value}
          </Text>
        ) : showNotes ? (
          <Text style={[styles.text, styles.notes, { color: colors.pencilNumber }]}>
            {(safeCell.notes ?? []).slice().sort().join(" ")}
          </Text>
        ) : null}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  text: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: CELL_SIZE * 0.78,
  },
  notes: {
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: CELL_SIZE * 0.33,
  },
});

