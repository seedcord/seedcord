import { STEPS } from '@interview/steps';

const EXTRA = [
    { name: 'no-install', description: 'skip installing dependencies' },
    { name: 'no-git', description: 'skip git init and the first commit' },
    { name: 'help', description: 'print this' }
];

export function helpText(): string {
    const flags = [...STEPS.map((step) => step.flag), ...EXTRA];
    const width = Math.max(...flags.map((flag) => flag.name.length));
    const lines = flags.map((flag) => `  --${flag.name.padEnd(width)}  ${flag.description}`);

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
