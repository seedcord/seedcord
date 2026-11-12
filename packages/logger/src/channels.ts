import type { FrameworkChannel } from '@seedcord/types';

// a type test pins this list to the union in @seedcord/types because that entry is type-only
// (LoggerConfig reads the union)
export const FRAMEWORK_CHANNELS = [
    'default',
    'bot',
    'lifecycle',
    'health',
    'interactions',
    'events',
    'commands',
    'subscribers',
    'errors',
    'gates',
    'plugins',
    'hmr',
    'cli',
    'tsc'
] as const satisfies readonly FrameworkChannel[];
