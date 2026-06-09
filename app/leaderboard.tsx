import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ImageBackground,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { getColors } from "../theme";
import { useRevenueCat } from "../src/hooks/useRevenueCat";
import { getLadderRank, getSeasonOutcome, getSeasonRank } from "../utils/ladder/scoreEngine";
import { archiveSeason } from "./lib/seasonArchive";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";

type Tab = "daily" | "season" | "all";

const SEASON_LENGTH_DAYS = 28;
const getTodayId = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

const LEAGUE_UI: Record<string, { color: string; badge: string }> = {
  Grandmaster: { color: "#E74C3C", badge: "👑" },
  Master: { color: "#9B59B6", badge: "🔥" },
  Platinum: { color: "#5DADE2", badge: "💎" },
  Gold: { color: "#F1C40F", badge: "🥇" },
  Silver: { color: "#BDC3C7", badge: "🥈" },
  Bronze: { color: "#CD7F32", badge: "🥉" },
};

function getDisplayName(item: any, user: any, userNames: Record<string, string>) {
  if (item.uid && item.uid === user?.uid) return "You";

  // Daily rows store a username directly
  if (item.user) return item.user;

  // Season / All-Time rows can resolve by uid
  if (item.uid) return userNames[item.uid] || item.username || "Anonymous";

  return item.username || "Anonymous";
}

async function loadUserNamesFromRows(rows: any[], existing: Record<string, string>) {
  const missingUids = rows
    .map((r) => r.uid)
    .filter((uid) => uid && !existing[uid]);

  if (!missingUids.length) return existing;

  const updates = { ...existing };
  await Promise.all(
    missingUids.map(async (uid) => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          const data = snap.data();
          updates[uid] = data.displayName || data.username || data.name || "Anonymous";
        } else {
          updates[uid] = "Anonymous";
        }
      } catch {
        updates[uid] = "Anonymous";
      }
    })
  );

  return updates;
}

function getCurrentSeasonId() {
  const start = new Date("2025-01-01").getTime();
  const diffDays = Math.floor((Date.now() - start) / 86400000);
  return Math.floor(diffDays / SEASON_LENGTH_DAYS);
}

function getSeasonDaysLeftText() {
  const start = new Date("2025-01-01").getTime();
  const diffDays = Math.floor((Date.now() - start) / 86400000);
  const dayInSeason = diffDays % SEASON_LENGTH_DAYS;
  return `${Math.max(0, SEASON_LENGTH_DAYS - dayInSeason)} days`;
}

