import { Envapter, Environment } from 'envapt';

const ENVIRONMENT_KEYS = ['ENVIRONMENT', 'ENV', 'NODE_ENV'] as const;

let shellSetEnvironment = false;

// a bot's .env usually holds its dev environment, so only the shell sets the mode
function shellEnvironment(): string | undefined {
    return ENVIRONMENT_KEYS.map((key) => process.env[key]).find((value) => value !== undefined && value !== '');
}

// cli.ts runs this before any command starts vite, which sets NODE_ENV when it is unset
export function pinShellEnvironment(): void {
    const environment = shellEnvironment();
    shellSetEnvironment = environment !== undefined;
    Envapter.environment = environment ?? Environment.Development;
}

export function viteMode(defaultMode: 'development' | 'production'): string {
    return shellSetEnvironment ? Environment[Envapter.environment].toLowerCase() : defaultMode;
}
