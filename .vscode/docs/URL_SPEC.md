# Docs URL Spec

**Status:** Spec. Implementation tracked under `TASK-XX-url-simplification.md`.
**Owner:** docs-engine + docs-generator (URL generation lives in both layers).
**Goal:** Every docs URL is human-readable, stable across re-extractions, unique per entity, and free of duplicated segments or hash-suffix garbage.

---

## Invariants

These hold for every URL the system produces. Tests assert each:

1. **No segment appears twice on the same URL** (path or fragment). `/classes/foo/constructor#constructor-foo/constructor` is a bug.
2. **No hash-suffix garbage.** A URL fragment like `#checkPermissions-18o3wj0` is a bug. Overload disambiguators are 1-based integers (`#overload-2`), not djb2 hashes.
3. **Stable across re-extractions of the same package version.** If `packages/seedcord@0.10.6` re-extracts twice, every entity's URL is byte-identical between runs. The Slugger deduplication counter is keyed on logical entity path, not insertion order.
4. **Unique per entity within a package version.** No two entities resolve to the same URL.
5. **URL → entity is decodable.** Given a URL, the engine can deterministically locate the entity without auxiliary state.
6. **Lowercase + kebab-case slugs.** `autocompleteHandler` → `autocomplete-handler`. `IIFE` → `iife`. Generics stripped (`Foo<T>` → `foo`).
7. **No `/index` or trailing slashes.** Entity URLs end in the entity slug.
8. **Case-insensitive uniqueness.** Slugger collisions across `Foo` and `foo` must be disambiguated (today: append `-2`).

---

## Path grammar

```
/docs/packages/<packageId>/<versionId>/<kind>/<entitySlug>[#<fragment>]
```

| Segment        | Source                                                                     | Example                |
| -------------- | -------------------------------------------------------------------------- | ---------------------- |
| `<packageId>`  | display name from manifest, URL-encoded                                    | `seedcord`, `services` |
| `<versionId>`  | semver or `latest`                                                         | `0.10.6`, `latest`     |
| `<kind>`       | one of `classes`, `interfaces`, `enums`, `types`, `functions`, `variables` | `classes`              |
| `<entitySlug>` | slug for the top-level entity (NOT including members)                      | `autocomplete-handler` |
| `<fragment>`   | URL hash for sub-entities (members, overloads, type params)                | `#constructor`         |

**`<kind>` selection** maps from `ReflectionKind`:

| ReflectionKind | `<kind>` segment |
| -------------- | ---------------- |
| `Class`        | `classes`        |
| `Interface`    | `interfaces`     |
| `Enum`         | `enums`          |
| `TypeAlias`    | `types`          |
| `Function`     | `functions`      |
| `Variable`     | `variables`      |

No other ReflectionKinds get their own page. Members live as fragments on their parent.

---

## Fragment grammar

```
<scope>-<localId>
```

`<scope>` is one of the role labels below. `<localId>` is the kebab-cased identifier of the sub-entity _relative to its parent_ — never including the parent's slug.

| Sub-entity               | `<scope>`                      | Construction                                  | Example                                                                                | Full URL                                     |
| ------------------------ | ------------------------------ | --------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------- |
| Constructor              | `constructor`                  | constant `constructor`                        | `#constructor`                                                                         | `/.../classes/foo#constructor`               |
| Method                   | `method`                       | kebab(method name)                            | `#method-handle-press`                                                                 | `/.../classes/foo#method-handle-press`       |
| Property                 | `property`                     | kebab(property name)                          | `#property-is-ready`                                                                   | `/.../classes/foo#property-is-ready`         |
| Accessor (getter/setter) | `accessor`                     | kebab(accessor name)                          | `#accessor-name`                                                                       | `/.../classes/foo#accessor-name`             |
| Enum member              | `member`                       | kebab(enum member name)                       | `#member-active`                                                                       | `/.../enums/state#member-active`             |
| Function overload        | `overload`                     | 1-based index, only when >1 signature         | `#overload-2`                                                                          | `/.../functions/foo#overload-2`              |
| Method overload          | `<scope>-<name>--overload-<N>` | parent method scope + 1-based index           | `#method-handle--overload-2`                                                           | `/.../classes/foo#method-handle--overload-2` |
| Type parameter           | `type-param`                   | kebab(type param name)                        | `#type-param-t`                                                                        | `/.../functions/foo#type-param-t`            |
| Parameter                | `param`                        | kebab(param name), scoped per-method-overload | `#param-options--overload-1` for overload param, `#param-options` for single-signature | `/.../classes/foo#param-options`             |

