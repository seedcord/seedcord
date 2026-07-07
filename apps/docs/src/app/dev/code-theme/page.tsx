import { CodeBlock, cn } from '@seedcord/ui';

import { renderCatppuccin, renderSeedcord } from './compareHighlight';

import type { ReactElement } from 'react';

const SNIPPETS: { title: string; code: string }[] = [
    {
        title: 'Decorated handler class',
        code: `import { SlashRoute, SlashHandler, Gated, GuildOnly } from '@seedcord/gateway';

@Gated(GuildOnly())
@SlashRoute('library/search')
export class SearchHandler extends SlashHandler<'library/search'> {
    public async execute(): Promise<void> {
        const query = this.options.getString('query');
        await this.event.reply(\`Searching for \${query}\`);
    }
}`
    },
    {
        title: 'Interface with mixed members',
        code: `export interface Config {
    readonly token: string;
    intents: number[];
    prefix?: string;
    onReady(client: Client): void | Promise<void>;
    plugins: Record<string, Plugin>;
}`
    },
    {
        title: 'Type aliases: union, intersection, conditional, mapped',
        code: `type Status = 'idle' | 'loading' | 'ready' | 'error';
type WithId<T> = T & { id: string };
type Unwrap<T> = T extends Promise<infer U> ? U : T;
type Frozen<T> = { readonly [K in keyof T]: T[K] };`
    },
    {
        title: 'Enum + const enum',
        code: `export enum Tier {
    Free = 0,
    Pro = 1,
    Enterprise = 2
}

const enum Direction {
    Up = 'UP',
    Down = 'DOWN'
}`
    },
    {
        title: 'Generic function with constraints + overloads',
        code: `function first<T>(items: readonly T[]): T | undefined;
function first<T>(items: readonly T[], fallback: T): T;
function first<T>(items: readonly T[], fallback?: T): T | undefined {
    return items.length > 0 ? items[0] : fallback;
}`
    },
    {
        title: 'Const assertions, literals, numbers, booleans',
        code: `const RATE_LIMIT = 50;
const ENABLED = true;
const ROUTES = ['ban', 'kick', 'mute'] as const;
const META = { version: 1.2, beta: false, tags: ['a', 'b'] } as const;`
    },
    {
        title: 'Async, await, Promise, try/catch, template',
        code: `async function fetchUser(id: string): Promise<User | null> {
    try {
        const res = await fetch(\`/api/users/\${id}\`);
        if (!res.ok) return null;
        return (await res.json()) as User;
    } catch (err) {
        console.error(\`failed: \${String(err)}\`);
        return null;
    }
}`
    },
    {
        title: 'Object literal, destructuring, spread, optional chaining, nullish',
        code: `const { name, roles = [], guild } = member;
const merged = { ...defaults, ...overrides, updatedAt: Date.now() };
const owner = guild?.ownerId ?? 'unknown';
const names = roles.map((r) => r.name).join(', ');`
    },
    {
        title: 'Arrow functions, callbacks, higher-order',
        code: `const debounce = <A extends unknown[]>(fn: (...args: A) => void, ms: number) => {
    let timer: ReturnType<typeof setTimeout>;
    return (...args: A): void => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
};`
    },
    {
        title: 'Comments: line, block, JSDoc',
        code: `// a single-line comment
/* a block comment */

/**
 * Resolves the emoji by name.
 * @param name - the emoji key
 * @returns the resolved emoji, or null when missing
 */
function resolveEmoji(name: string): Emoji | null {
    return registry.get(name) ?? null;
}`
    },
    {
        title: 'Module augmentation / declare',
        code: `declare module '@seedcord/gateway' {
    interface SlashOptionRegistry {
        search: {
            category: { kind: 'string'; required: true; choices: ['books', 'films'] };
        };
    }
}`
    }
];

interface RenderedSnippet {
    title: string;
    text: string;
    catppuccin: string;
    seedcord: string;
}

async function CodeThemePage(): Promise<ReactElement> {
    const rendered: RenderedSnippet[] = await Promise.all(
        SNIPPETS.map(async (snippet) => ({
            title: snippet.title,
            text: snippet.code,
            catppuccin: await renderCatppuccin(snippet.code),
            seedcord: await renderSeedcord(snippet.code)
        }))
    );

    return (
        <div className={cn('space-y-10')}>
            <header className={cn('space-y-2')}>
                <h1 className={cn('text-2xl font-semibold tracking-tight text-(--text)')}>Code theme comparison</h1>
                <p className={cn('text-subtle text-sm')}>
                    Left is catppuccin (the previous theme). Right is the seedcord brand theme. Toggle light and dark
                    with the theme switch in the docs navbar above. Both columns render on the docs surface, the same
                    way real code blocks do.
                </p>
            </header>

            {rendered.map((snippet) => (
                <section key={snippet.title} className={cn('space-y-3')}>
                    <h2 className={cn('text-subtle text-xs font-semibold tracking-widest uppercase')}>
                        {snippet.title}
                    </h2>
                    <div className={cn('relative inset-x-1/2 mx-[-50vw] w-screen px-6')}>
                        <div className={cn('mx-auto grid max-w-400 grid-cols-1 gap-6 lg:grid-cols-2')}>
                            <CodeBlock
                                representation={{ text: snippet.text, html: snippet.catppuccin }}
                                label="catppuccin (before)"
                                copyValue={null}
                            />
                            <CodeBlock
                                representation={{ text: snippet.text, html: snippet.seedcord }}
                                label="seedcord (ours)"
                                copyValue={null}
                            />
                        </div>
                    </div>
                </section>
            ))}
        </div>
    );
}

export default CodeThemePage;
