import { parseArgs } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';

import { applyFlags, noFlagName } from '#interview/applyFlags';
import { STEPS } from '#interview/steps';

import type { Answers } from '#interview/types';

export const VERBOSE_FLAG = 'verbose';

const OPTIONS = Object.fromEntries([
    ...STEPS.flatMap(({ flag }) => [
        [flag.name, { type: 'parse' in flag ? 'string' : 'boolean' }] as const,
        ...(flag.noFlag === undefined ? [] : [[noFlagName(flag.name), { type: 'boolean' }] as const])
    ]),
    [VERBOSE_FLAG, { type: 'boolean' }] as const
]);

const HELP_FLAGS = new Set(['--help', '-h']);
const VERSION_FLAGS = new Set(['--version', '-v']);

// parseArgs throws on a bad flag before it ever reads --help
export function wantsHelp(argv: string[]): boolean {
    return argv.some((argument) => HELP_FLAGS.has(argument));
}

export function wantsVersion(argv: string[]): boolean {
    return argv.some((argument) => VERSION_FLAGS.has(argument));
}

export function wantsVerbose(argv: string[]): boolean {
    return argv.includes(`--${VERBOSE_FLAG}`);
}

function readArgv(argv: string[]): { values: Record<string, unknown>; positionals: string[] } {
    try {
        return parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
    } catch (error) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateBadUsage, [
            Error.isError(error) ? error.message : 'Could not read the command line.'
        ]);
    }
}

function directoryFrom(positionals: string[], flagged: unknown): string | undefined {
    if (positionals.length > 1) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateBadUsage, ['Pass one directory at most.']);
    }

    const [bare] = positionals;
    if (bare !== undefined && typeof flagged === 'string' && flagged !== bare) {
        throw new SeedcordTypeError(SeedcordErrorCode.CreateInvalidAnswer, [
            'dir',
            'The directory was given twice. Pass it as an argument or as a flag.'
        ]);
    }

    return typeof flagged === 'string' ? flagged : bare;
}

export function parseInput(argv: string[]): Partial<Answers> {
    const { values, positionals } = readArgv(argv);
    const directory = directoryFrom(positionals, values.dir);

    const raw = Object.fromEntries(
        Object.entries<unknown>({ ...values, dir: directory }).filter(
            (entry): entry is [string, string | boolean] =>
                typeof entry[1] === 'string' || typeof entry[1] === 'boolean'
        )
    );

    return applyFlags(STEPS, raw);
}