### Rules for fragments

- **No parent name in the fragment.** The page already identifies the parent. Bad: `#constructor-autocomplete-handler/constructor`. Good: `#constructor`.
- **No path separators in fragments.** Fragments are flat identifiers. The `/` in old fragments was a bug from re-using node slugs verbatim.
- **Constructors are anchors, never their own page.** `classes/foo#constructor`, not `classes/foo/constructor` (with or without fragment).
- **Overloads share the function/method page.** The page lists all overloads stacked; only one HTTP route exists for `functions/foo`. The fragment `#overload-N` jumps to the N-th overload card. With a single signature, no fragment is needed; if a user links `#overload-1` it still resolves.
- **Single-signature methods omit the `--overload-N` suffix** on their param/typeparam anchors. Only multi-signature parents add `--overload-N`.

---

## Function overload disambiguation

**Current bug:** `packages/docs-engine/src/transformers/mappers.ts:255-264` (`sigFragment` / `registerSignatureFragment`) generates fragments via djb2 hash of (name, parameter types, return type), producing strings like `checkPermissions-18o3wj0`.

**Fix:** Replace the hash with the existing 1-based `overloadIndex` on `SignatureReflection`. Drop `HASH_BASE` and the djb2 loop entirely.

```ts
// Before
function sigFragment(signature: SignatureReflection): string {
    const name = signature.name;
    const params = (signature.parameters ?? []).map((p) => typeToken(p.type)).join(',');
    const ret = typeToken(signature.type);
    let hash = 5381;
    for (const ch of `${name}|${params}|${ret}`) {
        hash = (hash << 5) + hash + ch.charCodeAt(0);
    }
    return `${name}-${(hash >>> 0).toString(HASH_BASE)}`;
}

// After
function sigFragment(signature: SignatureReflection, overloadIndex: number, totalSignatures: number): string {
    // overloadIndex is 0-based; URLs use 1-based.
    return totalSignatures > 1 ? `overload-${overloadIndex + 1}` : '';
}
```

Callers (`registerSignatureFragment` + `mapSignature` in same file) get updated to pass the index and total. When the function has a single signature, the fragment is empty and consumers omit `#`.

Stability follows from typedoc's signature ordering being deterministic across runs.

---

## Member URL builder fix (apps/docs)

**Current bug:** `apps/docs/src/lib/docs/resolveReferenceHref.ts:96`:

```ts
const anchorPrefix = MEMBER_ANCHOR_PREFIX[nodeKind];
return anchorPrefix ? `${entityHref}#${anchorPrefix}-${node.slug}` : entityHref;
```

`node.slug` is the **full** slug including the parent prefix (e.g., `autocomplete-handler/constructor`), so this produces `#constructor-autocomplete-handler/constructor` — the bug.

**Fix:** Strip the parent slug from `node.slug` before composing the fragment. The parent slug is the leading segment(s) of the member's full slug; the `localSlug` is the trailing segment(s).

