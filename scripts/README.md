# scripts

- `validate-content.ts` - parses every content file against its zod schema and
  asserts cross-file invariants. Run via `npm run validate:content`.
- `screenshot.mjs` - serves a web export and captures each route with Playwright.
  Used to verify surfaces actually render, rather than trusting a clean bundle.

  ```
  npx expo export --platform web --output-dir .web
  node scripts/screenshot.mjs .web ./shots "today=/" "arena=/arena"
  ```
