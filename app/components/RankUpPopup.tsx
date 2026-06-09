import React from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import { useRankUpStore } from "../stores/useRankUpStore";
import { getRankBadge } from "../../utils/ladder/scoreEngine";

export default function RankUpPopup() {
  const { visible, oldRank, newRank, hideRankUp } = useRankUpStore();

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade">
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            padding: 30,
            borderRadius: 20,
            backgroundColor: "#222",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 26,
              fontWeight: "bold",
              color: "gold",
              marginBottom: 10,
            }}
          >
            RANK UP!
          </Text>

          <Text style={{ color: "white", marginBottom: 20 }}>
            {oldRank} → {newRank}
          </Text>

          <Text style={{ fontSize: 72, marginBottom: 20 }}>
            {getRankBadge(newRank || "Bronze")}
          </Text>

          <TouchableOpacity
            onPress={hideRankUp}
            style={{
              backgroundColor: "gold",
              paddingHorizontal: 30,
              paddingVertical: 10,
              borderRadius: 10,
            }}
          >
            <Text style={{ fontWeight: "bold", fontSize: 18 }}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