```ts
function memberLocalSlug(memberFullSlug: string, parentFullSlug: string): string {
    if (memberFullSlug.startsWith(`${parentFullSlug}/`)) {
        return memberFullSlug.slice(parentFullSlug.length + 1);
    }
    return memberFullSlug; // defensive — should not happen
}

// Then in buildMemberHrefFromNode:
const localSlug = memberLocalSlug(node.slug, entityNode.slug);
return anchorPrefix ? `${entityHref}#${anchorPrefix}-${localSlug}` : entityHref;
```

`buildParameterAnchor` gets the same treatment.

---

## Cross-package link routing (TASKS.md item 9)

Cross-package links (`@link Foo` in a tsdoc, where `Foo` lives in a different `@seedcord/*` package than the current page) must:

1. Resolve to the canonical entity URL of the target package's latest stable version (unless the source explicitly references a different version).
2. **Open in a new browser tab** when clicked from a UI link (`target="_blank" rel="noopener"`). This is the user's confirmed cross-pkg UX.
3. Not mutate the active package state on the current tab.

Implementation lives in `apps/docs/src/lib/docs/resolveReferenceHref.ts` and the render layer (`components/docs/entity/**`) — the link component checks `targetPackage !== currentPackage` and applies `target="_blank"`.

External links (e.g., `discord.js`, MDN) keep their current behavior of `target="_blank" rel="noopener noreferrer"`.

---

## Slug stability

Stability is provided by `Slugger.fromSegments`. The current implementation deduplicates by appending `-N` (count starts at 2). Concerns:

- **Ordering dependence**: the deduplication counter depends on the order entities are presented to the Slugger. Typedoc's iteration order is stable within a single run, and the extractor walks reflections in a fixed order, so this is OK _in practice_ — but the spec calls it out as a known invariant.
- **No `-1`**: the first occurrence has no suffix; second is `-2`. This is the cancrops convention; keep it.

---

## URL resolution (URL → entity)

Given `/docs/packages/<pkg>/<version>/<kind>/<entitySlug>[#<fragment>]`:

1. Look up `pkg` in the engine's package registry (loaded from `index.json` via jsDelivr).
2. Look up `<version>` (resolve `latest` against `index.json`).
3. Look up `<kind>` directory in `PackageDirectory`.
4. Look up `<entitySlug>` in the kind's `Map<string, DocNode>`. If not found → 404.
5. Parse fragment (if any): `<scope>-<localId>` → resolve to a sub-entity on the loaded entity. If fragment present but sub-entity missing → 200 (page loads) with anchor unresolved; client-side log only.

---

## Acceptance tests

Test file: `packages/docs-engine/tests/url-spec.test.ts` (new).

```ts
import { describe, it, expect } from 'vitest';

describe('URL spec', () => {
    it('class with constructor → /classes/<slug>#constructor', () => {
        const url = urlForNode(node({ kind: 'Class', slug: 'autocomplete-handler', member: 'constructor' }));
        expect(url).toBe('/docs/packages/seedcord/0.10.6/classes/autocomplete-handler#constructor');
    });

    it('class method → /classes/<slug>#method-<methodSlug>', () => {
        const url = urlForNode(node({ kind: 'Class', slug: 'autocomplete-handler', member: 'method-handle-press' }));
        expect(url).toBe('/docs/packages/seedcord/0.10.6/classes/autocomplete-handler#method-handle-press');
    });

    it('function with single signature → /functions/<slug> (no fragment)', () => {
        expect(urlForNode(fn('check-permissions', { signatures: 1 }))).toBe(
            '/docs/packages/seedcord/0.10.6/functions/check-permissions'
        );
    });

    it('function with 3 overloads → /functions/<slug>#overload-N', () => {
        const urls = [0, 1, 2].map((i) => urlForNode(fn('check-permissions', { signatures: 3, overloadIndex: i })));
        expect(urls).toEqual([
            '/docs/packages/seedcord/0.10.6/functions/check-permissions#overload-1',
            '/docs/packages/seedcord/0.10.6/functions/check-permissions#overload-2',
            '/docs/packages/seedcord/0.10.6/functions/check-permissions#overload-3'
        ]);
    });

    it('no duplicate segments anywhere', () => {
        // for each entity in the test fixture, assert no segment appears twice
        for (const node of allFixtureNodes()) {
            const url = urlForNode(node);
            const segments = url.split(/[/#-]/).filter(Boolean);
            expect(new Set(segments).size).toBe(segments.length);
        }
    });

    it('no hash garbage (e.g. /([a-z0-9]{6,8}$/))', () => {
        for (const node of allFixtureNodes()) {
            const url = urlForNode(node);
            const fragment = url.split('#')[1] ?? '';
            // overload-N is allowed; anything else with 6+ alphanumerics in a tail token is suspect
            expect(fragment).not.toMatch(/-[a-z0-9]{6,}$/);
        }
    });

    it('stable across two extractions of the same fixture', () => {
        const a = extract(fixture);
        const b = extract(fixture);
        for (const slug of a.allSlugs()) {
            expect(b.urlFor(slug)).toBe(a.urlFor(slug));
        }
    });

    it('overload disambiguator uses index, not hash', () => {
        const url = urlForNode(fn('check-permissions', { signatures: 2, overloadIndex: 1 }));
        expect(url).toMatch(/#overload-\d+$/);
    });

    it('cross-package href opens new tab', () => {
        const link = renderCrossPackageLink({
            currentPackage: 'seedcord',
            targetPackage: 'utils',
            slug: 'has-keys',
            tone: 'function',
            version: '0.8.4'
        });
        expect(link.target).toBe('_blank');
        expect(link.rel).toContain('noopener');
    });

    it('member URL omits parent slug from fragment', () => {
        const url = urlForNode(node({ kind: 'Class', slug: 'autocomplete-handler', member: 'constructor' }));
        // bug regression: fragment must not include 'autocomplete-handler'
        expect(url).not.toMatch(/#.*autocomplete-handler/);
    });
});
```

Add to `packages/docs-generator/tests/` a mirror test that asserts the **generator** emits stable fragment values in the project.json (since the engine consumes them).

---

## Implementation surface (file inventory for TASK-XX)

| File                                                         | Concern                                                              | Change shape                                                                |
| ------------------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `packages/docs-engine/src/transformers/mappers.ts:255-322`   | `sigFragment`, `registerSignatureFragment`, `mapSignature`           | Replace djb2 hash with `overloadIndex`-based fragment                       |
| `packages/docs-engine/src/Slugger.ts`                        | Slugger                                                              | Likely no change; spec validates current behavior                           |
| `packages/docs-engine/src/PackageDirectory.ts`               | Kind→Map routing                                                     | No change; document the kind→`<kind>` segment mapping somewhere centralized |
| `packages/docs-engine/src/ids.ts`                            | `GlobalId`                                                           | No change                                                                   |
| `apps/docs/src/lib/docs/routes.ts`                           | `buildEntityHref`, `buildPackageBasePath`, `parseEntityPathSegments` | No change (logic correct); add export of fragment builder helpers           |
| `apps/docs/src/lib/docs/resolveReferenceHref.ts:96, 114-121` | `buildMemberHrefFromNode`, `buildParameterAnchor`                    | Strip parent slug before composing fragment                                 |
| `apps/docs/src/components/docs/entity/**`                    | Link rendering                                                       | Add `target="_blank"` when `targetPackage !== currentPackage`               |
| `packages/docs-engine/tests/url-spec.test.ts`                | new                                                                  | Implements every acceptance test above                                      |
| `packages/docs-generator/tests/url-fragment.test.ts`         | new                                                                  | Asserts generator emits stable overload fragments                           |

---

## Open questions resolved during grilling

- **Cross-pkg link UX**: open in new tab. No two-pane, no inline expansion. (User decision.)
- **Search/nav scope**: scoped to selected package + version. Cross-pkg search results don't appear in the current package's search. (User decision; overrides earlier TASKS.md item 7.)
- **Constructor URL**: stays as fragment on the class page, never its own route.

## Out of scope (explicitly)

- HTML title / OpenGraph metadata shape (separate concern; tracked under "vercel readiness").
- Deep-linking from external sites (preserved as-is; URLs are stable).
- Search indexing strategy beyond URL stability.
