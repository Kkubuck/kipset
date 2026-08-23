# Contributing to KIPSET

Thank you for improving KIPSET.

## Development setup

Use Node.js 22.13 or newer:

```powershell
npm ci
npm run dev -- --port 8771
```

## Before opening a pull request

```powershell
npm run lint
npm run check:release
```

For changes that affect packaging, run the relevant target:

```powershell
npm run desktop:windows
npm run desktop:mac:arm64
npm run android:debug
```

## Workout data changes

- Prefer official first-party references for named benchmark and Hero workouts.
- Include a source label and HTTPS source URL.
- Keep official prescriptions separate from KIPSET editorial difficulty, muscle, calorie, and scaling guidance.
- Add every muscle identifier to the shared muscle-label catalog.
- Update all four locales for user-facing workout copy.
- Add or update tests when changing defaults, counts, or calorie behavior.

## Product and safety copy

Do not present calorie estimates as measurements or medical advice. Do not imply CrossFit affiliation, certification, or endorsement. Avoid unlicensed trademark use in product branding and store metadata.

## Assets

Only contribute images, fonts, icons, and audio that can legally be redistributed. Document third-party licenses and attribution requirements in `THIRD_PARTY_NOTICES.md`.

## Secrets

Never commit `.env` files, credentials, signing certificates, API keys, keystores, service-account files, or local deployment configuration. Use encrypted repository secrets for release signing.
