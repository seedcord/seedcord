---
name: tailwind
description: Use this when writing Tailwind CSS in any seedcord app. Covers the v4 CSS-first setup with @tailwindcss/postcss (Next.js), the per-app tokens.css pattern, cn() and tw template helpers, @theme CSS variables, opacity modifiers, responsive discipline, size/padding shorthands, container queries, and v4-specific gotchas that differ from v3.
---

# Tailwind CSS v4 — Seedcord Conventions

The Next.js 16 + React 19 apps under `apps/{docs,guide,home}` use **Tailwind v4** via the `@tailwindcss/postcss` plugin — no `tailwind.config.js`, no v3 directives. Each app owns its own `tokens.css` (CSS custom properties under `:root` and `[data-theme='dark']`), its own `globals.css` (entry), and its own `components/ui/` primitives. There is no shared `@seedcord/ui` package today — common helpers live per-app in `apps/<name>/src/lib/utils.ts` (which exports `cn` and the `tw` template tag).

If the same pattern shows up in two apps, that is the moment to lift it into a shared package — surface that proposal to the user before duplicating.

---

## Setup Pattern (v4 + Next.js 16)

Every app follows this shape:

```css
/* apps/<name>/src/app/globals.css */
@import 'tailwindcss';            /* single import — replaces @tailwind base/components/utilities */
@import '../styles/tokens.css';   /* :root + [data-theme='dark'] CSS variables */
@import '../styles/utilities.css';/* optional: app-specific utility classes */
```

```js
/* apps/<name>/postcss.config.mjs */
const config = { plugins: { '@tailwindcss/postcss': {} } };
export default config;
```

```ts
/* tailwind class scanning is automatic in Next.js 16; no @source needed unless you author
   class strings in a file outside the app's tree (e.g. shared package). */
```

**Never use the old v3 directives** (`@tailwind base`, `@tailwind components`, `@tailwind utilities`) — they don't exist in v4.

**If you start authoring Tailwind class strings inside a shared package** consumed by these apps, add a `@source` line in the consuming app's `globals.css` pointing to it. Without it, v4's scanner won't find those classes and they'll be purged in production.

---

## Rule 1 — Use `cn()` for dynamic classNames

`cn` is exported from `@lib/utils` in each app. It wraps `clsx` + `tailwind-merge`:

- Deduplicates conflicting Tailwind utilities: `cn('px-2', 'px-4')` → `'px-4'`.
- Filters falsy values — no `.filter(Boolean)` or empty-string ternaries.

```tsx
// Bad
const cls = ['base', isActive ? 'bg-(--accent-a)' : ''].join(' ');

// Good
import { cn } from '@lib/utils';
const cls = cn('base', isActive && 'bg-(--accent-a)');
```

**The only legitimate use of `.join(' ')` in this repo** is joining non-className strings (CLI args, log fragments).

---

## Rule 2 — Use the `tw` template tag for multi-line class strings

The same `@lib/utils` exports `tw`, a template tag that normalizes whitespace and lets you keep `prettier-plugin-tailwindcss` formatting on long class strings:

```tsx
import { cn, tw } from '@lib/utils';

const BASE = tw`
    inline-flex items-center justify-center gap-2
    rounded-lg border border-transparent font-medium transition
    focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--accent-a)
    disabled:cursor-not-allowed disabled:opacity-50
`;

const VARIANTS = {
    primary: tw`shadow-soft bg-(--accent-a) text-white hover:bg-(--accent-a-hover)`,
    ghost: tw`bg-transparent text-(--text) hover:bg-(--bg-accent-a-transparent-subtle)`
};

<button className={cn(BASE, VARIANTS.primary, className)} />;
```

This is how `apps/docs/src/components/ui/Button.tsx` is structured. Mirror it — don't invent a parallel "styled" abstraction.

---

## Rule 3 — Define design tokens once per app in `tokens.css`

Each app's `apps/<name>/src/styles/tokens.css` holds the CSS variables for `:root` (light theme) and `[data-theme='dark']` (dark theme). Examples from `apps/docs`:

