import { STEPS } from '#interview/steps';

const EXTRA = [
    { name: 'no-install', description: 'skip installing dependencies' },
    { name: 'no-git', description: 'skip git init and the first commit' },
    { name: 'version', short: 'v', description: 'print the version' },
    { name: 'help', short: 'h', description: 'print this' }
];

function spelling(flag: { name: string; short?: string }): string {
    return flag.short === undefined ? `--${flag.name}` : `-${flag.short}, --${flag.name}`;
}

export function helpText(): string {
    const flags = [...STEPS.map((step) => step.flag), ...EXTRA];
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
