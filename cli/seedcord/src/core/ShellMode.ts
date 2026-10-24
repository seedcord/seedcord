import { paint, SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { ENVIRONMENT_KEYS, Envapter, Environment } from 'envapt';
import { loadEnv } from 'vite';

const MODES: readonly string[] = Object.values(Environment);

const MODE_LIST = new Intl.ListFormat('en', { type: 'disjunction' }).format(MODES);

interface ShellVar {
    readonly key: (typeof ENVIRONMENT_KEYS)[number];
    readonly value: string;
}

export type DefaultMode = 'development' | 'production';

// loadEnv copies NODE_ENV from the mode's .env files into VITE_USER_NODE_ENV. vite accepts only development there
function envFilesSetDevNodeEnv(mode: string, configDir: string): boolean {
    loadEnv(mode, configDir);
    return process.env.VITE_USER_NODE_ENV === 'development';
}

export class ShellMode {
    private readonly nodeEnv = process.env.NODE_ENV;
    private readonly viteNodeEnv = process.env.VITE_USER_NODE_ENV;

    constructor(private readonly variable?: ShellVar) {}

    // the mode comes from the shell alone because a bot's .env usually sets its dev environment
    public static read(): ShellMode {
        for (const key of ENVIRONMENT_KEYS) {
            const value = process.env[key];
            if (value !== undefined && value !== '') return new ShellMode({ key, value });
        }
        return new ShellMode();
    }

    public applyMode(defaultMode: DefaultMode, configDir: string): string {
        const mode = this.viteMode(defaultMode);
        Envapter.environment = mode;
        if (this.nodeEnv) process.env.NODE_ENV = this.nodeEnv;
        else {
            if (this.viteNodeEnv === undefined) delete process.env.VITE_USER_NODE_ENV;
            else process.env.VITE_USER_NODE_ENV = this.viteNodeEnv;
            process.env.NODE_ENV = envFilesSetDevNodeEnv(mode, configDir) ? 'development' : defaultMode;
        }
        return mode;
    }

    private viteMode(defaultMode: DefaultMode): string {
        if (this.variable === undefined) return defaultMode;
        const mode = this.variable.value.toLowerCase();
        if (MODES.includes(mode)) return mode;
        const why = `It's ${paint.bold(this.variable.value)}. seedcord runs your bot in this mode and loads the .env files for it.`;
        throw new SeedcordError(SeedcordErrorCode.ConfigInvalidEnv, [this.variable.key, MODE_LIST, why]);
    }
}

// the CLI loads this file before any command writes NODE_ENV
export const startupShell = ShellMode.read();
