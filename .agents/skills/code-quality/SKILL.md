---
name: code-quality
description: Use this when asked to write code, or audit, sweep, or fix code quality across the seedcord monorepo. Covers the layered checks and the React 19 antipatterns to catch by hand. Also use when onboarding any agent to this repo's quality standards.
---

# Code Quality Sweep

The seedcord monorepo enforces quality through layered checks. Most are tool-enforced now, with a single review-enforced check that's hard to automate (cross-package source paths).

<!--prettier-ignore-start-->

| Layer | What it catches | How to run today |
| --- | --- | --- |
| **ESLint + TypeScript** (tool) | Type errors, lint violations, import order, formatting, rule violations | `pnpm check --filter=<pkg>` |
| **Vitest** (tool) | Behavior regressions | `pnpm check --filter=<pkg>` |
| **Prettier** (tool) | Formatting | `pnpm -C <pkg> fmt` / `fmt:check` |
| **changesets** (tool) | Missing version bump on published packages | `pnpm cs` when touching a published package. `pnpm cs:status` to check |
| **React 19 antipatterns** (tool) | Mutable deps, index keys, deprecated APIs, hydration mismatches, hand-rolled `useContext`, giant components | `pnpm react-doctor --verbose` from repo root. Configured via `doctor.config.ts`. Run deliberately, NOT on every `prePush` (it's slow + interactive). Use the verbose flag for per-file diagnostics. |
| **Dead code / unused deps** (tool) | Unused files, exports, types, deps, devDeps, binaries | `pnpm knip` from repo root. Configured via `knip.json`. Run deliberately, NOT on every `prePush`. Triage false positives into `knip.json` `ignoreDependencies` / `ignoreBinaries` / extra `entry` patterns with a comment explaining why. |
| **Cross-package source paths** (review) | `paths` or `include` reaching into another package's `src` | Manual review of every new/changed `tsconfig.json` and `vitest.config.ts`. |

<!--prettier-ignore-end-->

The only acceptable end state for a PR is: **lint:fix and tc exit clean for every touched package, every test passes, no React 19 antipattern is shipped in `apps/*`, and any published-package change has a `changeset`.**

---

## Running the Per-Package Gates

```sh
pnpm check --filter=<pkg>      # lint:fix, tc and test, after building what <pkg> depends on
pnpm check --filter=...<pkg>   # the same, plus everything that depends on <pkg>
pnpm check --affected          # the same, for everything changed since next
pnpm prePush                   # every check, on the packages changed since next
pnpm prePush:all               # every check, on every package
```

Husky runs `lint-staged` (configured in `lint-staged.config.ts`) on commit, and commitlint on the message. No hook runs on push, so run `pnpm prePush` yourself. Don't bypass the hooks.

---

## React 19 / Next.js 16 Antipatterns to Catch by Hand

These apply to every component in `apps/{docs,guide,home}/src` and to the Ink CLI components in `cli/seedcord/src` (Ink uses the same React reconciler). They are not currently auto-detected, so read for them when you review a diff.

### Bugs: must fix before merge

**Mutable values in effect deps** `location.pathname`, `ref.current`, or other mutable globals in a `useEffect` deps array. These don't trigger re-renders when they change, so the effect won't re-run.

```tsx
// Bad
useEffect(() => {
    doSomething();
}, [location.pathname]);

// Good: depend on the stable object, read .pathname inside
useEffect(() => {
    const path = location.pathname;
    doSomething(path);
}, [location]);

// Or: read inside the effect body, no dep at all
useEffect(() => {
    doSomething(window.location.pathname);
}, []);
```

**Array index as React key** Index keys break when the list is reordered or filtered.

```tsx
// Bad
items.map((item, i) => <Item key={i} />);

// Good: stable identity
items.map((item) => <Item key={item.id} />);

// Static arrays with no id: use the content itself
STATIC_TABS.map((tab) => <Tab key={tab.label} />);
```

**Hydration mismatches** `new Date()`, `Math.random()`, `window.*`, or any client-only value reached from JSX during SSR. The server renders one value while the client renders another, so hydration throws.

```tsx
// Bad
<p>{new Date().toLocaleDateString()}</p>;

// Good: client-only rendering
const [now, setNow] = useState<Date | null>(null);
useEffect(() => {
    setNow(new Date());
}, []);
<p>{now?.toLocaleDateString() ?? ''}</p>;
```

### Warnings: fix in the same pass

**React 19 deprecated APIs** `useContext(X)` is superseded by `use(X)` in React 19. `forwardRef` is no longer needed. `ref` is a normal prop now.

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

**`useState(propValue)` without sync** If the prop can change externally and the state needs to follow it, add `useEffect(() => setState(prop), [prop])` or remount with a `key` derived from the prop.

**5+ related `useState` calls** Collapse related boolean / open-state flags into a `useReducer`.

```tsx
// Bad: 6 related useState calls
const [isOpen, setIsOpen] = useState(false);
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
// ...

// Good
type UIState = { isOpen: boolean; isDropdownOpen: boolean };
type UIAction = { type: 'open' } | { type: 'closeAll' };
function uiReducer(state: UIState, action: UIAction): UIState {
    /* ... */
}
const [ui, dispatch] = useReducer(uiReducer, { isOpen: false, isDropdownOpen: false });
```

**`.filter().map()` chains** Two passes when one would do. Combine with `.reduce()`.

```ts
// Bad
items.filter(predicate).map(transform);

// Good
items.reduce<Result[]>((acc, item) => {
    if (predicate(item)) acc.push(transform(item));
    return acc;
}, []);
```

**`array.includes()` inside a loop** O(n²) membership. Build a `Set` once outside the loop.

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

**Sequential independent `await`** Two independent awaits in sequence run as a waterfall. They should race.

```ts
// Bad
const a = await fetchA();
const b = await fetchB();

// Good
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

**`await` before a synchronous early-return guard** The guard doesn't need the awaited value. Return first.

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

**`font-bold` on headings (h1 to h6)** Bold weight crushes counter shapes at display sizes. Use `font-semibold` at most.

```tsx
// Bad
<h2 className="font-extrabold">Title</h2>

// Good
<h2 className="font-semibold">Title</h2>
```

**`w-N h-N` when both axes are equal** Tailwind v4 collapses to `size-N`.

```tsx
// Bad
<div className="w-4 h-4" />

// Good
<div className="size-4" />
```

**Barrel imports inside the same app** Importing from a barrel/index when the direct module is one folder away costs unnecessary fan-out for the bundler and HMR.

```ts
// Bad
import { useAuthStore } from '../store';

// Good
import { useAuthStore } from '../store/useAuthStore';
```

**Em dash (`—`) in JSX text** Use a comma or parentheses.

**Giant components (~200+ lines)** Extract focused sub-components. The parent orchestrates state, effects, and composition. Children own a single visual concern.

---

## Dead code

`pnpm knip` covers unused files, exports, types and dependencies. If a dependency appears in two or more packages, lift it to `pnpm-workspace.yaml`'s `catalogs:` and reference it as `catalog:<name>` everywhere.

---

## Related Skills (in this folder)

- **[`PREVENT-REINVENTION.md`](./PREVENT-REINVENTION.md)** covers checks to run before writing new code (reuse `@seedcord/{types,utils,core,errors}`, `@seedcord/ui`, app-local `lib/`)
- **[`TAILWIND.md`](./TAILWIND.md)** covers Tailwind v4 CSS-first setup, `cn()`, `@theme`, opacity modifiers, responsive discipline, and v4 gotchas vs v3 (applies to `apps/{docs,guide,home}`)
- **[`REACT19.md`](./REACT19.md)** covers `use()` vs `useContext`, ref as prop, `useTransition` / `useActionState` / `useOptimistic`, deprecated APIs, and React Compiler
- **[`TYPESCRIPT.md`](./TYPESCRIPT.md)** covers type narrowing, discriminated unions, generics, `satisfies`, const assertions, branded types, and utility types from `type-fest`
- **[`OOP.md`](./OOP.md)** covers class vs function decision, SOLID in TypeScript, service pattern, composition vs inheritance, and access modifiers
- **[`FAIL-FAST-RULES.md`](./FAIL-FAST-RULES.md)** covers null/undefined handling, invariant checks, and when NOT to use `?.` / `??`
