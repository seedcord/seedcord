export const MANAGERS = ['pnpm', 'bun', 'npm', 'yarn'] as const;

export type Manager = (typeof MANAGERS)[number];

// yarn runs a script without a verb in front of it
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

// the server and the markdown twin render this one
export const DEFAULT_MANAGER: Manager = 'pnpm';

export const MANAGER_STORAGE_KEY = 'seedcord:package-manager';

export function managerFrom(stored: string | null): Manager {
    return MANAGERS.find((name) => name === stored) ?? DEFAULT_MANAGER;
}
