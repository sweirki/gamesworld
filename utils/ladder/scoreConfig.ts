// Full scoring configuration for Ladder system

export const scoreConfig = {
  base: {
    easy: 500,
    medium: 1000,
    hard: 1500,
  },

  timeFactor: {
    easy: 600,
    medium: 1200,
    hard: 1800,
  },

  hintPenalty: 50,
  undoPenalty: 20,
  errorPenalty: 30,

  streakBonus: 100,

  fastSolveBonus: {
    easy: 200,
    medium: 400,
    hard: 600,
  },

  achievements: {
    firstWin: 1,
    tenWins: 10,
    fiftyWins: 50,
    hundredWins: 100,
    speedDemon: {
      easy: 180,
      medium: 300,
      hard: 600,
    },
    streakMaster: 7,
  },

  ranks: {
    Bronze: 0,
    Silver: 1000,
    Gold: 2500,
    Platinum: 5000,
    Diamond: 10000,
    Master: 20000,
    Grandmaster: 35000,
  },
};  // ⬅️***THIS BRACE MUST EXIST***

/* NOW insert seasonXP OUTSIDE scoreConfig */

export const seasonXP = {
  base: {
    easy: 40,
    medium: 60,
    hard: 90,
  },
  fastBonus: {
    easy: 20,
    medium: 30,
    hard: 50,
  },
  streakBonus: 10,
  noErrorBonus: 15,
  tierMultiplier: {
    Bronze: 1.0,
    Silver: 1.05,
    Gold: 1.1,
    Platinum: 1.15,
    Diamond: 1.2,
    Master: 1.25,
    Grandmaster: 1.3,
  },
};

export const STREAK_BONUS = scoreConfig.streakBonus;
