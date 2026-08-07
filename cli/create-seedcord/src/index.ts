import { resolve } from 'node:path';
import process from 'node:process';

import { intro, isCI, isTTY, log, outro, spinner } from '@clack/prompts';

import { helpText } from '@cli/help';
import { runningAgent } from '@cli/packageManager';
import { parseInput } from '@cli/parseInput';
import { reportFailure } from '@cli/reportFailure';
import { runFlow } from '@interview/runFlow';
import { STEPS } from '@interview/steps';
import { execRunner } from '@scaffold/exec';
import { scaffold } from '@scaffold/scaffold';
import { requireScaffoldAnswers } from '@template/context';

// dist/index.mjs and src/index.ts both sit one level under the package root
const TEMPLATES = resolve(import.meta.dirname, '../templates');

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

    const answers = requireScaffoldAnswers(await runFlow(STEPS, input.supplied, { interactive }));
    const target = resolve(process.cwd(), answers.directory);

    const progress = interactive ? spinner() : null;
    progress?.start('Setting up your project');

    const result = await scaffold(
        {
            target,
            templatesRoot: TEMPLATES,
            answers,
            agent: runningAgent(),
            install: input.install,
            git: input.git
        },
        execRunner
    ).catch((error: unknown) => {
        progress?.stop('Setup failed');
        throw error;
    });

    progress?.stop('Project ready');
    if (result.gitNotice !== null) log.warn(result.gitNotice);

    if (interactive) outro(`cd ${answers.directory}`);
}

try {
    await main();
} catch (error) {
    const { code, message } = reportFailure(error);
    if (message !== null) log.error(message);
    process.exit(code);
}
