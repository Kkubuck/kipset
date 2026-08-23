# KIPSET Privacy

KIPSET is an offline-first application for Windows, macOS, Android, and the optional browser preview.

## Data stored on the device

KIPSET stores the following locally:

- athlete name, age, weight, height, experience level, and default RPE;
- language, display, sound, motion, and Story-background preferences;
- favorite workout identifiers;
- completed workout and manually entered running records;
- duration, rounds, splits, movement totals, running notes, and estimated calories.

Electron stores state in `kipset-state.json` inside the current operating-system user-data directory. Android and the browser preview use the application WebView/browser local-storage container. Android application backup is disabled.

## Data leaving the device

KIPSET includes no account, analytics, telemetry, advertising SDK, remote workout API, GPS collection, or background location service. It does not automatically upload profile or workout data.

When a user selects a source link, KIPSET can open an allowlisted HTTPS page in the system browser or Android custom tab. The destination site applies its own privacy policy.

## User-created files and sharing

KIPSET creates a PNG result only after the user chooses **Save story image** or **Share story image**. Desktop users choose the destination. Android writes a temporary cache copy and opens the system share sheet; the receiving app is selected by the user. JSON backups are created only after the user selects **Export JSON**. Imported JSON is read locally.

## Deletion

Use **Profile → Erase local data** to reset the local profile, settings, favorites, and training history. A user can also clear the application data through operating-system settings. Desktop uninstallers intentionally retain user data unless it is removed separately, protecting users who plan to reinstall.

## Sensitive information

Do not store medical diagnoses, credentials, payment information, or other sensitive information in running notes. KIPSET is not a medical record system, coaching service, or calorie-measurement device.

## Contact

Use the repository's private vulnerability-reporting flow for privacy or security issues. Do not include personal workout data, credentials, or signing material in a public issue.
