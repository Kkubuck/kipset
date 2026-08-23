import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.kipset.training",
  appName: "KIPSET",
  webDir: "mobile-dist",
  android: {
    backgroundColor: "#08090b",
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
