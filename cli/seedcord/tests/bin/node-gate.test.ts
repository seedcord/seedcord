import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const BIN = path.join(import.meta.dirname, '..', '..', 'bin', 'seedcord.mjs');

// only a real process reaches the bin's own copy of the version check
async function runBinOn(version: string): Promise<{ code: number; stderr: string }> {
    const script = [
        `Object.defineProperty(process, 'version', { value: ${JSON.stringify(version)}, configurable: true });`,
        `process.argv = [process.argv[0], 'seedcord', '--version'];`,
        `await import(${JSON.stringify(BIN)});`
    ].join('\n');

    return run(process.execPath, ['--input-type=module', '-e', script]).then(
        (ok) => ({ code: 0, stderr: ok.stderr }),
        (failed: { code: number; stderr: string }) => ({ code: failed.code, stderr: failed.stderr })
    );
}

describe('the seedcord bin', () => {
    it('exits with the required range when node is too old', async () => {
        const { code, stderr } = await runBinOn('v22.18.0');

        expect(code).toBe(1);
        expect(stderr).toContain('seedcord requires Node >=24.11');
        expect(stderr).toContain('v22.18.0');
    });

    it('runs the cli when node meets the range', async () => {
        const { code } = await runBinOn('v99.0.0');

        expect(code).toBe(0);
    });
});
