---
name: code-quality
description: Use this when asked to write code, or audit, sweep, or fix code quality across the seedcord monorepo. Covers the React 19 / TypeScript antipatterns to catch by hand, the dead-code checks to perform per package, and deciding when to parallelize work with subagents. Also use when onboarding any agent to this repo's quality standards.
---

# Code Quality Sweep

The seedcord monorepo enforces quality through layered checks. Some are tool-enforced today; others are review-enforced and rely on you (and reviewers) catching them by reading the diff.

| Layer                                  | What it catches                                                                                                       | How to run today                                                                                                                          |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **ESLint + TypeScript** (tool)         | Type errors, lint violations, import order, formatting, rule violations                                               | `pnpm -C <pkg> lint:fix && pnpm -C <pkg> tc` (or `pnpm lint:fix && pnpm tc` from repo root via turbo)                                     |
| **Vitest** (tool)                      | Behavior regressions                                                                                                  | `pnpm -C <pkg> test` (only after lint + tc pass)                                                                                          |
| **Prettier** (tool)                    | Formatting                                                                                                            | `pnpm -C <pkg> fmt` / `fmt:check`                                                                                                         |
| **changesets** (tool)                  | Missing version bump on published packages                                                                            | `pnpm cs` when touching a published package; `pnpm cs:status` to check                                                                    |
| **React 19 antipatterns** (review)     | Mutable deps, index keys, deprecated APIs, hydration mismatches, hand-rolled `useContext`, giant components           | Read the checklist in this skill before merging any `apps/*` change. Not currently tool-enforced — manual review for now.                 |
| **Dead code / unused deps** (review)   | Unused files, exports, types, deps, devDeps, binaries                                                                 | Manual `rg` audit per package; track candidates as you find them. A `knip` integration is a worthwhile follow-up but is not wired up yet. |
| **Cross-package source paths** (review) | `paths` or `include` reaching into another package's `src`                                                            | Manual review of every new/changed `tsconfig.json` and `vitest.config.ts`.                                                                |

The only acceptable end state for a PR is: **lint:fix and tc exit clean for every touched package, every test passes, no React 19 antipattern is shipped in `apps/*`, and any published-package change has a `changeset`.**

---

## Running the Per-Package Gates

```sh
# Always lint:fix (never plain lint).
pnpm -C <pkg> lint:fix

# Then typecheck — must pass before running tests.
pnpm -C <pkg> tc

# Then tests, if the package has any.
pnpm -C <pkg> test

# From the repo root, turbo runs the script across every workspace:
pnpm lint:fix
pnpm tc
pnpm test
pnpm prePush      # build + tc + lint + test, the full pre-push gate
```

Husky's hooks run `lint-staged` (configured in `lint-staged.config.mjs`) on commit and the full `prePush` gate on push. Don't bypass them.

---

## React 19 / Next.js 16 Antipatterns to Catch by Hand

These apply to every component in `apps/{docs,guide,home}/src` and to the Ink CLI components in `packages/cli/src` (Ink uses the same React reconciler). They are not currently auto-detected, so read for them when you review a diff.

### Bugs — must fix before merge

**Mutable values in effect deps**
`location.pathname`, `ref.current`, or other mutable globals in a `useEffect` deps array. These don't trigger re-renders when they change, so the effect won't re-run.

```tsx
// Bad
useEffect(() => {
    doSomething();
}, [location.pathname]);

// Good — depend on the stable object, read .pathname inside
useEffect(() => {
    const path = location.pathname;
    doSomething(path);
}, [location]);

// Or: read inside the effect body, no dep at all
useEffect(() => {
    doSomething(window.location.pathname);
}, []);
```

**Array index as React key**
Index keys break when the list is reordered or filtered.

```tsx
// Bad
items.map((item, i) => <Item key={i} />);

// Good — stable identity
items.map((item) => <Item key={item.id} />);

// Static arrays with no id: use the content itself
STATIC_TABS.map((tab) => <Tab key={tab.label} />);
```

**Hydration mismatches**
`new Date()`, `Math.random()`, `window.*`, or any client-only value reached from JSX during SSR. The server renders one value, the client renders another, hydration throws.

```tsx
// Bad
<p>{new Date().toLocaleDateString()}</p>;

// Good — client-only rendering
const [now, setNow] = useState<Date | null>(null);
useEffect(() => {
    setNow(new Date());
}, []);
<p>{now?.toLocaleDateString() ?? ''}</p>;
```

