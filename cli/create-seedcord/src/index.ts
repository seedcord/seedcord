import { resolve } from 'node:path';
import process from 'node:process';
import { styleText } from 'node:util';

import { cancel, intro, isCI, isTTY, log, outro } from '@clack/prompts';

import { helpText } from '@cli/help';
import { runningAgent } from '@cli/packageManager';
import { parseInput } from '@cli/parseInput';
import { reportFailure } from '@cli/reportFailure';
import { clackSteps, silentSteps } from '@cli/steps';
import { dashboardToggles, nextSteps, reproducingCommand } from '@cli/summary';
import { runFlow } from '@interview/runFlow';
import { STEPS } from '@interview/steps';
import { missingNotice, probeCloudflared } from '@scaffold/cloudflared';
import { execRunner } from '@scaffold/exec';
import { scaffold } from '@scaffold/scaffold';
import { requireScaffoldAnswers } from '@template/context';

import type { ScaffoldAnswers } from '@template/context';
import type { AgentName } from 'package-manager-detector';

// dist/index.mjs and src/index.ts are both one level under the package root
const TEMPLATES = resolve(import.meta.dirname, '../templates');

// a pty reporting zero columns makes clack wrap every line into an unbounded string
function hasUsableWidth(): boolean {
    return process.stdout.columns > 0;
}

function isInteractive(): boolean {
    return Boolean(process.stdin.isTTY) && isTTY(process.stdout) && hasUsableWidth() && !isCI();
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
    const agent = runningAgent();

    const result = await scaffold(
        {
            target,
            templatesRoot: TEMPLATES,
            answers,
            agent,
            install: input.install,
            git: input.git,
            steps: interactive ? clackSteps() : silentSteps()
        },
        execRunner
    );

    if (result.gitNotice !== null) log.warn(result.gitNotice);

    await reportOutcome(answers, agent, result.installed, interactive);
}

async function reportOutcome(
    answers: ScaffoldAnswers,
    agent: AgentName,
    installed: boolean,
    interactive: boolean
): Promise<void> {
    if (!interactive) return;

    const toggles = dashboardToggles(answers.capabilities ?? []);
    if (toggles.length > 0) log.warn(toggles.join('\n'));

    if (answers.transport === 'http' && !(await probeCloudflared())) {
        log.warn(missingNotice(process.platform));
    }

    log.step(nextSteps(answers, { agent, installed }).join('\n'));
    log.message(styleText('dim', reproducingCommand(answers, agent)));

    outro('https://guide.seedcord.org');
}

try {
    await main();
} catch (error) {
    const failure = reportFailure(error);

    if (failure.cancelled) cancel(failure.message);
    else log.error(failure.message);

    process.exit(failure.code);
}
