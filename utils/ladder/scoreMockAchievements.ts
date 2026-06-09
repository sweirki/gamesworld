interface PlayerStats {
  username: string;
  wins: number;
  fastestTimes: { easy?: number; medium?: number; hard?: number };
  streak: number;
}

function getAchievements(stats: PlayerStats): string[] {
  const badges: string[] = [];
  if (stats.wins >= 1) badges.push("First Win");
  if (stats.wins >= 10) badges.push("10 Wins");
  if (stats.wins >= 50) badges.push("50 Wins");
  if (stats.wins >= 100) badges.push("100 Wins");
  if (stats.fastestTimes.easy && stats.fastestTimes.easy < 300) badges.push("Fast Finish (Easy <5min)");
  if (stats.fastestTimes.medium && stats.fastestTimes.medium < 600) badges.push("Fast Finish (Medium <10min)");
  if (stats.fastestTimes.hard && stats.fastestTimes.hard < 900) badges.push("Fast Finish (Hard <15min)");
  if (stats.streak >= 3) badges.push("3-Day Streak");
  if (stats.streak >= 7) badges.push("7-Day Streak");
  if (stats.streak >= 30) badges.push("30-Day Streak");
  return badges;
}

const sample: PlayerStats = { username: "Sara", wins: 12, fastestTimes: { easy: 250, medium: 590 }, streak: 5 };

console.log("\n");
console.log(` ACHIEVEMENTS for ${sample.username}`);
console.log("");
getAchievements(sample).forEach((a) => console.log("- " + a));


export {};
