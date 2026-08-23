import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import test from "node:test";
import { BACKGROUNDS, MUSCLE_LABELS, WODS } from "../src/wod-data.js";

test("workout library has complete unique records", () => {
  assert.ok(WODS.length >= 40);
  assert.equal(new Set(WODS.map((wod) => wod.id)).size, WODS.length);
  for (const wod of WODS) {
    assert.ok(wod.name && wod.mode && wod.description && wod.stimulus);
    assert.ok(wod.duration >= 1 && wod.duration <= 180);
    assert.ok(wod.difficulty >= 1 && wod.difficulty <= 5);
    assert.ok(wod.steps.length > 0);
    assert.ok(wod.muscles.length > 0);
    wod.muscles.forEach((muscle) => assert.ok(MUSCLE_LABELS[muscle], `${wod.name}: unknown muscle ${muscle}`));
    if (wod.sourceUrl) assert.match(wod.sourceUrl, /^https:\/\//);
  }
});

test("story background catalog contains 30 optimized local assets", async () => {
  assert.equal(BACKGROUNDS.length, 30);
  assert.equal(new Set(BACKGROUNDS.map((item) => item.id)).size, 30);
  for (const background of BACKGROUNDS) {
    const file = await stat(new URL(`../public/backgrounds/${background.file}`, import.meta.url));
    assert.ok(file.size > 30_000, `${background.file} is unexpectedly small`);
    assert.ok(file.size < 250_000, `${background.file} is not optimized`);
  }
});
