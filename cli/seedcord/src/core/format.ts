export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
    return `${count} ${count === 1 ? singular : pluralForm}`;
}

const MS_PER_SECOND = 1000;
const BYTES_PER_KB = 1000;
const BYTES_PER_MB = 1_000_000;

export function formatDuration(ms: number): string {
    const rounded = Math.round(ms);
    return rounded < MS_PER_SECOND ? `${rounded}ms` : `${(ms / MS_PER_SECOND).toFixed(1)}s`;
}

export function formatBytes(bytes: number): string {
    if (bytes < BYTES_PER_KB) return `${bytes} B`;
    if (bytes < BYTES_PER_MB) return `${(bytes / BYTES_PER_KB).toFixed(1)} kB`;
    return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}

export function includesIgnoreCase(text: string, search: string): boolean {
    return text.toLowerCase().includes(search.trim().toLowerCase());
}
