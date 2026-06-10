import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { playControlClick } from "../../src/sound/clickSound";
import { sweirkiTheme } from "../theme/sweirkiTheme";

interface ControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  onHint: () => void;
  onDelete: () => void;
  onRestart: () => void;
  onSolve: () => void;
  pencilMode: boolean;
  onTogglePencil: () => void;
  hintsLeft: number;
  disableUndo?: boolean;
  disableRedo?: boolean;
  locked?: boolean;
  hideRestart?: boolean;
}

type ControlTone = "soft" | "primary" | "danger" | "toggle";

type ControlButtonProps = {
  label: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: ControlTone;
  wide?: boolean;
};

const { colors, fonts, radius } = sweirkiTheme;

export default function Controls({
  onUndo,
  onRedo,
  onHint,
  onDelete,
  onRestart,
  onSolve,
  pencilMode,
  onTogglePencil,
  hintsLeft,
  disableUndo,
  disableRedo,
  locked,
  hideRestart = false,
}: ControlsProps) {
  const run = async (action: () => void) => {
    await playControlClick();
    action();
  };

  const ControlButton = ({
    label,
    sublabel,
    onPress,
    disabled,
    tone = "soft",
    wide,
  }: ControlButtonProps) => {
    const toneStyle = getToneStyle(tone, disabled);

    return (
      <TouchableOpacity
        activeOpacity={0.78}
        disabled={disabled}
        onPress={() => {
          if (!disabled) run(onPress);
        }}
        style={[
          styles.button,
          wide ? styles.wideButton : styles.smallButton,
          toneStyle.button,
          disabled && styles.disabledButton,
        ]}
      >
        <Text style={[styles.buttonText, toneStyle.text]} numberOfLines={1}>
          {label}
        </Text>
        {!!sublabel && (
          <Text style={[styles.buttonSubtext, toneStyle.subtext]} numberOfLines={1}>
            {sublabel}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.primaryRow}>
        <ControlButton label="Undo" onPress={onUndo} disabled={locked || disableUndo} />
        <ControlButton label="Redo" onPress={onRedo} disabled={locked || disableRedo} />
        <ControlButton
          label="Hint"
          sublabel={`${hintsLeft} left`}
          onPress={onHint}
          disabled={locked || hintsLeft <= 0}
          tone="primary"
        />
        <ControlButton label="Delete" onPress={onDelete} disabled={locked} tone="soft" />
      </View>

      <View style={styles.secondaryRow}>
        {!hideRestart && <ControlButton label="Restart" onPress={onRestart} disabled={locked} tone="danger" wide />}
        <ControlButton
          label={pencilMode ? "Pencil ON" : "Pencil OFF"}
          onPress={onTogglePencil}
          disabled={locked}
          tone={pencilMode ? "toggle" : "soft"}
          wide
        />
      </View>
    </View>
  );
}

function getToneStyle(tone: ControlTone, disabled?: boolean) {
  if (disabled) {
    return {
      button: {
        backgroundColor: "rgba(255,255,255,0.48)",
        borderColor: "rgba(125,147,168,0.24)",
      },
      text: { color: "rgba(20,56,95,0.34)" },
      subtext: { color: "rgba(20,56,95,0.26)" },
    };
  }

  if (tone === "primary") {
    return {
      button: {
        backgroundColor: "rgba(245,185,67,0.34)",
        borderColor: "rgba(245,185,67,0.76)",
      },
      text: { color: colors.inkDeep },
      subtext: { color: colors.text },
    };
  }

  if (tone === "danger") {
    return {
      button: {
        backgroundColor: "rgba(255,255,255,0.9)",
        borderColor: "rgba(229,83,100,0.22)",
      },
      text: { color: "#9D4551" },
      subtext: { color: colors.textSoft },
    };
  }

  if (tone === "toggle") {
    return {
      button: {
        backgroundColor: "rgba(107,229,201,0.24)",
        borderColor: "rgba(53,200,244,0.56)",
      },
      text: { color: colors.inkDeep },
      subtext: { color: colors.textSoft },
    };
  }

  return {
    button: {
      backgroundColor: "rgba(255,255,255,0.9)",
      borderColor: colors.borderCyanStrong,
    },
    text: { color: colors.inkDeep },
    subtext: { color: colors.textSoft },
  };
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    paddingHorizontal: 14,
    marginTop: 6,
    marginBottom: 6,
  },
  primaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    borderWidth: 1.2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.shadowSoft,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  smallButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.soft,
    paddingHorizontal: 6,
  },
  wideButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: radius.soft,
    paddingHorizontal: 12,
  },
  disabledButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    fontFamily: fonts.bold,
    fontSize: 13,
    lineHeight: 17,
    textAlign: "center",
  },
  buttonSubtext: {
    marginTop: -1,
    fontFamily: fonts.bold,
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
});

