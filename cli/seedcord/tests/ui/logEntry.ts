import type { LogEntry } from '#ui/stores/LogStore';

export function logEntry(over: Partial<LogEntry>): LogEntry {
    return {
        id: 0,
        channel: 'default',
        level: 'info',
        label: 'Bot',
        text: '',
        timestamp: 0,
        head: true,
        frame: false,
        ...over
    };
}
