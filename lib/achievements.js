"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlockAchievements = unlockAchievements;
exports.getAchievements = getAchievements;
var AsyncStorage = require("@react-native-async-storage/async-storage");
var VALID_IDS = [
  "points_collector",
  "speed_demon",
  "first_win",
  "flawless",
  "no_hint_master",
  "streak_keeper",
  "iron_stomach",
  "hyper_samurai",
  "killer_assassin",
  "x_master",
];
function normalize(list) {
  if (!Array.isArray(list)) return [];
  return Array.from(new Set(list.filter(function (item) { return typeof item === "string" && VALID_IDS.includes(item); })));
}
async function unlockAchievements(email, stats) {
  var list = [];
  var key = "achievements:" + email;
  var stored = await AsyncStorage.default.getItem(key);
  if (stored) list = normalize(JSON.parse(stored));
  var next = new Set(list);
  if (((stats === null || stats === void 0 ? void 0 : stats.completed) || 0) >= 1) next.add("first_win");
  if ((stats === null || stats === void 0 ? void 0 : stats.bestTime) && stats.bestTime < 300) next.add("speed_demon");
  if (((stats === null || stats === void 0 ? void 0 : stats.completed) || 0) > 0 && ((stats === null || stats === void 0 ? void 0 : stats.hints) || 0) === 0) next.add("no_hint_master");
  if (((stats === null || stats === void 0 ? void 0 : stats.completed) || 0) >= 3) next.add("streak_keeper");
  if (((stats === null || stats === void 0 ? void 0 : stats.errors) || 1) === 0) {
    next.add("flawless");
    next.add("iron_stomach");
  }
  var updated = Array.from(next);
  await AsyncStorage.default.setItem(key, JSON.stringify(updated));
  return updated;
}
async function getAchievements(email) {
  var key = "achievements:" + email;
  var stored = await AsyncStorage.default.getItem(key);
  return stored ? normalize(JSON.parse(stored)) : [];
}
