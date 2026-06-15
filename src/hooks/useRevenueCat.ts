import { useEffect, useMemo, useRef, useState } from "react";
import Purchases from "react-native-purchases";
import type {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
} from "react-native-purchases";
import { auth } from "../../firebase";
import { ECONOMY_PRODUCTS } from "../economy/economyEngine";

export function useRevenueCat() {
  const refreshingRef = useRef(false);

  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOfferings | null>(null);
  const [lifetimePackage, setLifetimePackage] = useState<PurchasesPackage | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [hasSeasonPassEntitlement, setHasSeasonPassEntitlement] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const computeIsPremium = (info: CustomerInfo | null) => {
    return Boolean(info?.entitlements?.active?.premium);
  };

  const computeSeasonPass = (info: CustomerInfo | null) => {
    return Boolean(info?.entitlements?.active?.season_pass || info?.entitlements?.active?.logic_wars_pass);
  };

  const refreshCustomerInfo = async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;

    try {
      setLoading(true);
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
      setIsPremium(computeIsPremium(info));
      setHasSeasonPassEntitlement(computeSeasonPass(info));
    } catch {
      setCustomerInfo(null);
      setIsPremium(false);
      setHasSeasonPassEntitlement(false);
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
        const allPackages = Object.values(offs?.all ?? {}).flatMap((offering: any) => offering?.availablePackages ?? []);
        const premiumPkg =
          allPackages.find((pkg: PurchasesPackage) => pkg?.product?.identifier === ECONOMY_PRODUCTS.premiumLifetime) ??
          offs?.current?.availablePackages?.[0] ??
          offs?.all?.default?.availablePackages?.[0] ??
          null;

        if (!alive) return;

        setOfferings(offs);
        setLifetimePackage(premiumPkg);

        await refreshCustomerInfo();
      } catch (e: any) {
        if (!alive) return;
        setOfferings(null);
        setLifetimePackage(null);
        setCustomerInfo(null);
        setIsPremium(false);
        setHasSeasonPassEntitlement(false);
        setLoading(false);
        setInitError(e?.message ?? String(e));
      }
    };

    init();

    Purchases.addCustomerInfoUpdateListener((info) => {
      if (!alive) return;
      setCustomerInfo(info);
      setIsPremium(computeIsPremium(info));
      setHasSeasonPassEntitlement(computeSeasonPass(info));
      setLoading(false);
    });

    return () => {
      alive = false;
    };
  }, []);

  const allPackages = useMemo(() => {
    return Object.values(offerings?.all ?? {}).flatMap((offering: any) => offering?.availablePackages ?? []) as PurchasesPackage[];
  }, [offerings]);

  const getPackageByProductId = (productId: string) => {
    return allPackages.find((pkg) => pkg?.product?.identifier === productId) ?? null;
  };

  const resolvedPackage =
    lifetimePackage ??
    getPackageByProductId(ECONOMY_PRODUCTS.premiumLifetime) ??
    offerings?.all?.default?.availablePackages?.[0] ??
    null;

  return {
    isPremium,
    hasSeasonPassEntitlement,
    loading,
    customerInfo,
    offerings,
    allPackages,
    lifetimePackage,
    resolvedPackage,
    initError,
    getPackageByProductId,
    refresh: refreshCustomerInfo,
  };
}
