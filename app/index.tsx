import { Redirect } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { auth } from "../firebase";

export default function Index() {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setSignedIn(!!user);
      setReady(true);
    });

    return unsub;
  }, []);

  if (!ready) return null;

  return signedIn ? <Redirect href="/splash" /> : <Redirect href="/login" />;
}
