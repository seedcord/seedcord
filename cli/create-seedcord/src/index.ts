import { resolve } from 'node:path';
import process from 'node:process';

import { Prompter, unlessCancelled } from '@seedcord/cli-prompts';
import { paint } from '@seedcord/errors';

import { helpText } from '#cli/help';
import { inviteUrl } from '#cli/invite';
import { messageOf } from '#cli/messageOf';
import { CreateOutput } from '#cli/output';
import { runningAgent } from '#cli/packageManager';
import { parseInput, wantsHelp, wantsVersion } from '#cli/parseInput';
import { STEP_LABELS, silentSteps } from '#cli/steps';
import { dashboardToggles, nextSteps, reproducingCommand } from '#cli/summary';
import { version } from '#cli/version';
import { runFlow } from '#interview/runFlow';
import { STEPS } from '#interview/steps';
import { missingNotice, probeCloudflared } from '#scaffold/cloudflared';
import { execRunner } from '#scaffold/exec';
import { scaffold } from '#scaffold/scaffold';
import { requireScaffoldAnswers } from '#template/context';

import type { FlowMode } from '#interview/runFlow';
import type { ScaffoldAnswers } from '#template/context';
import type { AgentName } from 'package-manager-detector';

// dist/index.mjs and src/index.ts are both one level under the package root
const TEMPLATES = resolve(import.meta.dirname, '../templates');

// a pty can report zero columns
function hasUsableWidth(): boolean {
    return process.stdout.columns > 0;
}

function isInteractive(): boolean {
    return (
        process.stdin.isTTY &&
        process.stdout.isTTY &&
        hasUsableWidth() &&
        // some CI fakes a TTY
        !process.env.CI
    );
}

function flowMode(interactive: boolean, output: CreateOutput): FlowMode {
    if (!interactive) return { interactive: false };

    return { interactive: true, prompter: new Prompter(), onAnswer: (label, shown) => output.answer(label, shown) };
}

async function main(output: CreateOutput): Promise<void> {
    const argv = process.argv.slice(2);

    if (wantsHelp(argv)) {
        process.stdout.write(`${helpText()}\n`);
        return;
    }

    if (wantsVersion(argv)) {
        process.stdout.write(`${version}\n`);
        return;
    }

    const interactive = isInteractive();
    if (interactive) output.header();

    const answers = requireScaffoldAnswers(await runFlow(STEPS, parseInput(argv), flowMode(interactive, output)));
    const target = resolve(process.cwd(), answers.directory);
    const agent = runningAgent();

    if (interactive) output.line();

    const result = await scaffold(
        {
            target,
            templatesRoot: TEMPLATES,
            answers,
            agent,
            steps: interactive ? output.steps() : silentSteps()
        },
        execRunner
    );

    for (const notice of result.notices) output.warn(notice);

    if (interactive) await reportOutcome(output, answers, agent, result.installed);

    // a wrapper chaining `&& cd my-bot && pnpm dev` has to stop here
    if (result.failed) process.exitCode = 1;
}

async function reportOutcome(
    output: CreateOutput,
    answers: ScaffoldAnswers,
    agent: AgentName,
    installed: boolean
): Promise<void> {
    const toggles = dashboardToggles(answers.capabilities ?? []);
    if (toggles.length > 0) output.note('Dashboard toggles', toggles);

    if (answers.transport === 'http' && !(await probeCloudflared())) {
        output.warn(missingNotice(process.platform));
    }

    output.note(
        'Next steps',
        nextSteps(answers, { agent, installed }).map((step) => paint.mint(step))
    );

    const invite = inviteUrl(answers.token);
    if (invite !== null) output.copyable('Add the bot to a server', paint.sky(invite));

    output.copyable('Run this setup again', paint.mute(reproducingCommand(answers, agent)));

    output.line();
    output.line(paint.sky('https://seedcord.org/guide'));
    output.line();
}

const output = new CreateOutput([...STEPS.map((step) => step.label), ...STEP_LABELS]);

try {
    await unlessCancelled(output, () => main(output));
} catch (error) {
    output.fail(messageOf(error));

    // process.exit would cut the lines above short when stdout is a pipe
    process.exitCode = 1;
}
