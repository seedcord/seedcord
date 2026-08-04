import { expect, vi } from 'vitest';

// a single macrotask tick clears ink's layout effect on an idle machine and races once the whole workspace
// runs its suites at once
export async function settled(assertion: () => void): Promise<void> {
    await vi.waitFor(assertion, { timeout: 5000, interval: 10 });
}

// three identical polls mean the effect passes ran out, two would also match the reads that land before the
// first commit
const STABLE_READS = 3;

export async function stableFrame(read: () => string): Promise<string> {
    let previous: string | null = null;
    let repeats = 0;
    await settled(() => {
        const current = read();
        repeats = current !== '' && current === previous ? repeats + 1 : 0;
        previous = current;
        expect(repeats).toBeGreaterThanOrEqual(STABLE_READS);
    });
    return read();
}
