# TODO 15: docs-engine — consume `index.json` + jsDelivr fetcher

## Overview

The engine currently loads doc projects from a local generator output. Once artifacts move to `seedcord/artifacts` (Phase 6), the engine must:

1. Read a root `index.json` from the artifacts repo via jsDelivr CDN
2. Resolve package + version selection from the index
3. Lazily fetch the per-package per-version `project.json` over jsDelivr
4. Cache the fetched project in memory; allow `setVersion(pkg, version)` to swap

Per `.vscode/docs/URL_SPEC.md` and grilling decisions, **search and nav are scoped to the currently-selected (package, version)** — no cross-version aggregation.

## Goals

1. **Schema typing**: `IndexJson` TS interface matching the shape sketched in `TASKS.md` (also in DOCS_SYSTEM eventually).
2. **`IndexLoader` class** that fetches index.json (with configurable URL / cache).
3. **`ProjectLoader` enhancement** to fetch a specific `(pkg, version)` project.json on demand from jsDelivr.
4. **`DocsEngine.setVersion(pkg, version)`**: state transition that swaps the active `project.json` for that package, rebuilds the in-memory index, and exposes the new entities.
5. **Configurable jsDelivr base URL** (env var or constructor option) — for testing against a different branch of the artifacts repo (per grilling decision: dev pipeline uses `dev-pipeline-test` branch).

## Schema

```ts
export interface IndexJson {
    schemaVersion: 1;
    updatedAt: string; // ISO 8601
    packages: Record<string, PackageIndexEntry>;
    pathTemplates: {
        stable: string; // e.g. "packages/{name}/releases/{version}/project.json"
        prerelease: string; // e.g. "packages/{name}/prerelease/{version}/project.json"
    };
}

export interface PackageIndexEntry {
    fullName: string; // e.g. "@seedcord/utils"
    stable: {
        latest: string; // semver
        latestByMinor: Record<string, string>;
        latestByMajor: Record<string, string>;
    } | null;
    prerelease: {
        latest: string; // semver
    } | null;
}
```

## Files to Change

### Files to CREATE

- `packages/docs-engine/src/index-loader.ts` — `IndexLoader` class (fetch + cache index.json)
- `packages/docs-engine/src/types/index-json.ts` — `IndexJson` + `PackageIndexEntry` types
- `packages/docs-engine/tests/index-loader.test.ts`

### Files to MODIFY

| File                                        | Change                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `packages/docs-engine/src/ProjectLoader.ts` | accept a `fetcher: (url: string) => Promise<unknown>` so callers can swap node-fetch / fs / mock; default to `globalThis.fetch` |
| `packages/docs-engine/src/DocsEngine.ts`    | hold an `IndexLoader` + a `Map<pkg, ProjectLoader>`; expose `setVersion(pkg, version)` returning a Promise                      |
| `packages/docs-engine/src/index.ts`         | export new public surface                                                                                                       |
| `packages/docs-engine/src/constants.ts`     | add `JSDELIVR_BASE` constant (env-overridable)                                                                                  |

---

## Implementation Approach

### Step 1 — Types + IndexLoader

```ts
export class IndexLoader {
    constructor(
        private readonly fetcher: (url: string) => Promise<Response>,
        private readonly baseUrl: string
    ) {}

    private cache: IndexJson | null = null;

    async load(force = false): Promise<IndexJson> {
        if (this.cache && !force) return this.cache;
        const res = await this.fetcher(`${this.baseUrl}/index.json`);
        if (!res.ok) throw new IndexFetchError(`index.json fetch failed: ${res.status}`);
        const parsed = await res.json();
        this.cache = validateIndex(parsed); // hand-rolled validator, no Zod dep
        return this.cache;
    }

    listPackages(): string[] {
        /* ... */
    }
    getEntry(packageName: string): PackageIndexEntry | null {
        /* ... */
    }
    resolveVersion(packageName: string, version: 'latest' | string): string | null {
        /* ... */
    }
    buildProjectUrl(packageName: string, version: string): string {
        /* uses pathTemplates */
    }
}
```

### Step 2 — ProjectLoader fetcher injection

```ts
export class ProjectLoader {
    constructor(
        private readonly fetcher: (url: string) => Promise<Response> = globalThis.fetch,
        private readonly url: string
    ) {}

    async load(): Promise<DocProject> {
        const res = await this.fetcher(this.url);
        if (!res.ok) throw new ProjectFetchError(`project.json fetch failed: ${res.status}`);
        return res.json() as Promise<DocProject>;
    }
}
```

### Step 3 — DocsEngine wiring

```ts
export class DocsEngine {
    constructor(
        private readonly indexLoader: IndexLoader,
        private readonly projectFetcher: (url: string) => Promise<Response> = globalThis.fetch
    ) {}

    private readonly projects = new Map<string, DocProject>();
    private active = new Map<string, string>(); // pkg → version

    async setVersion(packageName: string, version: 'latest' | string): Promise<void> {
        const index = await this.indexLoader.load();
        const resolved = this.indexLoader.resolveVersion(packageName, version);
        if (!resolved) throw new PackageVersionNotFoundError(packageName, version);
        const url = this.indexLoader.buildProjectUrl(packageName, resolved);
        const project = await new ProjectLoader(this.projectFetcher, url).load();
        this.projects.set(packageName, project);
        this.active.set(packageName, resolved);
        // Trigger index rebuild for that package (existing PackageDirectory logic)
    }

    // Existing methods stay
}
```

### Step 4 — Tests

```ts
it('IndexLoader caches by default; force=true bypasses', async () => {
    /* ... */
});
it('resolves "latest" to the entry.stable.latest', async () => {
    /* ... */
});
it('buildProjectUrl uses the correct pathTemplate by stable/prerelease bucket', async () => {
    /* ... */
});
it('DocsEngine.setVersion swaps the active project for a package', async () => {
    /* ... */
});
it('handles fetch failures with typed error', async () => {
    /* ... */
});
```

### Step 5 — Commit

```sh
git commit -m "feat(docs-engine): index.json + jsDelivr fetcher + setVersion API"
```

Changeset: minor on `@seedcord/docs-engine`.

---

## Acceptance Criteria

- [ ] `IndexLoader` and `DocsEngine.setVersion` exist and are exported
- [ ] Tests cover happy path + error paths
- [ ] `JSDELIVR_BASE` is overridable via env (`SEEDCORD_DOCS_INDEX_URL`)
- [ ] No dependency on `node:fs` for index/project loading (fetch-based, runs in browser too)
- [ ] Changeset added

---

## Risks and Mitigation

| Risk                                                                | Mitigation                                                                                              |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| jsDelivr cache TTL too long for fresh deploys                       | Document in DOCS_SYSTEM that a force refresh is `?nocache=1`-style busting; engine accepts a force flag |
| index.json schema drift breaks engine consumers silently            | Hand-rolled validator throws on schema violation; tests cover known-good shapes                         |
| Loading sequence: engine renders before index loads → flashes empty | apps/docs concern (TASK-16); engine just exposes a `loading` state                                      |

---

## Related TODOs

- Blocked by: TASK-14 (generator emits per-version project.json; engine consumes), TASK-13 (engine surface is well-defined post-cleanup)
- Blocks: TASK-16 (UI consumes engine.setVersion), TASK-18 (seed script writes the index.json the engine reads)

---

## Notes

- **Complexity:** Medium-high
- **Files affected:** ~6
- **Touches published packages:** Yes — `@seedcord/docs-engine` minor
- **Estimated wall-clock:** 4-6 hours
