# Mettle

A daily Stoicism training app. Read `docs/PLAN.md` for the product shape and the
reasoning behind it before changing anything structural.

## Expo HAS CHANGED

This project is on **Expo SDK 57 / React Native 0.86 / React 19.2**. Several
things that were true of older SDKs are not true here. Verify against the
installed packages, not memory.

Known differences that have already bitten:

- **`expo-router` 57 no longer depends on `@react-navigation/native`.** It
  vendors react-navigation internally and re-exports the pieces you need:
  `import { DarkTheme, ThemeProvider, useTheme, Stack } from 'expo-router'`.
  Installing `@react-navigation/*` yourself is wrong.
- **`Tabs` from `expo-router` is deprecated.** Use `expo-router/js-tabs`.
- **`expo-router` requires `react-native-reanimated` and
  `react-native-gesture-handler` as peers**, so they are installed even though
  app code uses plain `Animated` for its own transitions.
- **Reanimated 4 moved its babel plugin** to `react-native-worklets/plugin`.

## Working in this container

- `https://docs.expo.dev` is **blocked by the egress proxy**, and so is
  `npx expo install` (it calls the Expo API and misleadingly exits 0 without
  installing anything). Install with plain `npm install` using versions read
  from `node_modules/expo/bundledNativeModules.json`, which is the same source
  of truth `expo install` would have used.
- Chromium is preinstalled under `PLAYWRIGHT_BROWSERS_PATH`. Verify UI by
  exporting for web and screenshotting, not by assuming a clean bundle renders.

## Commands

- `npm run check` - typecheck, content validation, and unit tests together.
- `npm run validate:content` - schema-parses all content and asserts invariants.
- `npm run web` - dev server for the web target.

## Conventions

- `src/domain/**` and `src/content/**` must stay free of react-native imports so
  they remain testable in plain node. This is enforced by where vitest looks.
- All persistence goes through the `Repository` interface in `src/data/types.ts`.
  Never import the Supabase client from a screen.
- The crisis guardrail in `src/domain/crisis.ts` runs on every piece of user free
  text before it reaches any scoring path. Do not add a path that bypasses it.

## Backend

The app runs fully offline on the local adapter. Setting both
`EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` switches
`src/data/index.ts` to the Supabase adapter; both satisfy the same interface, so
no screen changes either way.

- `supabase/migrations/0001_init.sql` - schema and RLS. Every user-owned table
  is owner-only via `auth.uid()`. `peer_responses` has no policies at all
  (RLS with zero policies denies everything) and is read only through the
  `peer_response()` security-definer function, which returns a body string and
  nothing else so authorship cannot leak.
- `supabase/functions/` - Deno, excluded from the app's tsconfig. See its README.
- Peer responses default to `approved = false`. Until moderated, the app falls
  back to the authored exemplars in the bundle. Do not flip that default without
  a moderation path in place.
- The first session is anonymous (`signInAnonymously`), which still produces a
  real `auth.uid()`. Linking a real identity later upgrades the same row.
