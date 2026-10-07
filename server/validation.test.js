import test from "node:test";
import assert from "node:assert/strict";
import {
  createAssignmentSchema,
  createClassSchema,
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
    dueDate: "2026-10-05",
    priority: "medium",
  });
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
