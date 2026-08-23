import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const androidRoot = resolve(projectRoot, "android");
const task = process.argv[2];

if (!task || !/^[A-Za-z][A-Za-z0-9:]*$/.test(task)) {
  throw new Error("Provide one Gradle task, for example assembleDebug");
}

const windows = process.platform === "win32";
const wrapper = windows ? "gradlew.bat" : "./gradlew";
const result = spawnSync(wrapper, [task, "--no-daemon", "--stacktrace"], {
  cwd: androidRoot,
  stdio: "inherit",
  shell: windows,
});

if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
