import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases from "react-native-purchases";

const KEY = "adFree";

export async function setAdFree(value: boolean) {
  try {
    await AsyncStorage.setItem(KEY, value ? "1" : "0");
  } catch (err) {
    console.error("setAdFree error:", err);
  }
}

export async function isAdFree(): Promise<boolean> {
  try {
    const info = await Purchases.getCustomerInfo();
    if (info?.entitlements?.active?.premium) {
      await AsyncStorage.setItem(KEY, "1");
      return true;
    }
  } catch {}

  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === "1";
  } catch (err) {
    console.error("isAdFree error:", err);
    return false;
  }
}
