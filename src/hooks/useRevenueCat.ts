import { useEffect, useRef, useState } from "react";
import Purchases from "react-native-purchases";
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import { auth } from "../../firebase";

export function useRevenueCat() {
  const refreshingRef = useRef(false);

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [lifetimePackage, setLifetimePackage] = useState<PurchasesPackage | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const computeIsPremium = (info: CustomerInfo | null) => {
    return Boolean(info?.entitlements?.active?.premium);
  };

  const refreshCustomerInfo = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;

    try {
      setLoading(true);
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      setIsPremium(computeIsPremium(info));
    } catch {
      setCustomerInfo(null);
      setIsPremium(false);
    } finally {
      setLoading(false);
      refreshingRef.current = false;
    }
  };

  useEffect(() => {
    let alive = true;

    const init = async () => {
      setInitError(null);

      try {
      
        const user = auth.currentUser;
        if (user?.uid) {
          await Purchases.logIn(user.uid);
        }

        const offs = await Purchases.getOfferings();

        const pkg =
          offs?.current?.availablePackages?.[0] ??
          offs?.all?.default?.availablePackages?.[0] ??
          null;

        if (!alive) return;

        setOfferings(offs);
        setLifetimePackage(pkg);

        await refreshCustomerInfo();
      } catch (e: any) {
        if (!alive) return;
        setOfferings(null);
        setLifetimePackage(null);
        setCustomerInfo(null);
        setIsPremium(false);
        setLoading(false);
        setInitError(e?.message ?? String(e));
      }
    };

    init();

    Purchases.addCustomerInfoUpdateListener((info) => {
      if (!alive) return;
      setCustomerInfo(info);
      setIsPremium(computeIsPremium(info));
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  const resolvedPackage =
    lifetimePackage ??
    offerings?.all?.default?.availablePackages?.[0] ??
    null;

  return {
    isPremium,
    loading,
    customerInfo,
    offerings,
    lifetimePackage,
    resolvedPackage,
    initError,
    refresh: refreshCustomerInfo,
  };
}