import process from 'node:process';

import { intro, isCI, isTTY, log, outro } from '@clack/prompts';

import { helpText } from '@cli/help';
import { parseInput } from '@cli/parseInput';
import { reportFailure } from '@cli/reportFailure';
import { runFlow } from '@interview/runFlow';
import { STEPS } from '@interview/steps';

function isInteractive(): boolean {
    return Boolean(process.stdin.isTTY) && isTTY(process.stdout) && !isCI();
}

async function main(): Promise<void> {
    const input = parseInput(process.argv.slice(2));

    if (input.help) {
        process.stdout.write(`${helpText()}\n`);
        return;
    }

    const interactive = isInteractive();
    if (interactive) intro('create-seedcord');

    const answers = await runFlow(STEPS, input.supplied, { interactive });

    if (interactive) outro(`Answers collected for ${String(answers.directory)}.`);
}

try {
    await main();
} catch (error) {
    const { code, message } = reportFailure(error);
    if (message !== null) log.error(message);
    process.exit(code);
}
