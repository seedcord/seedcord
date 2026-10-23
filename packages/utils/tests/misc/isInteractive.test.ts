import { afterEach, describe, expect, it } from 'vitest';

import { isInteractive } from '#src/misc/isInteractive';

const original = {
    stdin: process.stdin.isTTY,
    stdout: process.stdout.isTTY,
    ci: process.env.CI
};

afterEach(() => {
    process.stdin.isTTY = original.stdin;
    process.stdout.isTTY = original.stdout;
    if (original.ci === undefined) delete process.env.CI;
    else process.env.CI = original.ci;
});

describe('isInteractive', () => {
    it.each([
        ['a real terminal outside CI', true, true, false, true],
        ['piped input', false, true, false, false],
        ['redirected output', true, false, false, false],
        ['CI on a full TTY', true, true, true, false]
    ])('with %s it is %s', (_, stdin, stdout, ci, expected) => {
        process.stdin.isTTY = stdin;
        process.stdout.isTTY = stdout;
        if (ci) process.env.CI = '1';
        else delete process.env.CI;

        expect(isInteractive()).toBe(expected);
    });
});
