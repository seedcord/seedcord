export const MANAGERS = ['pnpm', 'bun', 'npm', 'yarn'] as const;

export type Manager = (typeof MANAGERS)[number];

// yarn runs a script with no verb in front of it
export const VERBS = {
    create: { npm: 'npm create', pnpm: 'pnpm create', yarn: 'yarn create', bun: 'bun create' },
    add: { npm: 'npm install', pnpm: 'pnpm add', yarn: 'yarn add', bun: 'bun add' },
    run: { npm: 'npm run', pnpm: 'pnpm run', yarn: 'yarn', bun: 'bun run' },
    exec: { npm: 'npx', pnpm: 'pnpm exec', yarn: 'yarn exec', bun: 'bunx' },
    pack: { npm: 'npm pack', pnpm: 'pnpm pack', yarn: 'yarn pack', bun: 'bun pm pack' },
    publish: { npm: 'npm publish', pnpm: 'pnpm publish', yarn: 'yarn npm publish', bun: 'bun publish' }
} as const satisfies Record<string, Record<Manager, string>>;

export type Verb = keyof typeof VERBS;

export function isVerb(name: string): name is Verb {
    return Object.hasOwn(VERBS, name);
}

export function commandLines(verbs: readonly (readonly [Verb, string])[], manager: Manager): string {
    return verbs
        .map(([verb, argument]) => (argument === '' ? VERBS[verb][manager] : `${VERBS[verb][manager]} ${argument}`))
        .join('\n');
}

const DEFAULT: Manager = 'pnpm';

const STORAGE_KEY = 'seedcord:package-manager';

function isManager(value: string | null): value is Manager {
    return MANAGERS.some((name) => name === value);
}

let current: Manager = DEFAULT;
let hydrated = false;

const listeners = new Set<() => void>();

// localStorage is absent in some runtimes and throws in others
function stored(): Manager | null {
    try {
        const value = window.localStorage.getItem(STORAGE_KEY);
        return isManager(value) ? value : null;
    } catch {
        return null;
    }
}

function remember(next: Manager): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // the choice still applies for this page load
    }
}

export function subscribe(listener: () => void): () => void {
    if (!hydrated) {
        hydrated = true;
        current = stored() ?? current;
    }

    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getManager(): Manager {
    return current;
}

// every shell block on the page renders the same manager on the server
export function getServerManager(): Manager {
    return DEFAULT;
}

export function setManager(next: Manager): void {
    if (next === current) return;

    current = next;
    remember(next);
    for (const listener of listeners) listener();
}
