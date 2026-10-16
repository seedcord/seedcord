import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { Envapter, Environment } from 'envapt';

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

// only the shell sets the mode. a bot's .env usually holds its dev environment
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

    public applyToEnvapt(): void {
        Envapter.environment = this.variable?.value ?? Environment.Development;
    }

    public viteMode(defaultMode: DefaultMode): string {
        if (this.variable === undefined) return defaultMode;
        const mode = this.variable.value.toLowerCase();
        if (MODES.includes(mode)) return mode;
        const why = 'seedcord runs your bot in this mode and loads the .env files for it.';
        throw new SeedcordError(SeedcordErrorCode.ConfigInvalidEnv, [this.variable.key, MODE_LIST, why]);
    }
}
