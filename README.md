# Teamwork time export

Written in TypeScript. Runs directly via Node (native strip-types since Node 22.18 / 23.6+) — **no build step**. TypeScript is a dev-only dependency for type checking (`npm run typecheck`).

## Requirements

- Node ≥ 22.18 (native `.ts` file execution)
- `npm install` (dev-only dependencies `typescript` + `@types/node` for type checking)
- `.env` file:
  ```bash
  cp .env.example .env
  ```
  - `TEAMWORK_DOMAIN` — account subdomain (`mycompany` from `https://mycompany.teamwork.com`)
  - `TEAMWORK_API_KEY` — Teamwork → profile → Edit My Details → API & Mobile → API Token

## Commands

### `fetch-time.ts` — fetch my time logs and save them to `data/time-<range>.json`

```bash
node bin/fetch-time.ts 2026-05-30            # single day
node bin/fetch-time.ts 2026-05-01 2026-05-31 # date range (from to)
node bin/fetch-time.ts --current-month       # 1st → last day of current month
node bin/fetch-time.ts --last-month          # 1st → last day of previous month
node bin/fetch-time.ts --current-week        # Monday → Sunday of current week
node bin/fetch-time.ts --last-week           # Monday → Sunday of previous week
```

### `check-overlaps.ts` — check a saved file for overlapping time logs (exit 1 if any overlap)

```bash
node bin/check-overlaps.ts data/time-2026-05-01_2026-05-31.json
```

### `fetch-and-check.ts` — fetch and check overlaps in one step (same date args as `fetch-time.ts`)

```bash
node bin/fetch-and-check.ts 2026-05-30
node bin/fetch-and-check.ts 2026-05-01 2026-05-31
node bin/fetch-and-check.ts --current-month
node bin/fetch-and-check.ts --last-month
node bin/fetch-and-check.ts --current-week
node bin/fetch-and-check.ts --last-week
node bin/fetch-and-check.ts --current-month --no-save  # print report, don't write JSON
```

### Tests

```bash
npm test          # node --test (runs directly on .ts files)
npm run typecheck # tsc --noEmit (type check only, emits nothing)
```

### npm aliases

```bash
npm run fetch  -- --current-month    # = node bin/fetch-time.ts
npm run check  -- data/time-...json  # = node bin/check-overlaps.ts
npm run report -- --current-month    # = node bin/fetch-and-check.ts
```

## License

MIT

## What the overlap check does

Each time log spans an interval from `timeLogged` (start, UTC) to `timeLogged + minutes`. The check sorts all intervals and reports every pair that occupies the same moment — i.e. you were tracking time on two or more tasks at once. Touching ends are allowed (one task ends 20:30, the next starts 20:30 → OK); any real intersection (partial overlap, one inside another, identical interval) is listed with both record IDs and the overlap length. Logs that are deleted, have no start time, or have zero/negative duration are skipped. Exit code is `1` when any overlap is found, `0` otherwise.
