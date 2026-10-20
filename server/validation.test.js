import test from "node:test";
import assert from "node:assert/strict";
import {
  createAssignmentSchema,
  createActivitySchema,
  createClassSchema,
  createExpenseSchema,
  createIncomeSchema,
  createMessageSchema,
  updateCareerProfileSchema,
  updateBudgetSchema,
  updateAssignmentSchema,
} from "./validation.js";

test("assignment creation accepts a valid date and defaults priority", () => {
  assert.deepEqual(createAssignmentSchema.parse({
    title: "  Read chapter 4  ",
    className: " Biology ",
    dueDate: "2026-10-05",
  }), {
    title: "Read chapter 4",
    className: "Biology",
    activityName: "",
    dueDate: "2026-10-05",
    priority: "medium",
  });
});

test("assignment creation accepts an optional outside activity", () => {
  assert.equal(createAssignmentSchema.parse({
    title: "Practice presentation",
    className: "English",
    activityName: "Debate club",
    dueDate: "2026-10-20",
  }).activityName, "Debate club");
  assert.equal(createAssignmentSchema.safeParse({
    title: "Practice presentation",
    className: "English",
    activityName: "A".repeat(81),
    dueDate: "2026-10-20",
  }).success, false);
});

test("assignment creation accepts no class or an assigned class", () => {
  assert.equal(createAssignmentSchema.parse({
    title: "Plan my week",
    dueDate: "2026-10-20",
  }).className, "");
  assert.equal(createAssignmentSchema.parse({
    title: "Read chapter 4",
    className: "Biology",
    dueDate: "2026-10-20",
  }).className, "Biology");
});

test("assignment dates must be real calendar dates", () => {
  assert.equal(createAssignmentSchema.safeParse({
    title: "Read chapter 4",
    className: "Biology",
    dueDate: "2026-02-30",
  }).success, false);
});

test("assignment creation rejects empty titles and unknown fields", () => {
  assert.equal(createAssignmentSchema.safeParse({
    title: " ",
    className: "Biology",
    dueDate: "2026-10-05",
  }).success, false);
  assert.equal(createAssignmentSchema.safeParse({
    title: "Read chapter 4",
    className: "Biology",
    dueDate: "2026-10-05",
    ownerId: "forged-user",
  }).success, false);
});

test("assignment updates require at least one valid supported field", () => {
  assert.equal(updateAssignmentSchema.safeParse({ completed: true }).success, true);
  assert.equal(updateAssignmentSchema.safeParse({}).success, false);
  assert.equal(updateAssignmentSchema.safeParse({ ownerId: "forged-user" }).success, false);
});

test("class names are trimmed and bounded", () => {
  assert.deepEqual(createClassSchema.parse({ name: "  Art history " }), { name: "Art history" });
  assert.equal(createClassSchema.safeParse({ name: "  " }).success, false);
  assert.equal(createClassSchema.safeParse({ name: "A".repeat(41) }).success, false);
});

test("budget balance and expense amounts validate in cents", () => {
  assert.deepEqual(updateBudgetSchema.parse({ currentBalance: 125.50 }), { currentBalanceCents: 12550 });
  assert.equal(updateBudgetSchema.safeParse({ currentBalance: -1 }).success, false);
  assert.equal(createExpenseSchema.parse({
    description: "  Lunch ",
    amount: 12.34,
    date: "2026-10-15",
  }).amountCents, 1234);
  assert.equal(createExpenseSchema.safeParse({ description: " ", amount: 1, date: "2026-10-15" }).success, false);
  assert.equal(createExpenseSchema.safeParse({ description: "Lunch", amount: 1.234, date: "2026-10-15" }).success, false);
  assert.equal(createExpenseSchema.safeParse({ description: "Lunch", amount: 1, date: "2026-02-30" }).success, false);
  assert.equal(createIncomeSchema.parse({
    description: "  Allowance ",
    amount: 20.50,
    date: "2026-10-15",
  }).amountCents, 2050);
  assert.equal(createIncomeSchema.safeParse({ description: "Gift", amount: 0, date: "2026-10-15" }).success, false);
});

test("public chat messages validate display name and message lengths", () => {
  assert.deepEqual(createMessageSchema.parse({
    displayName: " Student ",
    text: "  Hello everyone!  ",
  }), {
    displayName: "Student",
    text: "Hello everyone!",
  });

  test("career profile updates trim and bound the current career", () => {
    assert.deepEqual(updateCareerProfileSchema.parse({ currentCareer: "  Student  " }), { currentCareer: "Student" });
    assert.equal(updateCareerProfileSchema.safeParse({ currentCareer: " " }).success, false);
    assert.equal(updateCareerProfileSchema.safeParse({ currentCareer: "C".repeat(81) }).success, false);
    assert.equal(updateCareerProfileSchema.safeParse({ currentCareer: "Student", ownerId: "forged-user" }).success, false);
  });

  test("outside-school activities validate a bounded name and known category", () => {
    assert.deepEqual(createActivitySchema.parse({ name: "  Soccer team  ", category: "Sports" }), {
      name: "Soccer team",
      category: "Sports",
    });
    assert.equal(createActivitySchema.safeParse({ name: " ", category: "Sports" }).success, false);
    assert.equal(createActivitySchema.safeParse({ name: "A".repeat(81), category: "Sports" }).success, false);
    assert.equal(createActivitySchema.safeParse({ name: "Debate", category: "Unknown" }).success, false);
    assert.equal(createActivitySchema.safeParse({ name: "Debate", category: "Clubs", ownerId: "forged-user" }).success, false);
  });
  assert.equal(createMessageSchema.safeParse({ displayName: "Student", text: " " }).success, false);
  assert.equal(createMessageSchema.safeParse({ displayName: " ", text: "Hello" }).success, false);
  assert.equal(createMessageSchema.safeParse({ displayName: "S".repeat(61), text: "Hello" }).success, false);
  assert.equal(createMessageSchema.safeParse({ displayName: "Student", text: "x".repeat(2001) }).success, false);
});
