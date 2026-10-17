import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Environment } from 'envapt';

// envapt reads these in this order
const ENVIRONMENT_KEYS = ['ENVIRONMENT', 'ENV', 'NODE_ENV', 'MODE'] as const;

const MODES = Object.keys(Environment)
    .filter((name) => Number.isNaN(Number(name)))
    .map((name) => name.toLowerCase());

const MODE_LIST = new Intl.ListFormat('en', { type: 'disjunction' }).format(MODES);

interface ShellVar {
    readonly key: (typeof ENVIRONMENT_KEYS)[number];
    readonly value: string;
}

export type DefaultMode = 'development' | 'production';

// the .env files are left out because a bot's .env usually sets its dev environment
export class ShellMode {
    constructor(private readonly variable?: ShellVar) {}

    // vite writes NODE_ENV into process.env once a command starts it
    public static read(): ShellMode {
        for (const key of ENVIRONMENT_KEYS) {
            const value = process.env[key];
            if (value !== undefined && value !== '') return new ShellMode({ key, value });
        }
        return new ShellMode();
    }

    public viteMode(defaultMode: DefaultMode): string {
        if (this.variable === undefined) return defaultMode;
        const mode = this.variable.value.toLowerCase();
        if (MODES.includes(mode)) return mode;
        const why = `It's ${paint.bold(this.variable.value)}. seedcord runs your bot in this mode and loads the .env files for it.`;
        throw new SeedcordError(SeedcordErrorCode.ConfigInvalidEnv, [this.variable.key, MODE_LIST, why]);
    }
}
