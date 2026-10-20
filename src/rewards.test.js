import test from "node:test";
import assert from "node:assert/strict";
import { getRewardProgress } from "./rewards.js";

test("reward progression starts at level 1 and advances every 100 points", () => {
  assert.deepEqual(getRewardProgress(0), {
    level: 1,
    pointsIntoLevel: 0,
    pointsToNextLevel: 100,
    progressPercent: 0,
    isMaxLevel: false,
  });
  assert.deepEqual(getRewardProgress(90), {
    level: 1,
    pointsIntoLevel: 90,
    pointsToNextLevel: 10,
    progressPercent: 90,
    isMaxLevel: false,
  });
  assert.deepEqual(getRewardProgress(100), {
    level: 2,
    pointsIntoLevel: 0,
    pointsToNextLevel: 100,
    progressPercent: 0,
    isMaxLevel: false,
  });
});

test("reward progression stops at level 99", () => {
  assert.deepEqual(getRewardProgress(9800), {
    level: 99,
    pointsIntoLevel: 100,
    pointsToNextLevel: 0,
    progressPercent: 100,
    isMaxLevel: true,
  });
  assert.deepEqual(getRewardProgress(20000), {
    level: 99,
    pointsIntoLevel: 100,
    pointsToNextLevel: 0,
    progressPercent: 100,
    isMaxLevel: true,
  });
});
