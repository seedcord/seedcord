import { execFileSync } from 'node:child_process';

// the Bun CI job runs the same check on every push
export function hasBun(): boolean {
    try {
        execFileSync('bun', ['--version'], { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}
