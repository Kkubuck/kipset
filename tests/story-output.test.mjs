import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Story export keeps Instagram dimensions and fitted multilingual text", async () => {
  const source = await readFile(new URL("../src/app.jsx", import.meta.url), "utf8");
  assert.match(source, /canvas\.width = 1080; canvas\.height = 1920/);
  assert.match(source, /fitCanvasText\(context, record\.name\.toUpperCase\(\), 850, 150, 900\)/);
  assert.match(source, /fitCanvasText\(context, countLabel, 350, 19, 700, 13\)/);
  assert.match(source, /context\.fillText\(countLabel, x \+ 26, y \+ 25, 350\)/);
  assert.match(source, /slice\(0, 6\)/);
});
