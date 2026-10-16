const MS_PER_SECOND = 1000;

export function formatDuration(ms: number): string {
    const rounded = Math.round(ms);
    return rounded < MS_PER_SECOND ? `${rounded}ms` : `${(ms / MS_PER_SECOND).toFixed(1)}s`;
}
