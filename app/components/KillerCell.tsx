import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  View,
  Dimensions,
} from "react-native";
import { getColors } from "../theme/index";

const { width } = Dimensions.get("window");
const CELL_SIZE = Math.floor((width - 40) / 9);

type Cell = {
  value: number | null;
  solution: number;
  prefilled?: boolean;
  notes?: number[];
};

type Props = {
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
};

export default function KillerCell({
  cell,
  row,
  col,
  isSelected,
  isHighlighted,
  isContext,
  isWrong,
  blinkCells,
  blinkAnim,
  onPress,
}: Props) {
  const colors = getColors();

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
    notes: Array.isArray(cell?.notes) ? cell.notes : [],
  };

  const isBlinking = blinkCells.some(([r, c]) => r === row && c === col);

  let overlayColor: string | null = null;

  if (isContext) overlayColor = colors.contextHighlight;
  if (isHighlighted) overlayColor = colors.highlightCell;
  if (isSelected) overlayColor = colors.selectionBackground;
  if (isWrong) overlayColor = colors.wrongBackground;

  const showValue = safeCell.value !== null;
  const showNotes = !showValue && safeCell.notes.length > 0;

 return (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.7}
    style={styles.cell}
  >
    <Animated.View
      style={[
        styles.fill,
        isBlinking ? { opacity: blinkAnim } : null,
      ]}
    >
        {overlayColor ? (
          <View
            pointerEvents="none"
            style={[styles.overlay, { backgroundColor: overlayColor }]}
          />
        ) : null}

        {showValue ? (
          <Text
            style={[
              styles.valueText,
              safeCell.prefilled
                ? { color: colors.givenNumber, fontWeight: "700" }
                : { color: colors.enteredNumber },
              isWrong ? { color: colors.wrongNumber, fontWeight: "700" } : null,
            ]}
          >
            {safeCell.value}
          </Text>
        ) : showNotes ? (
          <Text style={[styles.notesText, { color: colors.pencilNumber }]}>
            {safeCell.notes.slice().sort().join(" ")}
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
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  fill: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    
    ...StyleSheet.absoluteFillObject,
  },
  valueText: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: CELL_SIZE * 0.78,
  },
  notesText: {
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: CELL_SIZE * 0.33,
  },
});