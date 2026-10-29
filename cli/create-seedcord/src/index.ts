import { resolve } from 'node:path';
import process from 'node:process';

import { Prompter, unlessCancelled } from '@seedcord/cli-prompts';
import { paint } from '@seedcord/errors';

import ownPackage from '#package' with { type: 'json' };

import { helpText } from '#cli/help';
import { inviteUrl } from '#cli/invite';
import { messageOf } from '#cli/messageOf';
import { CreateOutput } from '#cli/output';
import { runningAgent } from '#cli/packageManager';
import { parseInput, wantsHelp, wantsVerbose, wantsVersion } from '#cli/parseInput';
import { STEP_LABELS } from '#cli/steps';
import { dashboardToggles, nextSteps, reproducingCommand } from '#cli/summary';
import { version } from '#cli/version';
import { runFlow } from '#interview/runFlow';
import { STEPS } from '#interview/steps';
import { missingNotice, probeCloudflared } from '#scaffold/cloudflared';
import { createExecRunner } from '#scaffold/exec';
import { scaffold } from '#scaffold/scaffold';
import { capabilitiesOf, requireScaffoldAnswers } from '#template/context';

import type { FlowMode } from '#interview/runFlow';
import type { ScaffoldAnswers } from '#template/context';
import type { AgentName } from 'package-manager-detector';

// dist/index.mjs and src/index.ts are both one level under the package root
const TEMPLATES = resolve(import.meta.dirname, '../templates');
const STARTERS = resolve(import.meta.dirname, '../starters');

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
            startersRoot: STARTERS,
            answers,
            agent,
            steps: interactive ? output.stepRows() : output.plainSteps()
        },
        createExecRunner({ verbose: wantsVerbose(argv), color: Boolean(process.stdout.isTTY) })
    );

    if (!result.created) {
        output.nothingCreated();
        process.exitCode = 1;
        return;
    }

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
    if (answers.transport === 'http' && !(await probeCloudflared())) {
        output.warn(missingNotice(process.platform));
    }

    const toggles = dashboardToggles(capabilitiesOf(answers));
    if (toggles.length > 0) {
        output.line();
        output.row('intents', toggles);
    }

    output.line();
    output.row('next', nextSteps(answers, { agent, installed }));
    output.line();

    const invite = inviteUrl(answers.token);
    if (invite !== null) output.row('invite', [paint.sky(invite)]);

    // powershell and cmd split a command wrapped with a trailing `\`
    output.row('again', [paint.bold(reproducingCommand(answers, agent))]);
    output.row('guide', [paint.sky('https://seedcord.org/guide')]);
    output.line();
    output.line(
        paint.mute(
            `A star on GitHub helps more people find seedcord: ${ownPackage.repository.url.replace(/\.git$/, '')}`
        )
    );
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
