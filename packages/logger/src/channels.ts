import type { FrameworkChannel } from './types';

// the union stays in @seedcord/types (LoggerConfig reads it) and that entry is type-only,
// so this list is pinned to it by a type test
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
