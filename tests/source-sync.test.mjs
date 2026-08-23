import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the hosted app shell matches the desktop source", async () => {
  const [appSource, hostedSource] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../public/kipset.html", import.meta.url), "utf8"),
  ]);

  assert.equal(hostedSource, appSource);
});
