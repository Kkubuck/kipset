import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Share } from "@capacitor/share";

type HapticKind = "light" | "heavy" | "success";

const allowedHosts = ["crossfit.com", "library.crossfit.com", "pacompendium.com", "eparmedx.com", "github.com"];

const safePngName = (fileName: string) => {
  const candidate = String(fileName || "kipset-result.png").split(/[\\/]/).at(-1) || "kipset-result.png";
  const safe = candidate.replace(/[^a-zA-Z0-9._-]/g, "-");
  return safe.toLowerCase().endsWith(".png") ? safe : `${safe}.png`;
};

const haptic = async (kind: HapticKind = "light") => {
  try {
    if (kind === "success") {
      await Haptics.notification({ type: NotificationType.Success });
      return;
    }
    await Haptics.impact({ style: kind === "heavy" ? ImpactStyle.Heavy : ImpactStyle.Light });
  } catch {
    // Haptics are optional on devices that do not expose a vibration motor.
  }
};

const saveImage = async (dataUrl: string, fileName: string) => {
  const marker = "data:image/png;base64,";
  if (!dataUrl.startsWith(marker)) throw new Error("Expected a PNG data URL");
  if (dataUrl.length > 32_000_000) throw new Error("Result image is too large");

  const saved = await Filesystem.writeFile({
    path: `KIPSET/${safePngName(fileName)}`,
    data: dataUrl.slice(marker.length),
    directory: Directory.Cache,
    recursive: true,
  });

  await Share.share({
    title: "KIPSET",
    text: "KIPSET training result",
    files: [saved.uri],
    dialogTitle: "Share KIPSET Story",
  });
  return true;
};

const openExternal = async (target: string) => {
  const parsed = new URL(String(target));
  const allowed = parsed.protocol === "https:" && allowedHosts.some((host) => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`));
  if (!allowed) throw new Error("External destination is not allowed");
  await Browser.open({ url: parsed.href, presentationStyle: "popover" });
  return true;
};

if (Capacitor.isNativePlatform()) {
  window.KipsetNative = Object.freeze({
    isNative: true,
    platform: "android",
    haptic,
    saveImage,
    openExternal,
  });

  App.addListener("backButton", async () => {
    const event = new CustomEvent("kipset:native-back", { cancelable: true });
    if (window.dispatchEvent(event)) await App.exitApp();
  });
}
