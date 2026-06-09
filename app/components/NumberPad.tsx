import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { getColors } from "../theme/index";
import { LinearGradient } from "expo-linear-gradient";

interface Props {
  onNumberPress: (n: number) => void | Promise<void>;
  disabledNumbers?: (number | string)[];
  onErase?: () => void;
  onHint?: () => void | Promise<void>;
  isPencilMode?: boolean;
  onTogglePencil?: () => void;
}


export default function NumberPad({ onNumberPress, disabledNumbers }: Props) {
  const colors = getColors();
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <View style={styles.wrapper}>
      {nums.map((n) => (
       <TouchableOpacity
  key={n}
  activeOpacity={0.75}
  disabled={disabledNumbers?.includes(n) || disabledNumbers?.includes(String(n))}
  style={[styles.touch, (disabledNumbers?.includes(n) || disabledNumbers?.includes(String(n))) && { opacity: 0.35 }]}
  onPress={() => !disabledNumbers?.includes(n) && onNumberPress(n)}
>

          <LinearGradient
            colors={[colors.card, colors.card]}
            style={[styles.btn, { borderColor: colors.gold }]}
          >
            <Text style={[styles.txt, { color: colors.textPrimary }]}>{n}</Text>
          </LinearGradient>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginTop: 4,
    paddingBottom: 14,
  },

  touch: {
    width: "26%",          // slimmer buttons, more breathing room
    marginVertical: 6,
    alignItems: "center",
  },

  btn: {
    width: "100%",
    height: 46,            // smaller than before (was 56)
    borderRadius: 12,
    borderWidth: 1.5,      // lighter gold outline
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowOpacity: 0.08,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },

  txt: {
    fontSize: 18,
    fontWeight: "700",
  },
});

