import { describe, expect, it } from 'vitest';

import { runCheckCommand } from '#src/checkCommand';

type CommandInput = Parameters<typeof runCheckCommand>[1];

function withFiles(files: Record<string, string>, colorDepth = 1): CommandInput {
    return {
        readFile: (path) => {
            const text = files[path];
            if (text === undefined) return Promise.reject(new Error(`ENOENT: no such file, open '${path}'`));
            return Promise.resolve(text);
        },
        fetch: () => Promise.reject(new Error('no network in this test')),
        now: () => 0,
        colorDepth
    };
}

const card = (...components: unknown[]): string => JSON.stringify({ component: { type: 17, components } });

describe('discord-component-embed check', () => {
    it("shows a passing card's size against discord's limits and exits 0", async () => {
        const text = card(
            { type: 10, content: 'hi' },
            { type: 12, items: [{ media: { url: 'https://example.com/a.png' } }] }
        );

        expect(await runCheckCommand(['check', 'embed.json'], withFiles({ 'embed.json': text }))).toEqual({
            output: `✔ embed.json\n  ${String(text.length)} of 3000 bytes · 3 of 40 components · 1 of 10 gallery items\n`,
            exitCode: 0
        });
    });

    it('numbers every problem under a card that fails and exits 1', async () => {
        const text = card({ type: 14, spacing: 3 }, { type: 3 });

        const { output, exitCode } = await runCheckCommand(['check', 'embed.json'], withFiles({ 'embed.json': text }));

        expect(output).toBe(
            [
                '✘ embed.json  2 problems',
                '  1. A separator spacing has to be 1 (small) or 2 (large), got 3.',
                '     Found at component > components > 0',
                "  2. Type 3 can't go in a component embed. It takes types 1, 2, 9, 10, 11, 12, 14, and 17.",
                '     Found at component > components > 1',
                ''
            ].join('\n')
        );
        expect(exitCode).toBe(1);
    });

    it('prints the minified size under a file that is only too big because of its whitespace', async () => {
        const payload = { component: { type: 17, components: [{ type: 10, content: 'x'.repeat(2900) }] } };
        const text = JSON.stringify(payload, null, 10);

        const { output } = await runCheckCommand(['check', 'embed.json'], withFiles({ 'embed.json': text }));

        expect(output.split('\n').at(-2)).toBe(
            `  Minified, the JSON is ${String(JSON.stringify(payload).length)} bytes.`
        );
    });

    it("says which file it couldn't read and exits 2", async () => {
        expect(await runCheckCommand(['check', 'missing.json'], withFiles({}))).toEqual({
            output: "✘ missing.json  unreadable\n  Couldn't read missing.json: ENOENT: no such file, open 'missing.json'\n",
            exitCode: 2
        });
    });

    it('checks every target in the order given, then counts them, and exits with the worst result', async () => {
        const files = withFiles({ 'good.json': card({ type: 10, content: 'hi' }), 'bad.json': card({ type: 3 }) });

        const { output, exitCode } = await runCheckCommand(['check', 'bad.json', 'missing.json', 'good.json'], files);

        expect(output.split('\n').filter((line) => line !== '' && !line.startsWith(' '))).toEqual([
            '✘ bad.json  1 problem',
            '✘ missing.json  unreadable',
            '✔ good.json',
            '1 passed, 1 failed, 1 unreadable'
        ]);
        expect(output).toContain('\n\n✘ missing.json');
        expect(exitCode).toBe(2);
    });

    it.each([
        ['truecolor', 24, /\u001B\[38;2;[\d;]+m✔/],
        ['the basic colors', 8, /\u001B\[3\dm✔/]
    ])('colors the marks in %s when the terminal has that depth', async (_label, depth, mark) => {
        const files = withFiles({ 'good.json': card({ type: 10, content: 'hi' }) }, depth);

        const { output } = await runCheckCommand(['check', 'good.json'], files);

        expect(output).toMatch(mark);
    });

    it('prints no color codes without a color terminal', async () => {
        const { output } = await runCheckCommand(
            ['check', 'good.json'],
            withFiles({ 'good.json': card({ type: 10, content: 'hi' }) })
        );

        expect(output).not.toContain('\u001B[');
    });

    it('prints a warning under a page that took over 9 seconds', async () => {
        const url = 'https://example.com/post';
        const html = `<script id="discord:component-embed" type="application/json">${card({ type: 10, content: 'hi' })}</script>`;
        const times = [0, 9400];
        const input: CommandInput = {
            ...withFiles({}),
            fetch: () => Promise.resolve(new Response(html)),
            now: () => times.shift() ?? 0
        };

        const { output, exitCode } = await runCheckCommand(['check', url], input);

        expect(output.split('\n').at(-2)).toBe(
            `  ! ${url} took 9.4 seconds to answer. Discord gives up after about 10 seconds and shows no preview.`
        );
        expect(exitCode).toBe(0);
    });

    it.each([
        ['nothing', [], 'discord-component-embed needs a command.'],
        ['a command without a target', ['check'], 'check needs a file or a URL.'],
        ['an unknown command', ['lint', 'embed.json'], "discord-component-embed doesn't have a lint command."],
        ['an unknown flag', ['check', '--strict', 'embed.json'], "discord-component-embed doesn't take --strict."],
        ['a value on --help', ['--help=false', 'check', 'x.json'], "discord-component-embed doesn't take --help=false."]
    ])('says what is wrong with %s, then points at --help, and exits 2', async (_label, args, problem) => {
        expect(await runCheckCommand(args, withFiles({}))).toEqual({
            output: `${problem}\n\nUsage: discord-component-embed check <file or url>...\nRun discord-component-embed --help for the details.\n`,
            exitCode: 2
        });
    });

    it('prints the usage for --help and exits 0', async () => {
        const { output, exitCode } = await runCheckCommand(['--help'], withFiles({}));

        expect(output).toMatch(/^Usage: discord-component-embed check <file or url>\.\.\.\n/);
        expect(exitCode).toBe(0);
    });
});
