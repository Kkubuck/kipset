import assert from "node:assert/strict";
import test from "node:test";
import { adaptiveRoundPace, aggregateCounts, estimateCalories, runningMet, totalReps } from "../src/fitness-metrics.js";
import { WOD_BY_ID } from "../src/wod-data.js";

test("calorie estimates use MET, weight, duration, and RPE", () => {
  assert.equal(estimateCalories(7.5, 75, 20, 7), 206);
  assert.ok(estimateCalories(7.5, 90, 20, 7) > estimateCalories(7.5, 75, 20, 7));
  assert.ok(estimateCalories(7.5, 75, 20, 9) > estimateCalories(7.5, 75, 20, 5));
});

test("running MET follows the 2024 Compendium pace bands", () => {
  assert.equal(runningMet(8), 8.5);
  assert.equal(runningMet(10), 9.3);
  assert.equal(runningMet(12), 11.8);
});

test("finishing a Cindy round early redistributes more time to remaining rounds", () => {
  const openingPace = adaptiveRoundPace(1200, 0, 26, 0);
  const paceAfterFastRound = adaptiveRoundPace(1200, 30, 26, 1);
  assert.ok(paceAfterFastRound > openingPace);
  assert.equal(Math.round(openingPace), 46);
  assert.equal(Math.round(paceAfterFastRound), 47);
});

test("round counts produce movement totals", () => {
  const counts = aggregateCounts(WOD_BY_ID.cindy, 26, 26);
  assert.deepEqual(counts, { "Pull-ups": 130, "Push-ups": 260, "Air squats": 390 });
  assert.equal(totalReps(counts), 780);
});
