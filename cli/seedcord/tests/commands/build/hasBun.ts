import { execFileSync } from 'node:child_process';

export function hasBun(): boolean {
    try {
        execFileSync('bun', ['--version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}
