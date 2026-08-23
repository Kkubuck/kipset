import assert from "node:assert/strict";
import test from "node:test";

import { createI18n, LOCALES } from "../src/i18n.js";
import { WODS } from "../src/wod-data.js";

const criticalKeys = [
  "nav.home",
  "home.title",
  "library.title",
  "detail.muscle",
  "detail.primary",
  "runner.complete",
  "result.save",
  "result.share",
  "run.title",
  "calendar.title",
  "profile.language",
  "dialog.close",
];

test("all four locales translate the critical application interface", () => {
  assert.deepEqual(LOCALES.map((locale) => locale.id), ["en", "ko", "ja", "zh"]);
  for (const locale of LOCALES) {
    const { t } = createI18n(locale.id);
    for (const key of criticalKeys) assert.notEqual(t(key), key, `${locale.id}: missing ${key}`);
  }
});

test("every WOD has localized prescriptions, summaries, and muscle labels", () => {
  for (const locale of ["ko", "ja", "zh"]) {
    const i18n = createI18n(locale);
    for (const entry of WODS) {
      const copy = i18n.wod(entry);
      assert.equal(copy.steps.length, entry.steps.length, `${locale}/${entry.id}: step count`);
      assert.ok(copy.description && copy.description !== entry.description, `${locale}/${entry.id}: summary`);
      assert.ok(copy.stimulus && copy.scaling, `${locale}/${entry.id}: guidance`);
      entry.muscles.forEach((muscle) => assert.notEqual(i18n.label("muscle", muscle), muscle, `${locale}/${entry.id}: ${muscle}`));
    }
  }
});
