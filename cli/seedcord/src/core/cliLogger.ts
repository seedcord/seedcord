import { Logger } from '@seedcord/logger';

export function cliLogger(label: string): Logger {
    return new Logger(label, { channel: 'cli' });
}
