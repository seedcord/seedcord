import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const BIN = path.join(import.meta.dirname, '..', '..', 'bin', 'seedcord.mjs');

// only a real process reaches the bin's own copy of the version check
async function runBinOn(version: string, bunVersion?: string): Promise<{ code: number; stderr: string }> {
    const script = [
        `Object.defineProperty(process, 'version', { value: ${JSON.stringify(version)}, configurable: true });`,
        bunVersion === undefined
            ? ''
            : `Object.defineProperty(process.versions, 'bun', { value: ${JSON.stringify(bunVersion)}, configurable: true });`,
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
        const { code, stderr } = await runBinOn('v99.0.0');

        expect(stderr).toBe('');
        expect(code).toBe(0);
    });

    // bun 1.4.2 reports node v26.3.0
    it('exits with the required range when bun is too old', async () => {
        const { code, stderr } = await runBinOn('v26.3.0', '1.4.1');

        expect(code).toBe(1);
        expect(stderr).toContain('seedcord requires Bun >=1.4.2');
        expect(stderr).toContain('1.4.1');
    });

    it('exits when an older bun carries a prerelease suffix', async () => {
        const { code, stderr } = await runBinOn('v26.3.0', '1.3.9-canary.1');

        expect(code).toBe(1);
        expect(stderr).toContain('seedcord requires Bun >=1.4.2');
    });

    it('passes the gate when bun meets the range', async () => {
        // vite calls bun's import.meta.require once it sees process.versions.bun
        const { stderr } = await runBinOn('v26.3.0', '1.4.2');

        expect(stderr).not.toContain('seedcord requires');
    });
}, 30_000);
