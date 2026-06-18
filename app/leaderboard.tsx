import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Image,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useRevenueCat } from "../src/hooks/useRevenueCat";
import { getLadderRank, getSeasonOutcome, getSeasonRank } from "../utils/ladder/scoreEngine";
import { archiveSeason } from "./lib/seasonArchive";
import { sweirkiColors, sweirkiFonts } from "./theme";
import AppBackButton from "./components/AppBackButton";

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
const getTodayId = () => new Date().toISOString().slice(0, 10);

const leaderboardHero = require("../assets/branding/heroes/league-hero.png");
const goldMedal = require("../assets/branding/leaderboard/rank-gold.png");
const silverMedal = require("../assets/branding/leaderboard/rank-silver.png");
const bronzeMedal = require("../assets/branding/leaderboard/rank-bronze.png");

const LEAGUE_UI: Record<string, { color: string; badge: string; bg: string }> = {
  Grandmaster: { color: "#E75F73", badge: "Crown", bg: "#FFE4EC" },
  Master: { color: "#8B73E6", badge: "Master", bg: "#EEE9FF" },
  Platinum: { color: "#58A7DB", badge: "Gem", bg: "#E1F4FF" },
  Gold: { color: "#D99B23", badge: "Gold", bg: "#FFF2C7" },
  Silver: { color: "#7C97AA", badge: "Silver", bg: "#EDF5FA" },
  Bronze: { color: "#BD7540", badge: "Bronze", bg: "#FFE8D7" },
};

function getDisplayName(item: any, user: any, userNames: Record<string, string>) {
  if (item.uid && item.uid === user?.uid) return "You";
  if (item.user) return item.user;
  if (item.uid) return userNames[item.uid] || item.username || "Anonymous";
  return item.username || "Anonymous";
}