```css
:root {
    --color-bg: #f8f6e8;
    --color-text: #070917;
    --color-surface: rgba(0, 0, 0, 0.02);

    --accent-a: #f04e36;       /* mater red */
    --accent-b: #6fab49;       /* welon green */
    --accent-r: #8b90a7;       /* resource accent */

    --entity-class: #3956ff;
    --entity-interface: #b12bcf;
    /* ... */

    --shadow-soft: 0 28px 60px -36px color-mix(in oklab, var(--color-text) 28%, transparent);
}

[data-theme='dark'] {
    --color-bg: #070917;
    --color-text: #f8f6e8;
    /* ... */
}
```

`globals.css` then projects these onto stable semantic aliases (`--bg`, `--text`, `--surface`, `--border`), which is what components actually consume. Add new tokens at the alias layer when you find yourself repeating a `color-mix(...)` expression.

**Reference tokens via `bg-(--token-name)` (v4 paren syntax), not `bg-[var(--token-name)]` (v3 bracket syntax).**

```tsx
// Bad — v3 syntax / arbitrary hex
<div className="bg-[var(--accent-a)] text-[#f04e36]" />

// Good — v4 paren + token
<div className="bg-(--accent-a) text-(--accent-a)" />
```

---

## Rule 4 — Use color-mix for derived shades

The docs app already does derived hovers and surface variants with `color-mix(in oklab, …)`:

```css
--accent-a-hover: color-mix(in oklab, var(--accent-a) 88%, black);
--surface-subtle: color-mix(in oklab, var(--color-surface) 95%, transparent);
```

