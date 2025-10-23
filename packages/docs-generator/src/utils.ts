import { stat } from 'node:fs/promises';

export async function pathExists(filePath: string): Promise<boolean> {
    try {
        await stat(filePath);
        return true;
    } catch {
        return false;
    }
}

// tidy up relative paths so they work cross-platform
export function normalizeRelativePath(segment: string): string {
    return segment.replace(/^[.][/\\]+/, '').replace(/\\/g, '/');
}

export function stripAnsi(input: string): string {
    return input.replace(/\u001B\[[0-9;]*m/g, '');
}
