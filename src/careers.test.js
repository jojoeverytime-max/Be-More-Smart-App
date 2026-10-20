import test from "node:test";
import assert from "node:assert/strict";
import { getNextCareer } from "./careers.js";

test("career suggestion combines assignment performance, class progress, and activities", () => {
  const assignments = [{
    className: "Biology",
    completed: true,
    completedAt: "2026-10-10T12:00:00.000Z",
    dueDate: "2026-10-15",
    rewardPoints: 10,
  }];

  assert.equal(getNextCareer(assignments, [{ name: "Family care", category: "Family" }]).title, "Healthcare Professional");
  assert.equal(getNextCareer(assignments, [{ name: "Science club", category: "Clubs" }]).title, "Biologist");
  assert.deepEqual(
    getNextCareer(assignments, [{ name: "Family care", category: "Family" }]).reasons,
    ["Overall performance: 100%", "Biology progress: 100%", "Related activity: Family"],
  );
});

test("overall completion, on-time work, and reward points affect career performance", () => {
  const assignments = [
    { className: "Mathematics", completed: true, completedAt: "2026-10-10T12:00:00.000Z", dueDate: "2026-10-15", rewardPoints: 10 },
    { className: "Mathematics", completed: false, completedAt: null, dueDate: "2026-10-15", rewardPoints: 0 },
  ];
  const career = getNextCareer(assignments, [{ name: "Coding club", category: "Clubs" }]);

  assert.equal(career.title, "Data Analyst");
  assert.ok(career.reasons.includes("Overall performance: 65%"));
  assert.ok(career.reasons.includes("Mathematics progress: 50%"));
});

test("outside interests can suggest a career when there is no class performance yet", () => {
  const career = getNextCareer([], [{ name: "Community art", category: "Arts" }]);

  assert.equal(career.title, "Designer");
  assert.deepEqual(career.reasons, ["Overall performance: 0%", "Related activity: Arts"]);
});

test("custom class strengths are reflected in the suggested career", () => {
  const career = getNextCareer([
    { className: "Computer Science", completed: true, completedAt: "2026-10-10T12:00:00.000Z", dueDate: "2026-10-15", rewardPoints: 10 },
  ], [{ name: "Robotics club", category: "Clubs" }]);

  assert.equal(career.title, "Computer Science Specialist");
  assert.ok(career.reasons.includes("Computer Science progress: 100%"));
});

test("career suggestion is unavailable without class or activity evidence", () => {
  assert.equal(getNextCareer([], []), null);
});
