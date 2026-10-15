import { afterEach, describe, expect, it } from 'vitest';

import { isInteractive } from '#core/interactive';

const original = {
    stdin: process.stdin.isTTY,
    stdout: process.stdout.isTTY,
    ci: process.env.CI
};

function setEnv(stdin: boolean, stdout: boolean, ci: boolean): void {
    process.stdin.isTTY = stdin;
    process.stdout.isTTY = stdout;
    if (ci) process.env.CI = '1';
    else delete process.env.CI;
}

afterEach(() => {
    process.stdin.isTTY = original.stdin;
    process.stdout.isTTY = original.stdout;
    if (original.ci === undefined) delete process.env.CI;
    else process.env.CI = original.ci;
});

describe('isInteractive', () => {
    it('is true on a real terminal outside CI', () => {
        setEnv(true, true, false);
        expect(isInteractive()).toBe(true);
    });

    it('is false when stdin is not a TTY (piped input)', () => {
        setEnv(false, true, false);
        expect(isInteractive()).toBe(false);
    });

    it('is false when stdout is not a TTY (redirected output)', () => {
        setEnv(true, false, false);
        expect(isInteractive()).toBe(false);
    });

    it('is false under CI even on a full TTY', () => {
        setEnv(true, true, true);
        expect(isInteractive()).toBe(false);
    });
});
