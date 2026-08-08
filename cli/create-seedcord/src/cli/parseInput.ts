import { parseArgs } from 'node:util';

import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { applyFlags } from '@interview/applyFlags';
import { STEPS } from '@interview/steps';

import type { Answers } from '@interview/types';

export interface CliInput {
    supplied: Partial<Answers>;
    install: boolean;
    git: boolean;
}

const OPTIONS = {
    ...Object.fromEntries(STEPS.map((step) => [step.flag.name, { type: 'string' }] as const)),
    'no-install': { type: 'boolean' },
    'no-git': { type: 'boolean' }
} as const;

const HELP_FLAGS = new Set(['--help', '-h']);

// parseArgs throws on a bad flag before it ever reads --help
export function wantsHelp(argv: string[]): boolean {
    return argv.some((argument) => HELP_FLAGS.has(argument));
}

function readArgv(argv: string[]): { values: Record<string, unknown>; positionals: string[] } {
    try {
        return parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
    } catch (error) {
        throw new SeedcordError(SeedcordErrorCode.CreateBadUsage, [
            Error.isError(error) ? error.message : 'Could not read the command line.'
        ]);
    }
}

function directoryFrom(positionals: string[], flagged: unknown): string | undefined {
    if (positionals.length > 1) {
        throw new SeedcordError(SeedcordErrorCode.CreateBadUsage, ['Pass one directory at most.']);
    }

    const [bare] = positionals;
    if (bare !== undefined && typeof flagged === 'string' && flagged !== bare) {
        throw new SeedcordError(SeedcordErrorCode.CreateInvalidAnswer, [
            'dir',
            'The directory was given twice. Pass it as an argument or as a flag.'
        ]);
    }

    return typeof flagged === 'string' ? flagged : bare;
}

export function parseInput(argv: string[]): CliInput {
    const { values, positionals } = readArgv(argv);
    const directory = directoryFrom(positionals, values.dir);

    const raw = Object.fromEntries(
        Object.entries({ ...values, dir: directory }).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string'
        )
    );

    return {
        supplied: applyFlags(STEPS, raw),
        install: values['no-install'] !== true,
        git: values['no-git'] !== true
    };
}
