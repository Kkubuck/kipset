# Security Policy

## Supported version

Security fixes are applied to the latest published KIPSET release.

## Report a vulnerability

Use GitHub's private vulnerability-reporting flow:

1. Open the repository's **Security** tab.
2. Select **Advisories**.
3. Choose **Report a vulnerability**.

Do not open a public issue for a vulnerability. Include the affected version, operating system, reproduction steps, and expected impact. Never attach credentials, signing keys, certificates, or personal workout data.

## Security model

- Workout and profile data remain local by default.
- The Electron renderer uses context isolation, sandboxing, and disabled Node.js integration.
- The preload bridge exposes only local state, image saving, and allowlisted HTTPS-link operations.
- State and image payloads have explicit size limits.
- New-window creation and non-file navigation are blocked inside the app.
- Android disables cleartext traffic and application backup; external links pass through the same HTTPS host allowlist.
- Dependency updates are monitored with Dependabot and the release workflow audits production and development dependencies.

## Unsigned community builds

Community desktop packages are not currently Authenticode-signed, Developer ID-signed, or notarized. The Android release artifact is unsigned. Operating systems can therefore show an unknown-developer warning or refuse normal installation. That warning alone is not a vulnerability. Production distribution should use protected platform signing credentials and publish SHA-256 checksums.
