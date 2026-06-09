import React, { useState } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const router = useRouter();
const [popup, setPopup] = useState<{
  title: string;
  message: string;
} | null>(null);

  const handleSignup = async () => {
    if (!email || !password) {
    setPopup({
  title: "Error",
  message: "Please enter both email and password.",
});

      return;
    }

    try {
      // create Firebase Auth account
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      const defaultUsername = email.split("@")[0];

      // save locally
      await AsyncStorage.setItem("uid", uid);
      await AsyncStorage.setItem("email", email);
      await AsyncStorage.setItem("username", defaultUsername);
      if (avatarUri) {
        await AsyncStorage.setItem("avatarUri", avatarUri);
      } else {
        await AsyncStorage.removeItem("avatarUri");
      }

      // create Firestore user doc
      const userRef = doc(db, "users", uid);
      await setDoc(
        userRef,
        {
          email,
          username: defaultUsername,
          avatarUri: avatarUri || "",
        },
        { merge: true }
      );

      router.replace("/splash");
  } catch (err: any) {
  console.log("SIGNUP ERROR:", err?.code, err?.message);

  let message = "Unable to create account. Please try again.";

  if (err?.code === "auth/email-already-in-use") {
    message = "This email is already registered. Please log in instead.";
  } else if (err?.code === "auth/invalid-email") {
    message = "Please enter a valid email address.";
  } else if (err?.code === "auth/weak-password") {
    message = "Password must be at least 6 characters.";
  } else if (err?.code === "auth/network-request-failed") {
    message = "Network error. Please check your connection.";
  }

  setPopup({
    title: "Signup failed",
    message,
  });
}
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  return (
    <LinearGradient
      colors={["#0A1B3D", "#142A5C"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ width: "100%" }}
      >
        <ScrollView contentContainerStyle={{ alignItems: "center" }}>
          <Text style={styles.titleGlow}>Sign Up</Text>

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#FFD700"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            selectionColor="#FFD700"
            placeholderTextColor="#FFD700"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.pickButton} onPress={pickAvatar}>
            <Text style={styles.buttonText}>Pick Avatar</Text>
          </TouchableOpacity>

          {avatarUri && <Image source={{ uri: avatarUri }} style={styles.avatar} />}

          <LinearGradient
            colors={["#FBE7A1", "#D8B24A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <TouchableOpacity
              onPress={handleSignup}
              activeOpacity={0.85}
              style={styles.innerButton}
            >
              <Text style={styles.buttonText}>Sign Up</Text>
            </TouchableOpacity>
          </LinearGradient>

          <TouchableOpacity onPress={() => router.push("/login")}>
            <Text style={styles.link}>Already have an account? Login</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
{popup && (
  <View style={styles.popupOverlay}>
    <View style={styles.popupCard}>
      <Text style={styles.popupTitle}>{popup.title}</Text>
      <Text style={styles.popupMessage}>{popup.message}</Text>
      <TouchableOpacity
        onPress={() => setPopup(null)}
        style={styles.popupButton}
      >
        <Text style={styles.popupButtonText}>OK</Text>
      </TouchableOpacity>
    </View>
  </View>
)}


    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  titleGlow: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FBE7A1",
    textAlign: "center",
    marginBottom: 24,
    textShadowColor: "#D8B24A",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
 input: {
  borderWidth: 1,
  borderColor: theme.colors.border,
  borderRadius: theme.spacing.borderRadius,
  padding: 10,
  width: "100%",
  marginBottom: 20,
    backgroundColor: "rgba(0,0,0,0.3)",  // darker box
  color: "#FFD700",                    // bright gold typing text

},

  pickButton: {
    padding: 12,
    borderRadius: theme.spacing.borderRadius,
    width: "100%",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
borderWidth: 1,
borderColor: "#FFD700",

  },
  button: {
  height: 50,                   
  borderRadius: theme.spacing.borderRadius,
  width: "100%",
  alignItems: "center",
  justifyContent: "center",      // centers text vertically
  marginBottom: 10,
  overflow: "hidden",
},

  innerButton: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  buttonText: {
    color: "#000",
    fontWeight: "bold",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 20,
  },
  link: {
    color: "#FBE7A1",
    marginTop: 16,
    textAlign: "center",
    fontWeight: "600",
  },

  popupOverlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.6)",
  justifyContent: "center",
  alignItems: "center",
},

popupCard: {
  width: "85%",
  backgroundColor: "#0A1B3D",
  borderRadius: 16,
  padding: 20,
  borderWidth: 1,
  borderColor: "#D8B24A",
},

popupTitle: {
  fontSize: 18,
  fontWeight: "800",
  color: "#FBE7A1",
  marginBottom: 8,
  textAlign: "center",
},

popupMessage: {
  fontSize: 15,
  color: "#FBE7A1",
  textAlign: "center",
  marginBottom: 16,
},

popupButton: {
  alignSelf: "center",
  paddingVertical: 10,
  paddingHorizontal: 24,
  borderRadius: 12,
  backgroundColor: "#D8B24A",
},

popupButtonText: {
  color: "#0A1B3D",
  fontWeight: "800",
  fontSize: 15,
},

});

