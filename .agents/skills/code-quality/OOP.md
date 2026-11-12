---
name: oop
description: Use this when deciding between classes and functions or designing a class in seedcord. Covers the class-vs-function rule, SOLID in TypeScript, access modifiers, composition over inheritance, interfaces vs abstract classes, and common OOP antipatterns to avoid.
---

# OOP in TypeScript: Seedcord Conventions

Seedcord uses classes for stateful framework pieces and plain functions for small, stateless helpers. Pick by complexity and state, never by style.

---

## Rule 1: When to use a class vs a function

<!--prettier-ignore-start-->

| Situation | Use |
|---|---|
| State with a lifecycle, like a connection, a cache, or a queue | Class |
| Several methods that share private state | Class |
| An implementation of an interface that other code depends on | Class |
| A transform, formatter, predicate, or one-off helper | Function |
| A React hook | Function |
| Module-level configuration or constants | Named exports |

<!--prettier-ignore-end-->

```ts
// a function: stateless, one job (packages/utils/src/strings/capitalize.ts)
export function capitalize(word: string): string {
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// a class: holds a driver, a key prefix, and a write queue across calls (packages/core/src/kv/KvCollection.ts)
export class KvCollection<TRecord> {
    readonly #driver: KvDriver;
    readonly #prefix: string;
    readonly #updates: KeyedQueue;

    public async get(id: string): Promise<Stored<TRecord> | undefined> { ... }
    public async set(id: string, value: TRecord, ttlMs?: number): Promise<void> { ... }
}
```

---

## Rule 2: No static-only classes

A class where every member is `static` is a module wrapped in class syntax. Use named exports instead.

```ts
// Bad
export class Strings {
    static capitalize(word: string): string { ... }
    static pluralize(word: string, count: number): string { ... }
}

// Good: one file per helper, re-exported from the folder's index
export function capitalize(word: string): string { ... }
export function pluralize(word: string, count: number): string { ... }
```

---

## Rule 3: SOLID in practice

### Single Responsibility

Each class has one reason to change. When a class fetches data, formats it, and validates it, split it.

### Open/Closed

Add behavior by composing a new piece, and leave the existing class unchanged. A new kv backend is a new `KvDriver` class. `KvCollection` doesn't change.

### Liskov Substitution

A subclass works anywhere its base class works, and callers don't need to know which subclass they have. A subclass breaks this when it throws on a method that the base class exposes.

### Interface Segregation

Keep interfaces narrow. `KvDriver` in `@seedcord/types` has four methods, `get`, `set`, `delete`, and `entries`, and a backend implements only those.

### Dependency Inversion

Depend on an interface and take the implementation through the constructor.

```ts
// Bad: the class builds its own backend, so a test or a bot can't swap it
export class KvCollection<TRecord> {
    readonly #driver = new MemoryDriver();
}

// Good: any KvDriver works
export class KvCollection<TRecord> {
    readonly #driver: KvDriver;

    constructor(driver: KvDriver, prefix: string, updates: KeyedQueue) {
        this.#driver = driver;
        ...
    }
}
```

---

## Rule 4: Composition over inheritance

Inherit for a real "is-a" relationship. Compose for "has-a" or "does-a", like a class that has a logger or retries a request.

```ts
// Fragile: a base class only to share a helper
class LoggingBase {
    protected log(message: string): void { ... }
}
class Scanner extends LoggingBase { ... }

// Better: pass the logger in
class Scanner {
    constructor(private readonly logger: Logger) {}
}
```

Keep chains short, and make each level add one job. Gateway's `Seedcord` extends `ServerHost`, which extends `PluginHost`. `PluginHost` holds the bus, kv, and rate limiter and attaches plugins. `ServerHost` adds startup and shutdown for a long-lived process. `Seedcord` opens the gateway session. When a level only adds a helper, composition fits better.

---

## Rule 5: Access modifiers

Use the narrowest modifier that works.

- `public` for the API that callers use.
- `protected` for what subclasses need, like `Plugin`'s `logger`.
- `private` for everything else.
- `readonly` on any field that the constructor sets once.

**`#name` (ECMAScript private)** vs **`private` (TypeScript keyword):**

- `#name` hides plumbing and state inside a class that users can reach. They reach it by importing it through a package's `exports` map, or through a public field typed as it, like gateway's `core.bot: Bot`. A user's editor never shows a `#` member, and their code cannot read it at runtime.
- Every other class uses `private`. That covers internal services, helpers, and classes that only an `./internal` entry exports. An `export` keyword on the file does not make a class public.

```ts
// public: @seedcord/core/node exports ServerHost, and the gateway and node http Seedcord classes extend it
export abstract class ServerHost<BotT extends Transport> extends PluginHost<BotT, 'server'> {
    readonly #lifecycle: PluginLifecycle;
    #initPromise?: Promise<this> | undefined;
}

// internal: only the two http Seedcord classes import it
export class InteractionsService {
    private token?: string;

    constructor(private readonly host: Core) {}
}
```

---

## Rule 6: Interface vs abstract class

**Use an interface** for a contract that unrelated classes implement without sharing any code. `KvDriver` is one, and `MemoryDriver`, `KeyvDriver`, and `UnstorageDriver` each implement it.

```ts
export interface KvDriver {
    get(key: string): Promisable<string | undefined>;
    set(key: string, value: string, ttlMs?: number): Promisable<void>;
    delete(key: string): Promisable<void>;
    entries(prefix: string): AsyncIterable<KvEntry> | Iterable<KvEntry>;
}

export class MemoryDriver implements KvDriver, Disposable { ... }
```

**Use an abstract class** when subclasses share code alongside the contract. `Plugin` in `@seedcord/core/plugin` gives every plugin its `logger`, `core`, and `kv`, and leaves `init()` abstract.

```ts
export abstract class Plugin<...> {
    // shared code that every plugin gets
    protected readonly logger: Logger;
    protected get core(): TCore { ... }
    protected get kv(): Kv { ... }

    // the contract that every plugin implements
    abstract init(): Promisable<void>;
}
```

Don't write an abstract class only to share a logger or config. Pass those through the constructor.

---

## Antipatterns to refuse

```ts
// ❌ Static namespace class
export class MathUtils { static add(a: number, b: number) { return a + b; } }

// ❌ God class: one class doing everything
export class BotService { /* commands, kv, logging, http, scheduling */ }

// ❌ Constructor doing async work
constructor() { this.data = await fetchData(); } // use an init() method or a static factory

// ❌ Mutating an injected object
class Scanner {
    configure(config: Config) { config.timeout = 5000; } // changes the caller's object
}

// ❌ Inheritance only to reuse code, with no is-a relationship
class Scanner extends FileReader { } // pass the reader in

// ❌ Abstract class with no shared code
abstract class Driver { abstract get(key: string): string; } // use an interface
```