### Warnings — fix in the same pass

**React 19 deprecated APIs**
`useContext(X)` is superseded by `use(X)` in React 19. `forwardRef` is no longer needed — `ref` is a normal prop now.

```tsx
// Bad
import { useContext, forwardRef } from 'react';
const value = useContext(MyContext);

// Good
import { use } from 'react';
const value = use(MyContext);

// Function components take ref as a prop directly
function MyInput({ ref, ...rest }: { ref?: Ref<HTMLInputElement> } & InputHTMLAttributes<HTMLInputElement>) {
    return <input ref={ref} {...rest} />;
}
```

**`useState(propValue)` without sync**
If the prop can change externally and the state needs to follow it, add `useEffect(() => setState(prop), [prop])` or remount with a `key` derived from the prop.

**5+ related `useState` calls**
Collapse related boolean / open-state flags into a `useReducer`.

```tsx
// Bad — 6 related useState calls
const [isOpen, setIsOpen] = useState(false);
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
// ...

// Good
type UIState = { isOpen: boolean; isDropdownOpen: boolean };
type UIAction = { type: 'open' } | { type: 'closeAll' };
function uiReducer(state: UIState, action: UIAction): UIState { /* ... */ }
const [ui, dispatch] = useReducer(uiReducer, { isOpen: false, isDropdownOpen: false });
```

**`.filter().map()` chains**
Two passes when one would do. Combine with `.reduce()`.

```ts
// Bad
items.filter(predicate).map(transform);

// Good
items.reduce<Result[]>((acc, item) => {
    if (predicate(item)) acc.push(transform(item));
    return acc;
}, []);
```

**`array.includes()` inside a loop**
O(n²) membership. Build a `Set` once outside the loop.

```ts
// Bad
for (const x of items) {
    if (denied.includes(x.id)) continue;
}

// Good
const deniedIds = new Set(denied);
for (const x of items) {
    if (deniedIds.has(x.id)) continue;
}
```

**Sequential independent `await`**
Two independent awaits in sequence run as a waterfall. They should race.

```ts
// Bad
const a = await fetchA();
const b = await fetchB();

// Good
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

**`await` before a synchronous early-return guard**
The guard doesn't need the awaited value — return first.

```ts
// Bad
async function handle(input: string | null) {
    const result = await expensiveOperation();
    if (!input) return;
    return result;
}

// Good
async function handle(input: string | null) {
    if (!input) return;
    return await expensiveOperation();
}
```

**`font-bold` on headings (h1–h6)**
Bold weight crushes counter shapes at display sizes. Use `font-semibold` at most.

```tsx
// Bad
<h2 className="font-extrabold">Title</h2>

// Good
<h2 className="font-semibold">Title</h2>
```

**`w-N h-N` when both axes are equal**
Tailwind v4 collapses to `size-N`.

```tsx
// Bad
<div className="w-4 h-4" />

// Good
<div className="size-4" />
```

**Barrel imports inside the same app**
Importing from a barrel/index when the direct module is one folder away costs unnecessary fan-out for the bundler and HMR.

```ts
// Bad
import { useAuthStore } from '../store';

