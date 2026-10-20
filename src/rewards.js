export const POINTS_PER_LEVEL = 100;
export const MAX_LEVEL = 99;

export function getRewardProgress(points) {
  const pointsToMaxLevel = (MAX_LEVEL - 1) * POINTS_PER_LEVEL;
  const totalPoints = Math.max(0, Math.floor(points));
  const level = Math.min(MAX_LEVEL, Math.floor(totalPoints / POINTS_PER_LEVEL) + 1);
  const isMaxLevel = level === MAX_LEVEL;
  const pointsIntoLevel = isMaxLevel ? POINTS_PER_LEVEL : totalPoints % POINTS_PER_LEVEL;

  return {
    level,
    pointsIntoLevel,
    pointsToNextLevel: isMaxLevel ? 0 : POINTS_PER_LEVEL - pointsIntoLevel,
    progressPercent: isMaxLevel ? 100 : pointsIntoLevel,
    isMaxLevel: isMaxLevel && totalPoints >= pointsToMaxLevel,
  };
}
