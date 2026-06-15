import { useEffect } from "react";
import { AppState, Platform } from "react-native";
import Constants from "expo-constants";
import { usePathname, useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";

type ReleaseConfig = {
  forceUpdate?: boolean;
  minAndroidVersionCode?: number;
  minIosBuildNumber?: number;
};

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(/[^0-9]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getAndroidBuildNumber() {
  return toNumber(
    Constants.nativeBuildVersion ?? Constants.expoConfig?.android?.versionCode,
    0
  );
}

function getIosBuildNumber() {
  return toNumber(
    Constants.nativeBuildVersion ?? Constants.expoConfig?.ios?.buildNumber,
    0
  );
}

function getCurrentBuildNumber() {
  if (Platform.OS === "ios") return getIosBuildNumber();
  return getAndroidBuildNumber();
}

function getRequiredBuild(config: ReleaseConfig) {
  if (Platform.OS === "ios") return toNumber(config.minIosBuildNumber, 0);
  return toNumber(config.minAndroidVersionCode, 0);
}

export default function ForceUpdateGate() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const checkReleaseConfig = async () => {
      try {
        const snap = await getDoc(doc(db, "appConfig", "release"));
        if (!mounted) return;

        if (!snap.exists()) {
          console.log("ForceUpdateGate: appConfig/release not found");
          return;
        }

        const config = snap.data() as ReleaseConfig;
        const requiredBuild = getRequiredBuild(config);
        const currentBuild = getCurrentBuildNumber();
        const shouldBlock =
          Boolean(config.forceUpdate) && requiredBuild > 0 && currentBuild < requiredBuild;

        console.log("ForceUpdateGate:", {
          platform: Platform.OS,
          forceUpdate: Boolean(config.forceUpdate),
          currentBuild,
          requiredBuild,
          shouldBlock,
          pathname,
        });

        if (shouldBlock && pathname !== "/forceUpdate") {
          setTimeout(() => {
            router.replace("/forceUpdate");
          }, 50);
        }
      } catch (error) {
        console.warn("Force update check failed:", error);
      }
    };

    checkReleaseConfig();

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkReleaseConfig();
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, [pathname, router]);

  return null;
}
