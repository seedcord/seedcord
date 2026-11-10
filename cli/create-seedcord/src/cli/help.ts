import { VERBOSE_FLAG } from '#cli/parseInput';
import { noFlagName } from '#interview/applyFlags';
import { STEPS } from '#interview/steps';

import type { AnyStep } from '#interview/types';

const EXTRA = [
    { name: VERBOSE_FLAG, description: 'show the stack frames a failed step leaves out' },
    { name: 'version', short: 'v', description: 'print the version' },
    { name: 'help', short: 'h', description: 'print this' }
];

function flagsOf({ flag }: AnyStep): { name: string; description: string }[] {
    if (flag.noFlag === undefined) return [flag];

    return [flag, { name: noFlagName(flag.name), description: flag.noFlag }];
}

function spelling(flag: { name: string; short?: string }): string {
    return flag.short === undefined ? `--${flag.name}` : `-${flag.short}, --${flag.name}`;
}

export function helpText(): string {
    const flags = [...STEPS.flatMap(flagsOf), ...EXTRA];
    const width = Math.max(...flags.map((flag) => spelling(flag).length));
    const lines = flags.map((flag) => `  ${spelling(flag).padEnd(width)}  ${flag.description}`);

    return [
        'Usage: create-seedcord [directory] [flags]',
        '',
        'Every question the interview asks has a flag. Pass them all to skip the interview.',
        '',
        ...lines,
        '',
        'npm needs a -- before the flags: npm create seedcord my-bot -- --transport gateway'
    ].join('\n');
}