Never hard-code a darker hex by eye when `color-mix` (or Tailwind's `bg-color/50` opacity modifier) gives a derived value that updates if the base token changes.

---

## Rule 5 — Class shorthands (catch by review)

### `size-N` instead of `w-N h-N`

When both axes are equal, collapse to `size-N`:

```tsx
// Bad
<div className="w-4 h-4" />
<Icon className="w-6 h-6" />

// Good
<div className="size-4" />
<Icon className="size-6" />
```

Exception: when axes differ (`w-8 h-4`), keep them separate.

### `p-N` instead of `px-N py-N` (when equal)

```tsx
// Bad
<div className="px-6 py-6" />

// Good
<div className="p-6" />
```

### `font-semibold` on headings — never `font-bold` / `font-extrabold` / `font-black`

```tsx
// Bad
<h2 className="font-extrabold">Title</h2>

// Good
<h2 className="font-semibold">Title</h2>
```

Heading elements (h1–h6) must use `font-semibold` at most. This is review-enforced — catch it in code review.

---

## Rule 6 — Responsive discipline (mobile-first)

Tailwind breakpoints: `sm` (640px) `md` (768px) `lg` (1024px) `xl` (1280px).

**Mobile-first always.** Write the mobile default first, add `sm:`/`md:`/`lg:` for larger viewports:

```tsx
// Bad — desktop-first (shrinking on larger screens is wrong direction)
<div className="text-2xl md:text-lg" />

// Good
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
<div className="text-sm md:text-base lg:text-lg" />
```

For JS-driven breakpoint checks, prefer matchMedia in a `useEffect` over reading `window.innerWidth` on render (which crashes during SSR). If two apps need it, that's the moment to lift a `useResponsive` hook into a shared place.

**v4 behavior change:** `hover:` only fires on devices that support hover (pointer: fine). It no longer triggers on mobile tap. This is correct and intentional — don't try to work around it.

---

## Rule 7 — Avoid arbitrary values when a token exists

```tsx
// Bad — both have token equivalents in apps/docs
<div className="border-[#3e3f29]" />                              // → border-(--text) or similar
<div className="text-[#f04e36]" />                                 // → text-(--accent-a)
```

Arbitrary values are acceptable only when the design genuinely requires a one-off value that isn't and shouldn't become a system token.

**CSS variable arbitrary values** — in v4, use parentheses, not brackets:

```tsx
// Bad — v3 syntax
<div className="bg-[--my-custom-var]" />

// Good — v4 syntax
<div className="bg-(--my-custom-var)" />
```

---

## Rule 8 — Co-locate component variants with the component

For each app's UI primitives (`apps/<name>/src/components/ui/<Primitive>.tsx`), put `BASE_STYLES`, `VARIANTS`, and `SIZES` as `tw\`…\`` constants at the top of the component file. Don't invent a `cva`-style abstraction; the existing`Button.tsx` pattern is the convention. If a primitive is needed in more than one app, extract it to a shared package — don't copy it.

```tsx
// Good — matches apps/docs/src/components/ui/Button.tsx structure
const BASE_STYLES = tw`inline-flex items-center justify-center …`;
const VARIANTS = {
    primary: tw`bg-(--accent-a) text-white hover:bg-(--accent-a-hover)`,
    ghost: tw`bg-transparent text-(--text) hover:bg-(--bg-accent-a-transparent-subtle)`
} satisfies Record<string, string>;
```

---

## v4 Gotchas vs v3

| Pattern              | v3                      | v4                                                                     |
| -------------------- | ----------------------- | ---------------------------------------------------------------------- |
| Opacity utilities    | `bg-opacity-50`         | `bg-color/50` (old removed)                                            |
| CSS var in arbitrary | `bg-[--var]`            | `bg-(--var)`                                                           |
| Important modifier   | `!flex`                 | `flex!`                                                                |
| Bare `ring` class    | 3px blue                | 1px currentColor — write `ring-3 ring-(--accent-a)`                    |
| Bare `border` class  | gray-200                | currentColor — always add a color                                      |
| `outline-none`       | hides outline           | sets `outline: none` literally — use `outline-hidden` to visually hide |
| Shadow scale         | `shadow-sm` is small    | `shadow-sm` in v4 = v3's bare `shadow` (scale shifted down)            |
| Container queries    | requires plugin         | built-in — use `@container` + `@sm:` directly                          |
| `hover:` on mobile   | fires on tap            | only on hover-capable devices                                          |
| Config               | `tailwind.config.js`    | `@theme {}` in CSS or `:root` custom properties                        |
| Content scanning     | `content: []` in config | automatic in Next.js; `@source` for files outside the tree             |

---

## Container Queries (built-in in v4)

No plugin needed. Use `@container` on the parent and `@sm:` etc. on children:

```tsx
<div className="@container">
    <div className="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3" />
</div>;

{/* Named container */}
<div className="@container/card">
    <p className="text-sm @md/card:text-base" />
</div>;
```

---

## Anti-patterns checklist

| Pattern                                                    | What to do instead                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------- |
| `bg-[#hex]` when a token exists                            | `bg-(--token-name)`                                           |
| `bg-opacity-50`                                            | `bg-color/50`                                                 |
| `bg-[--var]`                                               | `bg-(--var)`                                                  |
| `[a, b].join(' ')` for classNames                          | `cn(a, b)` from `@lib/utils`                                  |
| `w-N h-N` same value                                       | `size-N`                                                      |
| `px-N py-N` same value                                     | `p-N`                                                         |
| `font-bold` / `font-extrabold` on headings                 | `font-semibold`                                               |
| Inline variant map mixed into JSX                          | Lift to `tw\`…\`` `VARIANTS` const above the component        |
| Duplicating a primitive across apps                        | Lift to a shared package; propose it before copy-pasting      |
| Tokens defined in two apps' globals                        | Move to per-app `styles/tokens.css`; lift to shared if reused |
| `window.innerWidth` read during render                     | Use matchMedia in `useEffect`                                 |
| New shared package authoring class strings, no `@source`   | Add `@source` pointing to it in the consuming app's globals   |
| `outline-none` to hide focus ring                          | `outline-hidden`                                              |
| `@tailwind base/components/utilities`                      | `@import 'tailwindcss'`                                       |
| `bg-[var(--token)]` (v3 var-in-bracket syntax)             | `bg-(--token)` (v4 paren syntax)                              |
