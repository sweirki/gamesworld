import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { auth, db } from "../firebase";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { LinearGradient } from "expo-linear-gradient";
import Purchases from "react-native-purchases";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [popup, setPopup] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setPopup({
        title: "Error",
        message: "Please enter both email and password.",
      });
      return;
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      await Purchases.logIn(uid);

      await AsyncStorage.setItem("uid", uid);
      await AsyncStorage.setItem("email", email);

      const userRef = doc(db, "users", uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        await AsyncStorage.setItem("username", data.username || "");
        await AsyncStorage.setItem("avatarUri", data.avatarUri || "");
      } else {
        await AsyncStorage.removeItem("username");
        await AsyncStorage.removeItem("avatarUri");
      }

      router.replace("/sudokuIntro");
    } catch (err: any) {
      setPopup({
        title: "Login failed",
        message: "Invalid email or password.",
      });
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setPopup({
        title: "Forgot Password",
        message: "Please enter your email first.",
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setPopup({
        title: "Email sent",
        message: "Check your inbox to reset your password.",
      });
    } catch (err: any) {
      setPopup({
        title: "Error",
        message: "Unable to reset password. Please try again.",
      });
    }
  };

  return (
    <View style={styles.root}>
      <ImageBackground
        source={require("../assets/branding/home-background.png")}
        style={styles.background}
        resizeMode="cover"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.brandWrap}>
              <Text style={styles.brandTitle}>SWEIRKI</Text>
              <Text style={styles.brandSubtitle}>SUDOKU</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to continue your daily streak and climb the ladder.</Text>

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#8CA8BE"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#8CA8BE"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <LinearGradient
                colors={["#36C8FF", "#7DE7D7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                <TouchableOpacity onPress={handleLogin} activeOpacity={0.86} style={styles.innerButton}>
                  <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>
              </LinearGradient>

              <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.75}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity onPress={() => router.push("/signup")} activeOpacity={0.75}>
                <Text style={styles.link}>Don&apos;t have an account? Sign Up</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {popup && (
          <View style={styles.popupOverlay}>
            <View style={styles.popupCard}>
              <Text style={styles.popupTitle}>{popup.title}</Text>
              <Text style={styles.popupMessage}>{popup.message}</Text>
              <TouchableOpacity onPress={() => setPopup(null)} style={styles.popupButton}>
                <Text style={styles.popupButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F7FCFF",
  },
  background: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingVertical: 44,
  },
  brandWrap: {
    alignItems: "center",
    marginBottom: 24,
  },
  brandTitle: {
    fontFamily: "BalooBold",
    color: "#2F73DF",
    fontSize: 48,
    letterSpacing: 2.5,
    lineHeight: 54,
    textShadowColor: "rgba(255,255,255,0.95)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  brandSubtitle: {
    color: "#2F73DF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 9,
    marginLeft: 9,
  },
  card: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 30,
    padding: 22,
    backgroundColor: "rgba(255,255,255,0.84)",
    borderWidth: 1,
    borderColor: "rgba(142, 216, 255, 0.46)",
    shadowColor: "#51C8FF",
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
  title: {
    fontFamily: "BalooBold",
    fontSize: 30,
    color: "#17395A",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "BalooRegular",
    color: "#637F95",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 22,
  },
  input: {
    borderWidth: 1,
    borderColor: "rgba(67, 185, 246, 0.25)",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 52,
    width: "100%",
    marginBottom: 14,
    backgroundColor: "rgba(255,255,255,0.92)",
    color: "#17395A",
    fontSize: 15,
    fontWeight: "700",
  },
  button: {
    borderRadius: 20,
    width: "100%",
    height: 54,
    marginTop: 8,
    marginBottom: 14,
    shadowColor: "#37C4FF",
    shadowOpacity: 0.38,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  innerButton: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 17,
    letterSpacing: 0.2,
  },
  forgot: {
    color: "#2C8EC4",
    marginBottom: 18,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(101, 173, 210, 0.22)",
    marginBottom: 16,
  },
  link: {
    color: "#17395A",
    textAlign: "center",
    fontWeight: "900",
    fontSize: 14,
  },
  popupOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15, 38, 58, 0.26)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 22,
  },
  popupCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(67, 185, 246, 0.35)",
  },
  popupTitle: {
    fontSize: 19,
    fontWeight: "900",
    color: "#17395A",
    marginBottom: 8,
    textAlign: "center",
  },
  popupMessage: {
    fontSize: 14,
    color: "#5D7488",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
  },
  popupButton: {
    alignSelf: "center",
    minWidth: 118,
    borderRadius: 16,
    backgroundColor: "#35BDF4",
    paddingVertical: 11,
    paddingHorizontal: 24,
  },
  popupButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
    textAlign: "center",
  },
});