// Good
import { useAuthStore } from '../store/useAuthStore';
```

**Em dash (`—`) in JSX text**
Use comma, colon, semicolon, or parentheses. The em dash visually crowds inline UI text.

**Giant components (~200+ lines)**
Extract focused sub-components. The parent reads as an orchestrator — state, effects, and composition. Children own a single visual concern.

---

## Dead-Code Sweep (per package, manual)

Until a dead-code scanner is wired into the repo, run this checklist on the package you've been editing before opening a PR:

1. **Unused dependency check.** For each entry in `dependencies` and `devDependencies` of the package you've touched:
   ```sh
   # CLI / runtime deps
   rg "from ['\"]<pkg>" packages/<pkg>/src packages/<pkg>/tests --type ts --type tsx
   rg "require\(['\"]<pkg>" packages/<pkg>/src
   # CLI deps invoked via pnpm exec
   rg "<pkg>" packages/<pkg>/package.json
   ```
   - Returns nothing in src/tests, returns nothing in scripts → **remove from package.json**, then `pnpm install`.
   - Returns nothing in src/tests but appears as a `pnpm exec <pkg>` in scripts → it's a CLI dep, leave it.
2. **Unused exports.** Before adding `export` to a symbol, verify it's consumed outside the file. After moving code, re-grep:
   ```sh
   rg "import.*<symbol>.*from.*<pkg-or-path>"
   ```
   If only the defining file uses it, drop the `export`. If nothing uses it, delete the symbol.
3. **Unused files.** If you replaced a module, check it's still referenced before leaving the file in tree:
   ```sh
   rg "from ['\"].*<old-file-name>"
   ```
4. **Workspace catalog duplication.** If the dep appears in 2+ packages, lift it to `pnpm-workspace.yaml`'s `catalogs:` and reference it as `catalog:<name>` everywhere.

Track candidates in a scratch note while you sweep so you fix them in one focused commit, not scattered across feature work.

---

## When to Use Subagents

For large sweeps (20+ issues across multiple packages or apps), parallelize across the natural package boundaries:

```
Subagent A → packages/seedcord + packages/services + packages/utils
Subagent B → packages/cli + packages/plugins
Subagent C → packages/docs-engine + packages/docs-generator
Subagent D → apps/docs (largest app today)
```

Each subagent should:

1. List the antipatterns / dead-code candidates for its package(s)
2. Fix every issue found
3. Run `pnpm -C <pkg> lint:fix && pnpm -C <pkg> tc && pnpm -C <pkg> test`
4. Confirm 0 errors before reporting back
5. NOT commit — the orchestrator commits after all subagents complete

For small sweeps (under ~10 issues, 1–2 packages), fix inline — subagent overhead isn't worth it. Read [`../../skills/subagent-context-management/SKILL.md`](../subagent-context-management/SKILL.md) before spawning anything.

---

## Cross-Package Build Validation

When you change a package that others depend on, rebuild and verify dependents before declaring done:

```sh
pnpm -C packages/<changed-pkg> build
pnpm -C packages/<dependent-pkg> tc
pnpm -C apps/<dependent-app> tc
```

`packages/seedcord` depends on `services`, `utils`, `types`, `cli` (workspace), `discord.js`, `chalk`, `envapt`, `type-fest`, `reflect-metadata`. The apps consume `docs-engine`, `docs-generator`, `types`, and `eslint-config`. Mental-model that graph before changing a leaf.

---

## Commit Strategy

Commit after each well-defined phase clears all gates — not all at the end.

Example milestones:

- `fix(<pkg>): react-19 antipatterns + warnings` — after a package or app is clean
- `chore: remove unused deps and dead code` — after a dead-code sweep
- `chore(<pkg>): tighten tsconfig / lint config` — when adopting stricter rules
- `chore: add changeset for <pkg>` — when bumping a published package

For any change touching a package under `packages/` (other than `tsconfig`, `tsup-config`, `eslint-config` which are workspace-internal), add a changeset via `pnpm cs` so the release pipeline can publish correctly.

---

## Related Skills (in this folder)

- **[`PREVENT-REINVENTION.md`](./PREVENT-REINVENTION.md)** — checks to run before writing new code (reuse `@seedcord/{types,utils,services,plugins,cli}`, app-local `lib/`, `components/ui/`)
- **[`TAILWIND.md`](./TAILWIND.md)** — Tailwind v4 CSS-first setup, `cn()`, `@theme`, opacity modifiers, responsive discipline, v4 gotchas vs v3 (applies to `apps/{docs,guide,home}`)
- **[`REACT19.md`](./REACT19.md)** — `use()` vs `useContext`, ref as prop, `useTransition` / `useActionState` / `useOptimistic`, deprecated APIs, React Compiler
- **[`TYPESCRIPT.md`](./TYPESCRIPT.md)** — type narrowing, discriminated unions, generics, `satisfies`, const assertions, branded types, utility types from `type-fest`
- **[`OOP.md`](./OOP.md)** — class vs function decision, SOLID in TypeScript, service pattern, composition vs inheritance, access modifiers
- **[`FAIL-FAST-RULES.md`](./FAIL-FAST-RULES.md)** — null/undefined handling, invariant checks, when NOT to use `?.` / `??`
- **[`CODE-COMMENTING-GUIDELINES.md`](./CODE-COMMENTING-GUIDELINES.md)** — when comments help vs. when they're noise
