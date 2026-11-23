---
name: typescript
description: Use this when writing TypeScript in seedcord. Covers type narrowing, generics, utility types, discriminated unions, branded types, const assertions, the satisfies operator, and the type discipline rules that apply across the repo.
---

# TypeScript Quality: Seedcord Conventions

This repo runs strict TypeScript. `any` is banned in production code. The goal is types that describe the domain accurately. A type that only quiets the compiler misses the point.

---

## Rule 1: Narrow, don't cast

When TypeScript complains, narrow first. A cast is the last option.

```ts
// Bad: the cast quiets the error and loses the check
const name = (response as any).user.name;

// Good: narrow with a type guard
function hasName(v: unknown): v is { name: string } {
    return typeof v === 'object' && v !== null && 'name' in v && typeof v.name === 'string';
}
if (hasName(response)) {
    const name = response.name;
}
```

Try `typeof`, `instanceof`, `in`, and discriminated union checks before a cast. When a third-party library forces a cast, write a single `as Expected` with `// justified: <reason>` above it.

---

## Rule 2: Discriminated unions over optional fields

Model state as a discriminated union. The compiler then checks every case, and the impossible combinations can't be written. [DESIGN.md](./DESIGN.md#5-pick-a-shape-that-cant-hold-the-wrong-state) covers why optional fields pile up.

```ts
// Bad: the type allows impossible states
type RequestState = {
    isLoading: boolean;
    data?: User;
    error?: string;
};

// Good: the states can't overlap
type RequestState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: User }
    | { status: 'error'; error: string };

// Exhaustive handling
switch (state.status) {
    case 'idle': return null;
    case 'loading': return <Spinner />;
    case 'success': return <Profile user={state.data} />;
    case 'error': return <Error msg={state.error} />;
}
```

---

## Rule 3: Type guards and assertion functions

Write typed predicates for narrowing that you reuse:

```ts
// Type predicate: returns a boolean and narrows inside the if
function isString(v: unknown): v is string {
    return typeof v === 'string';
}

// Assertion function: throws on failure and narrows after the call
function assertDefined<T>(v: T | null | undefined, code: SeedcordErrorCode, args: string[]): asserts v is T {
    if (v == null) throw new SeedcordError(code, args);
}

assertDefined(user, SeedcordErrorCode.SomeCode, ['user']);
console.log(user.name); // user is T here
```

