# TODO 20: Vercel deploy readiness for apps/docs

## Overview

Make apps/docs deploy-ready on Vercel, reading from the artifacts repo via jsDelivr at runtime. No env-var massaging by hand; deploy should "just work."

## Goals

1. **Env contract documented and minimal** — only `SEEDCORD_DOCS_INDEX_URL` (defaults to jsDelivr-on-main if absent). Optional `SEEDCORD_DOCS_INDEX_BRANCH` for previews.
2. **Build script Vercel-compatible** — `next build` from `apps/docs/`, with the monorepo cleanly resolved.
3. **Static vs dynamic strategy** — entity pages are dynamic (next/dynamic routes); top-level pages static or ISR.
4. **ISR cache strategy** — `revalidate` set on entity pages so a new docs publish trickles to the live site within minutes.
5. **No build-time hardcoding** — package list, version list, all read from `index.json` at SSR (or at build for SSG'd paths, then revalidated).
6. **`vercel.json` if needed** — for monorepo build commands.

## Files to Change

### Files to CREATE

- `apps/docs/vercel.json` (if Vercel can't auto-detect)
- `apps/docs/.env.example`

### Files to MODIFY

- `apps/docs/next.config.ts` — confirm output mode; add any needed image domains for jsDelivr if images are inlined
- `apps/docs/src/app/**` — ensure pages use `await searchParams` / `await params` (Next 16 shape; already done per Phase 1 dep research)
- `apps/docs/src/lib/docs/engine.ts` — read `SEEDCORD_DOCS_INDEX_URL` from env; default to production jsDelivr URL

---

## Implementation Approach

### Step 1 — Env contract

`apps/docs/.env.example`:

```
# Override the docs index URL (default: https://cdn.jsdelivr.net/gh/seedcord/artifacts@main/index.json)
SEEDCORD_DOCS_INDEX_URL=

# Override the artifacts repo branch (alternative to full URL; used for preview deploys)
SEEDCORD_DOCS_INDEX_BRANCH=

# (No other env vars needed; everything else is derived from index.json)
```

### Step 2 — Resolution code

In `apps/docs/src/lib/docs/engine.ts`:

```ts
const DEFAULT_BRANCH = 'main';
const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/gh/seedcord/artifacts@';

export function getIndexUrl(): string {
    if (process.env.SEEDCORD_DOCS_INDEX_URL) return process.env.SEEDCORD_DOCS_INDEX_URL;
    const branch = process.env.SEEDCORD_DOCS_INDEX_BRANCH ?? DEFAULT_BRANCH;
    return `${JSDELIVR_BASE}${branch}/index.json`;
}
```

### Step 3 — Static / ISR

In `apps/docs/src/app/docs/packages/[packageId]/[versionId]/[[...entitySegments]]/page.tsx`:

```ts
export const revalidate = 600; // 10 minutes
export const dynamicParams = true; // allow on-demand generation

export async function generateStaticParams() {
    // Build-time: pre-render the latest version of every package at top-level routes
    const index = await loadIndex();
    return Object.entries(index.packages).flatMap(([pkg, entry]) => {
        const latest = entry.stable?.latest;
        if (!latest) return [];
        return [{ packageId: pkg, versionId: latest, entitySegments: [] }];
    });
}
```

### Step 4 — Test on Vercel preview

- Push branch
- Vercel preview URL renders
- Manual: pick a non-default version → entity loads via jsDelivr
- Manual: search works

### Step 5 — Commit

```sh
git commit -m "feat(apps/docs): vercel-ready — env contract + ISR + jsDelivr engine wiring"
```

---

## Acceptance Criteria

- [ ] `apps/docs/.env.example` exists with documented env vars
- [ ] `pnpm -C apps/docs build` succeeds without any env vars set (uses defaults)
- [ ] Vercel preview deploy succeeds
- [ ] Preview deploy can swap the artifacts branch via env var
- [ ] ISR revalidation works (verify on a tag push to artifacts repo on a test deploy)

---

## Risks and Mitigation

| Risk                                                                 | Mitigation                                                                                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel doesn't recognize the pnpm monorepo automatically             | Add `vercel.json` with `buildCommand: 'cd ../.. && pnpm install && pnpm --filter @seedcord/docs build'` and `outputDirectory: '.next'` |
| jsDelivr cache TTL longer than ISR revalidate → stale content        | Document the trade-off; for emergency refresh, use jsdelivr-purge                                                                      |
| Build-time `generateStaticParams` hits jsDelivr unreliably during CI | Wrap in retry-with-backoff 'cd ../.. && pnpm install && pnpm --filter @seedcord/docs build'`and`outputDirectory: '.next'`              |
| jsDelivr cache TTL longer than ISR revalidate → stale content        | Document the trade-off; for emergency refresh, use jsdelivr-purge                                                                      |
| Build-time `generateStaticParams` hits jsDelivr unreliably during CI | Wrap in retry-with-backoff                                                                                                             |

---

## Related TODOs

- Blocked by: TASK-19 (publish workflow producing content for Vercel to consume)
- Blocks: TASK-21 (DOCS_SYSTEM documents the deploy)

---

## Notes

- **Complexity:** Medium
- **Files affected:** 3-5
- **Touches published packages:** No
- **Estimated wall-clock:** 3-5 hours
