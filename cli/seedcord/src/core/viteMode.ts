import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Envapter, Environment } from 'envapt';

const ENVIRONMENT_KEYS = ['ENVIRONMENT', 'ENV', 'NODE_ENV'] as const;

const MODES = Object.keys(Environment)
    .filter((name) => Number.isNaN(Number(name)))
    .map((name) => name.toLowerCase());

const MODE_LIST = new Intl.ListFormat('en', { type: 'disjunction' }).format(MODES);

interface ShellEnvironment {
    readonly key: (typeof ENVIRONMENT_KEYS)[number];
    readonly value: string;
}

let shell: ShellEnvironment | undefined;

// a bot's .env usually holds its dev environment, so only the shell sets the mode
function shellEnvironment(): ShellEnvironment | undefined {
    for (const key of ENVIRONMENT_KEYS) {
        const value = process.env[key];
        if (value !== undefined && value !== '') return { key, value };
    }
    return undefined;
}

// cli.ts runs this before any command starts vite, which sets NODE_ENV when it is unset
export function pinShellEnvironment(): void {
    shell = shellEnvironment();
    Envapter.environment = shell?.value ?? Environment.Development;
}

export type DefaultMode = 'development' | 'production';

export function viteMode(defaultMode: DefaultMode): string {
    if (shell === undefined) return defaultMode;
    const mode = shell.value.toLowerCase();
    if (MODES.includes(mode)) return mode;
    const why = 'It picks the .env files seedcord loads and the mode cloudflare.config.ts gets.';
    throw new SeedcordError(SeedcordErrorCode.ConfigInvalidEnv, [shell.key, MODE_LIST, why]);
}