Framework code throws a `SeedcordError` subclass with a registered code. [AGENTS.md](../../../AGENTS.md#other-important-rules) lists which class fits which failure.

---

## Rule 4: Generics, constrain early and infer where possible

Constrain a generic when the shape matters, and let TypeScript infer the type argument when the call site makes it clear.

```ts
// Bad: the caller loses the value's type
function getKey(obj: Record<string, unknown>, key: string): unknown {
    return obj[key];
}

// Good: the key must exist, and the return type follows it
function getKey<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}
const port = getKey(config, 'port'); // number
```

A generic list longer than three parameters usually means the abstraction is wrong.

---

## Rule 5: Prefer built-in utility types over manual mappings

TypeScript ships `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `ReturnType`, `Parameters`, `Awaited`, `NonNullable`, `Extract`, and `Exclude`. Use them over hand-written mapped types.

```ts
// Bad: manual mapped type
type PartialUser = { [K in keyof User]?: User[K] };

// Good
type PartialUser = Partial<User>;

// A function's return type
type ApiResult = Awaited<ReturnType<typeof fetchUser>>;

// Specific keys made optional
type UserDraft = Omit<User, 'id'> & Partial<Pick<User, 'id'>>;
```

### type-fest

`type-fest` is in the workspace catalog, and it covers most of what the built-ins don't. A package that doesn't list it yet adds it with `vp add type-fest@catalog:deps`. Before writing a conditional type, a mapped type, or a union by hand, search its README or its `index.d.ts` in `node_modules` for one that does the job. It ships a version for most shapes that people write by hand, and the shipped version handles the edge cases.

```ts
// Bad: hand-written
type Hook = () => void | Promise<void>;
type Values = (typeof Colors)[keyof typeof Colors];
type Locale = 'en' | 'fr' | (string & {});

// Good
type Hook = () => Promisable<void>;
type Values = ValueOf<typeof Colors>;
type Locale = LiteralUnion<'en' | 'fr', string>;
```

**Wrap a type that someone reads in a hover in `Simplify`.** An intersection or a mapped type shows up in the editor as `A & B & Omit<C, 'x'>`, or as the name of a helper type. `Simplify` makes the hover list the fields.

```ts
// packages/custom-id/src/Field.ts. the hover lists each decoded field
export type DecodedParams<Shape extends CustomIdShape> = Simplify<{ ... }>;
```

Use it on a type that a user or a caller reads: a public option type, a return type, or a decoded value. A type used only inside one file doesn't need it. `SimplifyDeep` on a deep or recursive type can hit TS2589 ("type instantiation is excessively deep"). `KvCollection` falls back to `Simplify` for that reason.

---

## Rule 6: `satisfies` for type-checked literals

`satisfies` checks a value against a type without widening it. Use it on constant maps to catch mistakes and keep the literal types.

```ts
// Bad: the annotation widens every value to string
const routes: Record<string, string> = {
    home: '/',
    about: '/about'
};

// Good: checked, and still literal
const routes = {
    home: '/',
    about: '/about'
} satisfies Record<string, string>;

routes.home; // type: '/'
```

```ts
// Every Status needs a label
type Status = 'pending' | 'fulfilled' | 'cancelled';
const statusLabels = {
    pending: 'Pending',
    fulfilled: 'Fulfilled',
    cancelled: 'Cancelled'
} satisfies Record<Status, string>;
// a new Status without a label is a compile error
```

---

## Rule 7: `const` assertions for literal inference

`as const` narrows a value to its literal type and makes arrays and objects `readonly`.

```ts
// Without as const: string[]
const directions = ['north', 'south', 'east', 'west'];

// With as const: a readonly literal tuple
const directions = ['north', 'south', 'east', 'west'] as const;
type Direction = (typeof directions)[number]; // 'north' | 'south' | 'east' | 'west'
```

Combine it with `satisfies` for config that is both checked and literal:

```ts
const buttonSizes = {
    sm: 'px-3 py-2 text-xs',
    md: 'px-4 py-2.5 text-sm'
} as const satisfies Record<string, string>;
```

---

## Rule 8: Branded types for domain primitives

Brand a primitive when two values of the same primitive type get mixed up and cause real bugs. Use `Tagged` from `type-fest`. `@seedcord/types` brands epoch milliseconds apart from epoch seconds, because Discord's `<t:...>` markup reads seconds.

```ts
import type { Tagged } from 'type-fest';

export type EpochMs = Tagged<number, 'EpochMs'>;
export type EpochSec = Tagged<number, 'EpochSec'>;

function timestamp(at: EpochSec): string {
    return `<t:${String(at)}:R>`;
}

timestamp(Date.now() as EpochMs); // compile error: EpochMs isn't EpochSec
```

Make the brand at the boundary that creates the value, with one cast there. Don't brand every primitive.

---

## Rule 9: `unknown` at external boundaries, narrow before use

At a boundary, like an API response, `JSON.parse`, user input, or `localStorage`, the incoming value is `unknown`. Check it with a type guard or a schema before using it.

```ts
// Bad: trusts data that nothing checked
const user = JSON.parse(raw) as User;

// Good: check at the boundary
function isUser(v: unknown): v is User {
    return typeof v === 'object' && v !== null && 'id' in v && typeof v.id === 'string';
}

const parsed: unknown = JSON.parse(raw);
if (!isUser(parsed)) throw new SeedcordTypeError(SeedcordErrorCode.SomeCode, [source]);
const user = parsed; // User
```

Past the boundary, trust the types. A `?.` on a value that can't be null hides bugs.

---

## Rule 10: Template literal types for string APIs

Use template literal types to model string patterns:

```ts
type EventName = `on${Capitalize<string>}`;
type CSSVar = `--${string}`;
type RoutePath = `/${string}`;

// the type checks the naming convention
function registerHandler(name: EventName, fn: () => void): void { ... }
registerHandler('onClick', fn);   // ok
registerHandler('click', fn);     // TypeScript error
```

---

## What not to do

```ts
// ❌ any in production
let value: any;

// ❌ Double casts
const v = x as unknown as T; // fix the declaration instead

// ❌ Widening with as
const id = rawId as string; // use a type guard, or one cast at the boundary

// ❌ Non-null assertions to quiet a nullable type
const el = ref.current!; // if ref.current is HTMLDivElement | null, check it first

// ❌ import('pkg').Type inline
type X = import('pkg').SomeType; // use: import type { SomeType } from 'pkg';

// ❌ The old generic form of useReducer
useReducer<React.Reducer<State, Action>>(reducer); // use: useReducer(reducer) and let it infer
```
