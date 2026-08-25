export const MANAGERS = ['pnpm', 'bun', 'npm', 'yarn'] as const;

export type Manager = (typeof MANAGERS)[number];

// yarn runs a script with no verb in front of it
export const VERBS = {
    create: { npm: 'npm create', pnpm: 'pnpm create', yarn: 'yarn create', bun: 'bun create' },
    add: { npm: 'npm install', pnpm: 'pnpm add', yarn: 'yarn add', bun: 'bun add' },
    run: { npm: 'npm run', pnpm: 'pnpm run', yarn: 'yarn', bun: 'bun run' }
} as const satisfies Record<string, Record<Manager, string>>;

export type Verb = keyof typeof VERBS;

const DEFAULT: Manager = 'pnpm';

const STORAGE_KEY = 'seedcord:package-manager';

function isManager(value: string | null): value is Manager {
    return MANAGERS.some((name) => name === value);
}

let current: Manager = DEFAULT;
let hydrated = false;

const listeners = new Set<() => void>();

export function subscribe(listener: () => void): () => void {
    if (!hydrated) {
        hydrated = true;
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (isManager(stored)) current = stored;
    }

    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function getManager(): Manager {
    return current;
}

// every Install on the page renders the same manager on the server
export function getServerManager(): Manager {
    return DEFAULT;
}

export function setManager(next: Manager): void {
    if (next === current) return;

    current = next;
    window.localStorage.setItem(STORAGE_KEY, next);
    for (const listener of listeners) listener();
}
