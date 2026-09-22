import { parseArgs } from 'node:util';

import { checkTarget } from './check';
import { MAX_COMPONENTS, MAX_ITEMS_ACROSS_GALLERIES, MAX_JSON_BYTES } from './limits';

import type { CheckInput, CheckResult } from './check';

export interface CommandInput extends CheckInput {
    // what process.stdout.getColorDepth() returns. 1 turns color off
    colorDepth: number;
}

interface CommandResult {
    output: string;
    exitCode: number;
}

const EXIT_CODE: Readonly<Record<CheckResult['status'], number>> = { pass: 0, fail: 1, unreadable: 2 };

const BIN = 'discord-component-embed';
const USAGE = `${BIN} check <file or url>...`;

type Row = readonly [string, string];

const TARGETS: readonly Row[] = [
    ['embed.json', 'a JSON payload, measured as written'],
    ['dist/post.html', 'a page from your build, checked through its <script> or <link>'],
    ['https://materwelon.dev', "a live page, fetched the way Discord's crawler fetches it"]
];

const EXIT_CODES: readonly Row[] = [
    ['0', 'every target passes'],
    ['1', 'a target fails a check'],
    ['2', "a target can't be read, or the command is wrong"]
];

const EXAMPLES = [`${BIN} check embed.json`, `${BIN} check dist/blog/*.html`, `${BIN} check https://materwelon.dev`];

// hex copied from cli/seedcord/src/ui/palette.ts
const PALETTE = {
    accent: { hex: '#7dcfff', ansi: 36 },
    good: { hex: '#9ece6a', ansi: 32 },
    bad: { hex: '#f7768e', ansi: 31 },
    warn: { hex: '#e0af68', ansi: 33 },
    muted: { hex: '#9aa0b3', ansi: 90 }
} as const;

// getColorDepth returns 1, 4, 8, or 24
const TRUECOLOR_DEPTH = 24;
const BASIC_COLOR_DEPTH = 4;

type Tone = keyof typeof PALETTE;
type Paint = (tone: Tone, text: string) => string;

export async function runCheckCommand(args: readonly string[], input: CommandInput): Promise<CommandResult> {
    const { tokens } = parseArgs({
        args: [...args],
        allowPositionals: true,
        strict: false,
        tokens: true,
        options: { help: { type: 'boolean', short: 'h' } }
    });

    const paint = painter(input.colorDepth);
    const flags = tokens.flatMap((token) => (token.kind === 'option' ? [token] : []));
    if (flags.some((flag) => flag.name === 'help')) return { output: help(paint), exitCode: 0 };

    const [command, ...targets] = tokens.flatMap((token) => (token.kind === 'positional' ? [token.value] : []));
    const unknown = flags[0];
    if (unknown) return misuse(`${BIN} doesn't take ${unknown.rawName}.`, paint);
    if (command === undefined) return misuse(`${BIN} needs a command.`, paint);
    if (command !== 'check') return misuse(`${BIN} doesn't have a ${command} command.`, paint);
    if (targets.length === 0) return misuse('check needs a file or a URL.', paint);

    const checked = await Promise.all(
        targets.map(async (target) => ({ target, result: await checkTarget(target, input) }))
    );
    const statuses = checked.map(({ result }) => result.status);
    const blocks = checked.map(({ target, result }) => report(target, result, paint));
    const footer = checked.length > 1 ? [tally(statuses, paint)] : [];

    return {
        output: [...blocks, ...footer].join('\n'),
        exitCode: Math.max(...statuses.map((status) => EXIT_CODE[status]))
    };
}

function misuse(problem: string, paint: Paint): CommandResult {
    const output = lines(
        paint('bad', problem),
        '',
        `${paint('accent', 'Usage:')} ${USAGE}`,
        `Run ${BIN} --help for the details.`
    );
    return { output, exitCode: 2 };
}

function help(paint: Paint): string {
    const heading = (title: string): string => paint('accent', title);
    return lines(
        `${heading('Usage:')} ${USAGE}`,
        '',
        "Checks Discord component embeds against Discord's rules. Pass as many targets as you like.",
        '',
        heading('Targets'),
        ...table(TARGETS, paint),
        '',
        heading('Exit codes'),
        ...table(EXIT_CODES, paint),
        '',
        heading('Examples'),
        ...EXAMPLES.map((example) => `  ${example}`)
    );
}

function table(rows: readonly Row[], paint: Paint): string[] {
    const width = Math.max(...rows.map(([left]) => left.length));
    return rows.map(([left, right]) => `  ${left.padEnd(width)}  ${paint('muted', right)}`);
}

function painter(colorDepth: number): Paint {
    if (colorDepth >= TRUECOLOR_DEPTH) {
        return (tone, text) => `\u001B[38;2;${rgb(PALETTE[tone].hex)}m${text}\u001B[39m`;
    }
    if (colorDepth >= BASIC_COLOR_DEPTH) {
        return (tone, text) => `\u001B[${String(PALETTE[tone].ansi)}m${text}\u001B[39m`;
    }
    return (_tone, text) => text;
}

function rgb(hex: string): string {
    return (hex.match(/[\da-f]{2}/g) ?? []).map((pair) => String(Number.parseInt(pair, 16))).join(';');
}

function report(target: string, result: CheckResult, paint: Paint): string {
    if (result.status === 'pass') {
        const usage = [
            `${String(result.bytes)} of ${String(MAX_JSON_BYTES)} bytes`,
            `${String(result.components)} of ${String(MAX_COMPONENTS)} components`,
            `${String(result.galleryItems)} of ${String(MAX_ITEMS_ACROSS_GALLERIES)} gallery items`
        ].join(' · ');
        return lines(`${paint('good', '✔')} ${target}`, `  ${paint('muted', usage)}`);
    }

    if (result.status === 'unreadable') {
        return lines(`${paint('warn', '✘')} ${target}  ${paint('warn', 'unreadable')}`, `  ${result.reason}`);
    }

    const count = result.problems.length === 1 ? '1 problem' : `${String(result.problems.length)} problems`;
    const hint = result.hint === undefined ? [] : [`  ${paint('muted', result.hint)}`];
    return lines(
        `${paint('bad', '✘')} ${target}  ${paint('bad', count)}`,
        ...result.problems.map((problem, index) => numbered(index + 1, problem, paint)),
        ...hint
    );
}

// ComponentEmbedError puts the path on the lines after the message
function numbered(position: number, problem: string, paint: Paint): string {
    const [message = '', ...where] = problem.split('\n');
    const label = `${String(position)}. `;
    const indent = ' '.repeat(label.length + 2);
    return [`  ${label}${message}`, ...where.map((line) => `${indent}${paint('muted', line)}`)].join('\n');
}

const TALLY = [
    ['pass', 'passed', 'good'],
    ['fail', 'failed', 'bad'],
    ['unreadable', 'unreadable', 'warn']
] as const satisfies readonly (readonly [CheckResult['status'], string, Tone])[];

function tally(statuses: readonly CheckResult['status'][], paint: Paint): string {
    const parts = TALLY.flatMap(([status, word, tone]) => {
        const amount = statuses.filter((each) => each === status).length;
        return amount === 0 ? [] : [paint(tone, `${String(amount)} ${word}`)];
    });
    return lines(parts.join(', '));
}

function lines(...each: string[]): string {
    return each.map((line) => `${line}\n`).join('');
}
