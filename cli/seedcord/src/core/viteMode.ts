import { Envapter, Environment } from 'envapt';

const ENVIRONMENT_KEYS = ['ENVIRONMENT', 'ENV', 'NODE_ENV'] as const;

export function environmentIsSet(): boolean {
    return Envapter.has(ENVIRONMENT_KEYS);
}

export function viteMode(defaultMode: 'development' | 'production'): string {
    return environmentIsSet() ? Environment[Envapter.environment].toLowerCase() : defaultMode;
}
