import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { getColors } from "../theme";

export default function UniversalModal({
  visible,
  title,
  message,
  actions = [],
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  actions: { label: string; onPress: () => void }[];
  onClose?: () => void;
}) {
  const colors = getColors();

  return (
  <Modal visible={visible} transparent animationType="fade">
    <View style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
    }}>
      
      <View style={{
        width: "75%",
        backgroundColor: colors.card,
        borderRadius: 22,
        paddingVertical: 26,
        paddingHorizontal: 20,
        alignItems: "center",
        shadowColor: "#35C8F4",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 3 },
        elevation: 6,
      }}>

        {/* TITLE */}
        {title && (
          <Text style={{
            fontSize: 20,
            fontWeight: "800",
            marginBottom: 10,
            color: "#5A82D6",
            textAlign: "center",
          }}>
            {title}
          </Text>
        )}

        {/* MESSAGE */}
        {message && (
          <Text style={{
            fontSize: 15,
            marginBottom: 20,
            textAlign: "center",
            color: "#5A82D6",
            opacity: 0.85,
          }}>
            {message}
          </Text>
        )}

        {/* ACTION BUTTONS */}
        {actions.map((a, i) => (
          <TouchableOpacity
            key={i}
            onPress={a.onPress}
            style={{
              width: "80%",
              paddingVertical: 12,
              borderRadius: 14,
              borderWidth: 2,
              borderColor: "#35C8F4",
              alignItems: "center",
              marginBottom: 10,
              backgroundColor: "#FFFFFF",
              shadowColor: "#35C8F4",
              shadowOpacity: 0.2,
              shadowRadius: 5,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }}
          >
            <Text style={{
              fontSize: 15,
              fontWeight: "700",
              color: "#12385A",
            }}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}

      </View>
    </View>
  </Modal>
);

}

const styles = (colors: ReturnType<typeof getColors>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
    },
    card: {
      width: "75%",
      backgroundColor: colors.card,
      borderRadius: 20,
      paddingVertical: 24,
      paddingHorizontal: 18,
      alignItems: "center",
      shadowColor: "#35C8F4",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 10,
    },
    title: {
      fontSize: 18,
      fontWeight: "800",
      color: "#12385A",
      marginBottom: 12,
      textAlign: "center",
    },
    message: {
      fontSize: 15,
      color: colors.textPrimary,
      marginBottom: 20,
      textAlign: "center",
    },
    button: {
      width: "85%",
      paddingVertical: 12,
      marginVertical: 5,
      borderRadius: 16,
      backgroundColor: "#FFFFFF",
      borderWidth: 2,
      borderColor: "#35C8F4",
      alignItems: "center",
      shadowColor: "#35C8F4",
      shadowOpacity: 0.25,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    buttonText: {
      fontSize: 15,
      fontWeight: "700",
      color: "#12385A",
    },
  });


