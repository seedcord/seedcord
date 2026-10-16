import { pluralize } from '@seedcord/utils/internal';

export function plural(count: number, singular: string, pluralForm?: string): string {
    return `${count} ${pluralize(count, singular, pluralForm)}`;
}

const BYTES_PER_KB = 1000;
const BYTES_PER_MB = 1_000_000;

export function formatBytes(bytes: number): string {
    if (bytes < BYTES_PER_KB) return `${bytes} B`;
    if (bytes < BYTES_PER_MB) return `${(bytes / BYTES_PER_KB).toFixed(1)} kB`;
    return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}
