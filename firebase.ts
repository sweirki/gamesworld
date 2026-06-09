import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import type { Auth } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} = require("firebase/auth");

const firebaseConfig = {
  apiKey: "AIzaSyCRnjKjiSuzNR9Ds4nbPAu5DOXzu2J9CRM",
  authDomain: "gamesworld-8b301.firebaseapp.com",
  projectId: "gamesworld-8b301",
  storageBucket: "gamesworld-8b301.appspot.com",
  messagingSenderId: "917460206748",
  appId: "1:917460206748:web:d7fbb044ba5bb7437ad959",
  measurementId: "G-ETXDT471WE",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let auth: Auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  auth = getAuth(app);
}

const db = getFirestore(app);

export { app, auth, db };
