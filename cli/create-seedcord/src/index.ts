import { resolve } from 'node:path';
import process from 'node:process';

import { cancel, intro, isCI, isTTY, log, note, outro } from '@clack/prompts';
import { paint } from '@seedcord/errors/internal';

import { banner } from '#cli/banner';
import { helpText } from '#cli/help';
import { inviteUrl } from '#cli/invite';
import { runningAgent } from '#cli/packageManager';
import { parseInput, wantsHelp } from '#cli/parseInput';
import { reportFailure } from '#cli/reportFailure';
import { clackSteps, silentSteps } from '#cli/steps';
import { dashboardToggles, nextSteps, reproducingCommand } from '#cli/summary';
import { runFlow } from '#interview/runFlow';
import { STEPS } from '#interview/steps';
import { missingNotice, probeCloudflared } from '#scaffold/cloudflared';
import { execRunner } from '#scaffold/exec';
import { scaffold } from '#scaffold/scaffold';
import { requireScaffoldAnswers } from '#template/context';

import type { ScaffoldAnswers } from '#template/context';
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
    const argv = process.argv.slice(2);

    if (wantsHelp(argv)) {
        process.stdout.write(`${helpText()}\n`);
        return;
    }

    const interactive = isInteractive();
    if (interactive) intro(banner());

    const input = parseInput(argv);
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

// a gutter on the wrapped rows would end up in whatever gets pasted
function copyable(label: string, value: string): void {
    log.message(paint.mute(label));
    log.message(value, { withGuide: false, spacing: 0 });
}

async function reportOutcome(
    answers: ScaffoldAnswers,
    agent: AgentName,
    installed: boolean,
    interactive: boolean
): Promise<void> {
    if (!interactive) return;

    const toggles = dashboardToggles(answers.capabilities ?? []);
    if (toggles.length > 0) note(toggles.join('\n'), 'Dashboard toggles');

    if (answers.transport === 'http' && !(await probeCloudflared())) {
        log.warn(missingNotice(process.platform));
    }

    note(
        nextSteps(answers, { agent, installed })
            .map((step) => paint.mint(step))
            .join('\n'),
        'Next steps'
    );

    const invite = inviteUrl(answers.token);
    if (invite !== null) copyable('Add the bot to a server', paint.sky(invite));

    copyable('Run this setup again', paint.mute(reproducingCommand(answers, agent)));

    outro(paint.sky('https://guide.seedcord.org'));
}

try {
    await main();
} catch (error) {
    const failure = reportFailure(error);

    if (failure.message !== null) log.error(failure.message);
    cancel(failure.closing);

    // process.exit would cut the two lines above short when stdout is a pipe
    process.exitCode = failure.code;
}