async function loadUserNamesFromRows(rows: any[], existing: Record<string, string>) {
  const missingUids = rows.map((r) => r.uid).filter((uid) => uid && !existing[uid]);
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

function getRankArt(rank: number) {
  if (rank === 1) return goldMedal;
  if (rank === 2) return silverMedal;
  if (rank === 3) return bronzeMedal;
  return null;
}

function getRankTone(rank: number) {
  if (rank === 1) return { bg: "#F8F3E8", border: "#E7D7AE", text: "#8A6A2E" };
  if (rank === 2) return { bg: "#F2F8FC", border: "#D7E6F1", text: "#6E8495" };
  if (rank === 3) return { bg: "#F7EEE8", border: "#D9BCA6", text: "#8C6247" };
  return { bg: "#F4FAFE", border: "#DCEFF8", text: "#5A7A92" };
}

function getTabMeta(tab: Tab) {
  if (tab === "daily") return { label: "Daily", icon: "★" };
  if (tab === "season") return { label: "Season", icon: "◆" };
  return { label: "All-Time", icon: "∞" };
}

function getRowMetric(tab: Tab, item: any) {
  if (tab === "daily") {
    const errors = typeof item.errors === "number" ? `${item.errors} errors` : "-";
    const time = typeof item.time === "number" ? `${item.time}s` : "";
    return time ? `${errors} • ${time}` : errors;
  }
  return typeof item.xp === "number" ? `${item.xp} XP` : "-";
}

export default function LeaderboardScreen() {
  const router = useRouter();
  const [dailyStatus, setDailyStatus] = useState<"idle" | "played">("idle");
  const { isPremium } = useRevenueCat();

  const [tab, setTab] = useState<Tab>("season");

  useEffect(() => {
    if (!isPremium && tab === "daily") {
      setTab("season");
    }
  }, [isPremium, tab]);
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

  const listData = useMemo(() => (tab === "season" ? aroundYouRows : rows), [tab, aroundYouRows, rows]);

  const topThree = useMemo(() => rows.slice(0, 3), [rows]);

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
  }, [user?.uid]);

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
          .map((r: any, idx: number) => ({ ...r, rank: idx + 1 }));

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

  useEffect(() => {
    if (!user) return;

    const run = async () => {
      try {
        const seasonsSnap = await getDocs(collection(db, "seasonArchive"));
        const result: any[] = [];

        for (const seasonDoc of seasonsSnap.docs) {
          const userSnap = await getDoc(doc(db, "seasonArchive", seasonDoc.id, "users", user.uid));

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
  const nextRewardXP = 25000;
  const progressXP = Math.min(ladderXP, nextRewardXP);
  const progressPercent = Math.max(4, Math.min(100, Math.round((progressXP / nextRewardXP) * 100)));

  const Header = (
    <View style={styles.headerWrap}>
      <View style={styles.heroCard}>
        <View style={styles.heroTextBlock}>
          <Text style={styles.kicker}>Live Ranking</Text>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>Climb the season, defend your league, and chase the podium.</Text>
        </View>
        <Image source={leaderboardHero} style={styles.heroArt} resizeMode="contain" />
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, { backgroundColor: leagueUI.bg }]}>
          <Text style={[styles.summaryLabel, { color: leagueUI.color }]}>{leagueUI.badge}</Text>
          <Text style={styles.summaryValue}>{league}</Text>
          <Text style={styles.summaryCaption}>League</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Your Rank</Text>
          <Text style={styles.summaryValue}>{myRank ? `#${myRank}` : "-"}</Text>
          <Text style={styles.summaryCaption}>Top {percentileValue}%</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Season</Text>
          <Text style={styles.summaryValue}>{getCurrentSeasonId()}</Text>
          <Text style={styles.summaryCaption}>{seasonEndsIn} left</Text>
        </View>
      </View>

      {!isPremium && (
        <TouchableOpacity style={styles.noticeCard} activeOpacity={0.82} onPress={() => router.push("/upgrade")}>
          <LinearGradient colors={["#FFFCF3", "#F5E8C9"]} style={styles.noticeGlow}>
            <View style={styles.noticeIcon}>
              <Text style={styles.noticeIconText}>★</Text>
            </View>
            <View style={styles.noticeCopy}>
              <Text style={styles.noticeTitle}>Premium season entry</Text>
              <Text style={styles.noticeText}>Unlock the daily race, season rewards, and full ladder participation.</Text>
            </View>
            <View style={styles.noticePill}>
              <Text style={styles.noticePillText}>Go Premium</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {seasonChange && (
        <View style={[styles.noticeCard, { backgroundColor: leagueUI.bg }]}>
          <Text style={[styles.noticeTitle, { color: leagueUI.color }]}>
            {seasonChange.direction === "up" ? "Promoted" : "Demoted"} to {seasonChange.to}
          </Text>
        </View>
      )}

      <View style={styles.tabs}>
        {(["daily", "season", "all"] as Tab[]).map((t) => {
          const active = tab === t;
          const meta = getTabMeta(t);
          return (
            <TouchableOpacity
              key={t}
              onPress={() => {
                if (t === "daily" && !isPremium) {
                  router.push("/upgrade");
                  return;
                }
                setTab(t);
              }}
              style={[styles.tab, active && styles.tabActive, t === "daily" && !isPremium && styles.tabLocked]}
              activeOpacity={t === "daily" && !isPremium ? 1 : 0.75}
            >
              <View style={[styles.tabIcon, active && styles.tabIconActive]}>
                <Text style={[styles.tabIconText, active && styles.tabIconTextActive]}>{meta.icon}</Text>
              </View>
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{meta.label}{t === "daily" && !isPremium ? "  Lock" : ""}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {topThree.length > 0 && (
        <View style={styles.podiumCard}>
          <View style={styles.podiumHeader}>
            <View>
              <Text style={styles.sectionKicker}>Top challengers</Text>
              <Text style={styles.sectionTitle}>Podium</Text>
            </View>
            <View style={styles.podiumCrest}>
              <Text style={styles.podiumCrestText}>★</Text>
            </View>
          </View>

          <View style={styles.podiumStage}>
            {topThree.map((item) => {
              const tone = getRankTone(item.rank);
              const rankArt = getRankArt(item.rank);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.podiumChip,
                    item.rank === 1 && styles.podiumChipFirst,
                    { backgroundColor: tone.bg, borderColor: tone.border },
                  ]}
                >
                  <View style={[styles.podiumMedal, { backgroundColor: tone.border }]}>
                    {rankArt ? (
                      <Image source={rankArt} style={styles.podiumMedalArt} resizeMode="contain" />
                    ) : (
                      <Text style={[styles.podiumRank, { color: tone.text }]}>#{item.rank}</Text>
                    )}
                  </View>
                  <View style={styles.podiumCopy}>
                    <Text style={[styles.podiumRank, { color: tone.text }]}>#{item.rank}</Text>
                    <Text style={styles.podiumName} numberOfLines={1}>
                      {getDisplayName(item, user, userNames)}
                    </Text>
                    <Text style={styles.podiumScore} numberOfLines={1}>
                      {getRowMetric(tab, item)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <ImageBackground source={require("../assets/branding/home-background.png")} style={styles.bg} resizeMode="cover">
        <AppBackButton />
        <View style={styles.center}>
          <ActivityIndicator color={sweirkiColors.ink} />
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require("../assets/branding/home-background.png")} style={styles.bg} resizeMode="cover">
      <AppBackButton />
      <FlatList
        contentContainerStyle={styles.container}
        data={listData}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No scores yet</Text>
            <Text style={styles.emptyText}>
              {tab === "daily"
                ? dailyStatus === "played"
                  ? "Daily complete. Come back tomorrow for a fresh climb."
                  : "Be the first player on today's board."
                : tab === "season"
                ? "Play any mode to earn season XP."
                : "All-Time rankings will appear after ladder XP is earned."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const rankArt = getRankArt(item.rank);
          const rankTone = getRankTone(item.rank);
          const isYou = item.uid === user?.uid;
          return (
            <View style={[styles.row, item.rank <= 3 && { borderColor: rankTone.border, backgroundColor: rankTone.bg }, isYou && styles.rowYou]}>
              <View style={[styles.rankBubble, { backgroundColor: rankTone.bg }]}>
                {rankArt ? <Image source={rankArt} style={styles.rankArt} resizeMode="contain" /> : <Text style={[styles.rankText, { color: rankTone.text }]}>#{item.rank}</Text>}
              </View>
              <View style={styles.rowMain}>
                <Text style={[styles.rowName, isYou && styles.rowNameYou]} numberOfLines={1}>
                  {getDisplayName(item, user, userNames)}
                </Text>
                <Text style={styles.rowSub}>{isYou ? "Your position" : tab === "daily" ? "Daily run" : "Sweirki player"}</Text>
              </View>
              <Text style={styles.rowMetric}>{getRowMetric(tab, item)}</Text>
            </View>
          );
        }}
        ListFooterComponent={
          <View style={styles.footerWrap}>
            {seasonArchive.length > 0 && (
              <View style={styles.archiveCard}>
                <Text style={styles.sectionTitle}>Past Seasons</Text>
                {seasonArchive.slice(0, 4).map((s) => {
                  const ui = LEAGUE_UI[s.league] ?? LEAGUE_UI.Bronze;
                  return (
                    <View key={s.season} style={styles.archiveRow}>
                      <Text style={styles.archiveSeason}>Season {s.season}</Text>
                      <Text style={[styles.archiveLeague, { color: ui.color }]}>
                        {s.league ?? "Bronze"} • #{s.rank ?? "-"}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={styles.footerCard}>
              <View style={styles.rewardIcon}>
                <Text style={styles.rewardIconText}>★</Text>
              </View>
              <View style={styles.rewardMain}>
                <Text style={styles.rewardTitle}>Season Progress</Text>
                <Text style={styles.rewardNote}>Earn XP and climb the ranks.</Text>
                <View style={styles.rewardTrack}>
                  <View style={[styles.rewardFill, { width: `${progressPercent}%` }]} />
                </View>
                <Text style={styles.rewardXP}>{progressXP} / {nextRewardXP} XP</Text>
              </View>
              <View style={styles.rewardNext}>
                <Text style={styles.rewardNextLabel}>Next reward</Text>
                <Text style={styles.rewardNextValue}>Silver Chest</Text>
              </View>
            </View>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: "#EAF7FF" },
  container: { paddingHorizontal: 18, paddingTop: 72, paddingBottom: 38 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  headerWrap: { gap: 13, marginBottom: 10 },
  heroCard: {
    minHeight: 176,
    borderRadius: 34,
    padding: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1.2,
    borderColor: "rgba(142,210,242,0.62)",
    shadowColor: "#58AEE4",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroTextBlock: { width: "62%", zIndex: 2 },
  kicker: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 12,
    color: "#1E9EDE",
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 5,
    fontFamily: sweirkiFonts.bold,
    fontSize: 32,
    lineHeight: 34,
    color: "#183F65",
  },
  subtitle: {
    marginTop: 7,
    fontFamily: sweirkiFonts.regular,
    fontSize: 13.5,
    lineHeight: 18,
    color: "#6E8EA6",
  },
  heroArt: {
    position: "absolute",
    right: -22,
    bottom: -20,
    width: 190,
    height: 190,
  },

  summaryGrid: { flexDirection: "row", gap: 8 },
  summaryCard: {
    flex: 1,
    minHeight: 84,
    borderRadius: 24,
    paddingVertical: 13,
    paddingHorizontal: 11,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(142,210,242,0.35)",
    shadowColor: "#75ACD4",
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  summaryLabel: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 10,
    color: "#43A8DE",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  summaryValue: {
    marginTop: 4,
    fontFamily: sweirkiFonts.bold,
    fontSize: 18,
    lineHeight: 22,
    color: "#173E63",
  },
  summaryCaption: {
    marginTop: 2,
    fontFamily: sweirkiFonts.regular,
    fontSize: 11,
    color: "#7898AF",
  },

  noticeCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E7D7AE",
    shadowColor: "#D5B96F",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  noticeGlow: {
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  noticeIcon: {
    width: 34,
    height: 34,
    borderRadius: 13,
    backgroundColor: "#E7D7AE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.78)",
  },
  noticeIconText: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 15,
    color: "#FFFFFF",
  },
  noticeCopy: { flex: 1, minWidth: 0 },
  noticeTitle: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 12,
    color: "#8A6A2E",
  },
  noticeText: {
    marginTop: 1,
    fontFamily: sweirkiFonts.regular,
    fontSize: 10.5,
    lineHeight: 13,
    color: "#756648",
  },
  noticePill: {
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.62)",
    borderWidth: 1,
    borderColor: "#E7D7AE",
    marginLeft: 7,
  },
  noticePillText: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 9.8,
    color: "#8A6A2E",
  },

  tabs: {
    flexDirection: "row",
    padding: 5,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(142,210,242,0.32)",
    gap: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingVertical: 9,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: "#55B7E9",
    shadowColor: "#43A8DE",
    shadowOpacity: 0.32,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  tabLocked: { opacity: 0.56 },
  tabIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF7FF",
    marginRight: 6,
  },
  tabIconActive: { backgroundColor: "rgba(255,255,255,0.26)" },
  tabIconText: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 10.5,
    color: "#62849B",
  },
  tabIconTextActive: { color: "#FFFFFF" },
  tabText: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 12,
    color: "#607F98",
  },
  tabTextActive: { color: "#FFFFFF" },

  podiumCard: {
    minHeight: 176,
    borderRadius: 30,
    padding: 15,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(142,210,242,0.34)",
    shadowColor: "#75ACD4",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 5,
  },
  podiumHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionKicker: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 10.5,
    color: "#58A7DB",
    letterSpacing: 1.7,
    textTransform: "uppercase",
  },
  sectionTitle: {
    marginTop: 2,
    fontFamily: sweirkiFonts.bold,
    fontSize: 17,
    lineHeight: 21,
    color: "#183F65",
  },
  podiumCrest: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F3E8",
    borderWidth: 1,
    borderColor: "#E7D7AE",
  },
  podiumCrestText: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 18,
    color: "#8A6A2E",
  },
  podiumStage: { gap: 7 },
  podiumChip: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1.2,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  podiumChipFirst: {
    minHeight: 64,
    shadowColor: "#D5B96F",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  podiumMedal: {
    width: 40,
    height: 40,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  podiumMedalArt: { width: 34, height: 34 },
  podiumCopy: { flex: 1, minWidth: 0 },
  podiumRank: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 10,
    textTransform: "uppercase",
  },
  podiumName: {
    marginTop: 1,
    fontFamily: sweirkiFonts.bold,
    fontSize: 13.5,
    color: "#214B6B",
  },
  podiumScore: {
    marginTop: -1,
    fontFamily: sweirkiFonts.regular,
    fontSize: 10.5,
    color: "#66869B",
  },

  emptyCard: {
    marginTop: 8,
    borderRadius: 26,
    padding: 20,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(142,210,242,0.32)",
    alignItems: "center",
  },
  emptyTitle: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 18,
    color: "#183F65",
  },
  emptyText: {
    marginTop: 5,
    fontFamily: sweirkiFonts.regular,
    fontSize: 12.5,
    lineHeight: 17,
    color: "#6D879A",
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 66,
    marginTop: 8,
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.82)",
    shadowColor: "#75ACD4",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  rowYou: {
    backgroundColor: "#F8F3E8",
    borderWidth: 1.5,
    borderColor: "#E7D7AE",
    shadowColor: "#D5B96F",
    shadowOpacity: 0.16,
  },
  rankBubble: {
    width: 44,
    height: 44,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EFF8FF",
    marginRight: 11,
  },
  rankArt: { width: 39, height: 39 },
  rankText: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 13,
    color: "#5A7A92",
  },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 14,
    lineHeight: 19,
    color: "#214B6B",
  },
  rowNameYou: { color: "#1689C7" },
  rowSub: {
    marginTop: 1,
    fontFamily: sweirkiFonts.regular,
    fontSize: 11,
    color: "#7B93A6",
  },
  rowMetric: {
    marginLeft: 7,
    fontFamily: sweirkiFonts.bold,
    fontSize: 13,
    color: "#326D99",
  },

  footerWrap: { marginTop: 13, gap: 11 },
  archiveCard: {
    borderRadius: 26,
    padding: 15,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(142,210,242,0.3)",
  },
  archiveRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  archiveSeason: {
    fontFamily: sweirkiFonts.regular,
    fontSize: 12,
    color: "#668298",
  },
  archiveLeague: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 12,
  },
  footerCard: {
    borderRadius: 24,
    padding: 13,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(142,210,242,0.32)",
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#75ACD4",
    shadowOpacity: 0.11,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  rewardIcon: {
    width: 52,
    height: 52,
    borderRadius: 19,
    backgroundColor: "#E7F6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rewardIconText: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 25,
    color: "#55B7E9",
  },
  rewardMain: { flex: 1, minWidth: 0 },
  rewardTitle: {
    fontFamily: sweirkiFonts.bold,
    fontSize: 14.5,
    color: "#183F65",
  },
  rewardNote: {
    fontFamily: sweirkiFonts.regular,
    fontSize: 10.5,
    color: "#6D879A",
  },
  rewardTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#DBECF7",
    overflow: "hidden",
    marginTop: 7,
  },
  rewardFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#55B7E9",
  },
  rewardXP: {
    marginTop: 4,
    fontFamily: sweirkiFonts.bold,
    fontSize: 10.5,
    color: "#397FAE",
  },
  rewardNext: {
    alignItems: "flex-end",
    maxWidth: 92,
    marginLeft: 10,
  },
  rewardNextLabel: {
    fontFamily: sweirkiFonts.regular,
    fontSize: 10,
    color: "#7B93A6",
    textTransform: "uppercase",
  },
  rewardNextValue: {
    marginTop: 2,
    fontFamily: sweirkiFonts.bold,
    fontSize: 12,
    color: "#55B7E9",
    textAlign: "right",
  },
});
