import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { sweirkiTheme } from "../theme/sweirkiTheme";

interface Props {
  onNumberPress: (n: number) => void | Promise<void>;
  disabledNumbers?: (number | string)[];
  onErase?: () => void;
  onHint?: () => void | Promise<void>;
  isPencilMode?: boolean;
  onTogglePencil?: () => void;
}

const { colors, fonts, radius } = sweirkiTheme;

export default function NumberPad({ onNumberPress, disabledNumbers }: Props) {
  const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const isDisabled = (n: number) =>
    disabledNumbers?.includes(n) || disabledNumbers?.includes(String(n));

  return (
    <View style={styles.wrapper}>
      {nums.map((n) => {
        const disabled = isDisabled(n);

        return (
          <TouchableOpacity
            key={n}
            activeOpacity={0.78}
            disabled={disabled}
            style={[styles.touch, disabled && styles.disabledTouch]}
            onPress={() => {
              if (!disabled) onNumberPress(n);
            }}
          >
            <LinearGradient
              colors={colors.heroGradient}
              style={[styles.button, disabled && styles.disabledButton]}
            >
              <Text style={[styles.number, disabled && styles.disabledNumber]}>{n}</Text>
            </LinearGradient>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginTop: 4,
    paddingBottom: 14,
  },
  touch: {
    width: "30.5%",
    marginHorizontal: 4,
    marginVertical: 5,
    alignItems: "center",
  },
  disabledTouch: {
    opacity: 0.34,
  },
  button: {
    width: "100%",
    height: 46,
    borderRadius: radius.soft,
    borderWidth: 1.2,
    borderColor: colors.borderCyanStrong,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadowSoft,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  disabledButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  number: {
    fontFamily: fonts.bold,
    fontSize: 22,
    lineHeight: 28,
    color: colors.inkDeep,
  },
  disabledNumber: {
    color: colors.textMuted,
  },
});
