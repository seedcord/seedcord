const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

function pad(value: number): string {
    return value.toString().padStart(2, '0');
}

// Drops empty leading units: 12s, 3m 12s, 1h 02m 03s.
export function formatUptime(ms: number): string {
    const totalSeconds = Math.max(0, Math.floor(ms / MS_PER_SECOND));
    const seconds = totalSeconds % SECONDS_PER_MINUTE;
    const totalMinutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
    const minutes = totalMinutes % MINUTES_PER_HOUR;
    const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR);

    if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
    if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
    return `${seconds}s`;
}