export default function LeaderboardScreen() {
  const [dailyStatus, setDailyStatus] = useState<"idle" | "played">("idle");
  const { isPremium } = useRevenueCat();

  const themeColors = getColors() as any;
  const bgDark = "#0E1A2B";
  const bgMid = "#10263D";

  const [tab, setTab] = useState<Tab>("season");
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [percentileValue, setPercentileValue] = useState(50);
  const [myRank, setMyRank] = useState(0);

  const [rows, setRows] = useState<any[]>([]);
  const [ladderXP, setLadderXP] = useState(0);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [seasonArchive, setSeasonArchive] = useState<any[]>([]);
  const [seasonChange, setSeasonChange] = useState<any>(null);

  useEffect(() => setRows([]), [tab]);

  const aroundYouRows = useMemo(() => {
    if (tab !== "season") return rows;
    const index = rows.findIndex((r) => r.uid === user?.uid);
    if (index === -1) return rows;
    return rows.slice(Math.max(0, index - 2), Math.min(rows.length, index + 3));
  }, [rows, tab, user]);

  const listData = useMemo(() => {
    return tab === "season" ? aroundYouRows : rows;
  }, [tab, aroundYouRows, rows]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(u);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) setProfile(snap.data());

        const ladderSnap = await getDoc(doc(db, "ladderUsers", u.uid));
        if (ladderSnap.exists()) {
          const ladderData = ladderSnap.data();
          setLadderXP(typeof ladderData.xp === "number" ? ladderData.xp : 0);
          setProfile((prev: any) => ({ ...(prev || {}), ...ladderData }));
        } else {
          setLadderXP(0);
        }
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, []);

  // Season rollover archive (kept as you already had it)
  useEffect(() => {
    const checkSeasonChange = async () => {
      try {
        const current = getCurrentSeasonId();
        const stored = await AsyncStorage.getItem("lastSeenSeasonId");

        if (stored === null) {
          await AsyncStorage.setItem("lastSeenSeasonId", String(current));
          return;
        }

        const last = Number(stored);

        if (last !== current) {
          const archived = await AsyncStorage.getItem(`seasonArchived:${last}`);

          if (!archived) {
            try {
              const q = query(
                collection(db, "seasonUsers"),
                where("seasonId", "==", last),
                orderBy("xp", "desc")
              );

              const snap = await getDocs(q);

              const rows = snap.docs.map((d, idx) => {
                const data = d.data();
                const xp = data.xp ?? 0;
                const seasonRank = getSeasonRank(xp);
                const outcome = getSeasonOutcome(xp, seasonRank as any);

                return {
                  id: d.id,
                  ...data,
                  rank: idx + 1,
                  seasonRank,
                  outcome,
                };
              });

              await archiveSeason(last, rows);

              const me = rows.find((r: any) => r.uid === user?.uid || r.id === user?.uid);
              if (me && me.outcome !== "stay") {
                setSeasonChange({
                  direction: me.outcome === "promote" ? "up" : "down",
                  to: me.seasonRank,
                });
              }

              await AsyncStorage.setItem(`seasonArchived:${last}`, "true");
            } catch (e) {
              console.warn("Season archive failed", e);
            }
          }

          await AsyncStorage.setItem("lastSeasonEnded", String(last));
          await AsyncStorage.setItem("lastSeenSeasonId", String(current));
        }
      } catch {}
    };

    checkSeasonChange();
  }, []);

  // ✅ SEASON TAB
  useEffect(() => {
    if (!user || tab !== "season") return;

    const run = async () => {
      try {
        const seasonId = getCurrentSeasonId();

        const q = query(
          collection(db, "seasonUsers"),
          where("seasonId", "==", seasonId),
          orderBy("xp", "desc")
        );

        const snap = await getDocs(q);

        const base = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const data = base
          .sort((a: any, b: any) => (b.xp ?? 0) - (a.xp ?? 0))
          .map((r: any, idx: number) => ({
            ...r,
            rank: idx + 1,
          }));

        if (!data.length) {
          setRows([]);
          setPercentileValue(50);
          setMyRank(0);
          return;
        }

        const myIndex = data.findIndex((r) => r.uid === user.uid);
        const rank = myIndex + 1;
        const percentile = Math.ceil((rank / data.length) * 100);

        setRows(data);
        setMyRank(rank);
        setPercentileValue(percentile);
        setUserNames(await loadUserNamesFromRows(data, userNames));
      } catch (err) {
        console.warn("Leaderboard season load failed", err);
        setRows([]);
        setPercentileValue(50);
        setMyRank(0);
      }
    };

    run();
  }, [user, tab]);

  // ✅ DAILY TAB: reads dailyLeaderboard/{today}.scores[]
  useEffect(() => {
    if (!user || tab !== "daily") return;

    const run = async () => {
      try {
        const today = getTodayId();
        const played = await AsyncStorage.getItem(`dailyPlayed:${user.uid}`);

        setDailyStatus(!isPremium && played === today ? "played" : "idle");

        const dailyRef = doc(db, "dailyLeaderboard", today);
        const snap = await getDoc(dailyRef);

        const scores = snap.exists() ? snap.data().scores || [] : [];

        const sorted = [...scores].sort((a: any, b: any) => {
          if ((a.errors ?? 999) !== (b.errors ?? 999)) return (a.errors ?? 999) - (b.errors ?? 999);
          return (a.time ?? 999999) - (b.time ?? 999999);
        });

        const data = sorted.map((r: any, idx: number) => ({
          id: `${today}_${r.uid || r.user || idx}`,
          ...r,
          rank: idx + 1,
        }));

        setRows(data);
        setUserNames(await loadUserNamesFromRows(data, userNames));
      } catch (err) {
        console.warn("Daily leaderboard load failed", err);
        setRows([]);
      }
    };

    run();
  }, [user, tab, isPremium]);

  // ✅ ALL-TIME TAB: reads ladderUsers (lifetime XP)
  useEffect(() => {
    if (!user || tab !== "all") return;

    const run = async () => {
      try {
        const q = query(collection(db, "ladderUsers"), orderBy("xp", "desc"));
        const snap = await getDocs(q);

        const data = snap.docs.map((d, idx) => {
          const v: any = d.data();
          return {
            id: d.id,
            ...v,
            uid: v.uid || d.id,
            rank: idx + 1,
          };
        });

        setRows(data);
        setUserNames(await loadUserNamesFromRows(data, {}));
      } catch (err) {
        console.warn("Daily leaderboard load failed", err);
        setRows([]);
      }
    };

    run();
  }, [user, tab]);

  // Past seasons load (unchanged)
  useEffect(() => {
    if (!user) return;

    const run = async () => {
      try {
        const seasonsSnap = await getDocs(collection(db, "seasonArchive"));
        const result: any[] = [];

        for (const seasonDoc of seasonsSnap.docs) {
          const userSnap = await getDoc(
            doc(db, "seasonArchive", seasonDoc.id, "users", user.uid)
          );

          if (userSnap.exists()) {
            const data = userSnap.data();
            result.push({
              season: Number(seasonDoc.id),
              league: data.rank,
              rank: data.rank ?? null,
            });
          }
        }

        result.sort((a, b) => b.season - a.season);
        setSeasonArchive(result);
      } catch (err) {
        console.warn("Season archive load failed", err);
      }
    };

    run();
  }, [user]);

  const league = profile?.seasonLeague ?? profile?.rank ?? getLadderRank(ladderXP || 0) ?? "Bronze";
  const leagueUI = LEAGUE_UI[league] ?? LEAGUE_UI.Bronze;
  const seasonEndsIn = getSeasonDaysLeftText();

  return (
    <ImageBackground source={require("../assets/bg.png")} style={styles.bg}>
      <LinearGradient colors={[bgDark, bgMid]} style={styles.container}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : (
          <>
            <Text style={styles.seasonText}>
              Season {getCurrentSeasonId()} • {seasonEndsIn} left
            </Text>

            {!isPremium && (
              <Text style={styles.premiumNote}>
                Premium required to participate • You can still view rankings
              </Text>
            )}

            {seasonChange && (
              <Text style={[styles.seasonChange, { color: leagueUI.color }]}>
                {seasonChange.direction === "up" ? "⬆️ Promoted to " : "⬇️ Demoted to "}
                {seasonChange.to}
              </Text>
            )}

            <View style={[styles.leagueCard, { borderColor: leagueUI.color }]}>
              <Text style={[styles.leagueTitle, { color: leagueUI.color }]}>
                {leagueUI.badge} {league} League
              </Text>
            </View>

            <View style={styles.rankBlock}>
              <Text style={styles.rankText}>{myRank ? `#${myRank}` : "—"}</Text>
              <Text style={styles.percentile}>Top {percentileValue}%</Text>
            </View>

            <Text style={styles.nextStep}>
              {tab === "daily"
                ? "A clean Daily can move you closer to promotion"
                : tab === "season"
                ? "Consistent performance matters over the season"
                : "All-Time ranks never reset"}
            </Text>

            <View style={styles.tabs}>
              {(["daily", "season", "all"] as Tab[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setTab(t)}
                  style={[
                    styles.tab,
                    tab === t && (t === "season" ? styles.tabSeason : styles.tabActive),
                  ]}
                >
                  <Text
                    style={[
                      styles.tabText,
                      tab === t && styles.tabTextDark,
                    ]}
                  >
                    {t === "daily" ? "Daily" : t === "season" ? "Season" : "All-Time"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <FlatList
              style={styles.list}
              data={listData}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                tab === "daily" ? (
                  <Text style={styles.empty}>
                    {dailyStatus === "played"
                      ? "You’ve completed today’s Daily. Come back tomorrow."
                      : "No daily runs yet. Be the first today."}
                  </Text>
                ) : (
                  <Text style={styles.empty}>
                    {tab === "season"
                      ? "No season rankings yet. Play any mode to earn XP."
                      : "No All-Time rankings yet."}
                  </Text>
                )
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.row,
                    item.uid === user?.uid && {
                      borderLeftColor: leagueUI.color,
                      borderLeftWidth: 3,
                      backgroundColor: "rgba(255,215,120,0.04)",
                      paddingLeft: 8,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.rowName,
                      item.uid === user?.uid && styles.rowNameYou,
                    ]}
                  >
                    #{item.rank} {getDisplayName(item, user, userNames)}
                  </Text>

                  {tab === "daily" && (
                    <Text style={styles.rowSub}>
                      {typeof item.errors === "number" ? `${item.errors} errors` : "—"}
                      {typeof item.time === "number" ? ` • ${item.time}s` : ""}
                    </Text>
                  )}

                  {tab === "season" && (
                    <Text style={styles.rowSub}>
                      {typeof item.xp === "number" ? `${item.xp} XP` : "—"}
                    </Text>
                  )}

                  {tab === "all" && (
                    <Text style={styles.rowSub}>
                      {typeof item.xp === "number" ? `${item.xp} XP` : "—"}
                    </Text>
                  )}
                </View>
              )}
              ListFooterComponent={
                <>
                  <View style={styles.archive}>
                    <Text style={styles.archiveTitle}>Past Seasons</Text>
                    {seasonArchive.map((s) => {
                      const ui = LEAGUE_UI[s.league] ?? LEAGUE_UI.Bronze;
                      return (
                        <View key={s.season} style={styles.archiveRow}>
                          <Text style={styles.archiveSeason}>Season {s.season}</Text>
                          <Text style={[styles.archiveLeague, { color: ui.color }]}>
                            {ui.badge} {s.league ?? "Bronze"} • #{s.rank ?? "—"}
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.footer}>
                    <Text style={styles.xp}>XP: {ladderXP}</Text>
                    <Text style={styles.footerNote}>
                      Your progress continues beyond the Ladder
                    </Text>
                  </View>
                </>
              }
            />

            {/* DEV RESET BUTTON (optional, keep if you want it here) */}
           {/*  {__DEV__ && (
              <TouchableOpacity style={styles.devReset} onPress={async () => {
                if (!user) return;
                await AsyncStorage.multiRemove([
                  `dailyPlayed:${user.uid}`,
                  `dailyStreak:${user.uid}`,
                  `lastDailyDate:${user.uid}`,
                  `weeklyGames:${user.uid}`,
                ]);
              }}>
                <Text style={styles.devResetText}>DEV RESET DAILY</Text>
              </TouchableOpacity>
            )} */}
          </>
        )}
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  container: { flex: 1, padding: 16, paddingTop: 66 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  seasonText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },

  premiumNote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255,255,255,0.6)",
  },

  seasonChange: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: "700",
  },

  leagueCard: {
    marginTop: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: "#18140F",
    borderWidth: 1.5,
  },

  leagueTitle: {
    fontSize: 13,
    fontWeight: "700",
  },

  rankBlock: { marginTop: 16 },

  rankText: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.45)",
  },

  percentile: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },

  nextStep: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    color: "rgba(255,255,255,0.55)",
  },

  list: { marginTop: 16 },

  empty: {
    marginTop: 40,
    fontSize: 11,
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
  },

  row: {
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },

  rowName: {
    fontSize: 11,
    lineHeight: 16,
    fontFamily: "BalooRegular",
    color: "#F5F5F5",
  },

  rowNameYou: {
    fontFamily: "BalooBold",
  },

  rowSub: {
    fontSize: 10,
    lineHeight: 14,
    color: "rgba(255,255,255,0.55)",
  },

  archive: { marginTop: 24 },

  archiveTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 14,
    color: "#F5F5F5",
  },

  archiveRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(255,255,255,0.12)",
  },

  archiveSeason: {
    color: "rgba(255,255,255,0.7)",
  },

  archiveLeague: {
    fontWeight: "600",
  },

  footer: { marginTop: 16 },

  xp: {
    color: "rgba(255,255,255,0.6)",
  },

  footerNote: {
    fontSize: 11,
    lineHeight: 15,
    color: "rgba(255,255,255,0.45)",
  },

  tabs: {
    flexDirection: "row",
    marginTop: 20,
  },

  tab: {
    marginRight: 10,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#2A2A2A",
  },

  tabActive: {
    backgroundColor: "#E0E0E0",
  },

  tabSeason: {
    backgroundColor: "#FFD36A",
  },

  tabText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#FFF",
  },

  tabTextDark: {
    fontSize: 11,
    fontWeight: "600",
    color: "#000",
  },

  devReset: {
    position: "absolute",
    bottom: 40,
    right: 20,
    backgroundColor: "red",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },

  devResetText: { color: "#fff", fontWeight: "800" },
});
