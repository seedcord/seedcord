import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { addCommand, execCommand, runPrefix } from '#cli/packageManager';
import { gitPlanFrom, probeGit } from '#scaffold/git';
import { claimTarget } from '#scaffold/target';
import { buildContext } from '#template/context';
import { renderTemplates } from '#template/render';

import type { StepLabels, StepUi } from '#cli/steps';
import type { GitPlan } from '#scaffold/git';
import type { ScaffoldAnswers, TemplateContext } from '#template/context';
import type { AgentName } from 'package-manager-detector';

// the resolved string is a warning worth printing
export type CommandRunner = (command: string, args: string[], cwd: string) => Promise<string | null>;

export interface ScaffoldInput {
    target: string;
    templatesRoot: string;
    answers: ScaffoldAnswers;
    agent: AgentName;
    install: boolean;
    git: boolean;
    steps: StepUi;
}

export interface ScaffoldResult {
    installed: boolean;
    notices: string[];
    failed: boolean;
}

const INSTALL_STEPS = {
    install: { running: 'Installing dependencies', done: 'Dependencies installed' },
    format: { running: 'Formatting', done: 'Code formatted' },
    codegen: { running: 'Generating types', done: 'Types generated' }
} satisfies Record<string, StepLabels>;

const DEV_PACKAGES = [
    '@seedcord/eslint-config',
    '@seedcord/tsconfig',
    // @seedcord/tsconfig sets types: ['node']
    '@types/node',
    // @seedcord/eslint-config takes this as a required peer
    'eslint',
    // eslint reads eslint.config.ts through jiti
    'jiti',
    'prettier',
    'seedcord',
    // typescript-eslint 8 caps typescript below 6.1
    'typescript@~6.0'
];
const SHARED_PACKAGES = ['@discordjs/builders', 'envapt'];

function runtimePackages(isGateway: boolean): string[] {
    const transport = isGateway ? ['@seedcord/gateway', 'discord.js'] : ['@seedcord/http'];
    return [...transport, ...SHARED_PACKAGES];
}

async function writeTree(target: string, files: { path: string; contents: string }[]): Promise<void> {
    for (const file of files) {
        const destination = join(target, file.path);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, file.contents, 'utf8');
    }
}

// a throw here would cut the summary in index.ts short
async function runStep(steps: StepUi, labels: StepLabels, work: () => Promise<unknown>): Promise<string | null> {
    try {
        await steps.run(labels, work);
        return null;
    } catch (error: unknown) {
        return Error.isError(error) ? error.message : String(error);
    }
}

async function gitNoticeFor(input: ScaffoldInput, run: CommandRunner, plan: GitPlan): Promise<string | null> {
    if (!plan.init) {
        input.steps.skip('Committed');
        return plan.notice;
    }

    const reason = await runStep(input.steps, { running: 'Setting up git', done: 'Committed' }, async () => {
        await run('git', ['init'], input.target);
        await run('git', ['add', '.'], input.target);
        await run('git', ['commit', '-m', 'chore: create seedcord bot'], input.target);
    });

    if (reason === null) return plan.notice;

    return `${reason} The project is complete and uncommitted.`;
}

interface InstallOutcome {
    installed: boolean;
    notices: string[];
    failed: boolean;
}

function skipInstallSteps(steps: StepUi): InstallOutcome {
    for (const labels of Object.values(INSTALL_STEPS)) steps.skip(labels.done);

    return { installed: false, notices: [], failed: false };
}

async function runInstallSteps(input: ScaffoldInput, run: CommandRunner, isGateway: boolean): Promise<InstallOutcome> {
    const { agent, steps, target } = input;

    const deps = addCommand(agent, runtimePackages(isGateway), false);
    const dev = addCommand(agent, DEV_PACKAGES, true);
    const format = execCommand(agent, ['prettier', '--write', '.']);
    const codegen = execCommand(agent, ['seedcord', 'codegen']);

    const warnings: string[] = [];
    const collect = (warning: string | null): void => {
        if (warning !== null) warnings.push(warning);
    };

    const install = await runStep(steps, INSTALL_STEPS.install, async () => {
        collect(await run(deps.command, deps.args, target));
        collect(await run(dev.command, dev.args, target));
    });

    // npx and bun x fetch a missing binary from the registry
    if (install !== null) {
        steps.skip(INSTALL_STEPS.format.done);
        steps.skip(INSTALL_STEPS.codegen.done);

        return { installed: false, notices: [install, ...warnings], failed: true };
    }

    const formatted = await runStep(steps, INSTALL_STEPS.format, () => run(format.command, format.args, target));
    const generated = await runStep(steps, INSTALL_STEPS.codegen, () => run(codegen.command, codegen.args, target));
    const failures = [formatted, generated].filter((reason) => reason !== null);

    return { installed: true, notices: [...warnings, ...failures], failed: failures.length > 0 };
}

// scaffold deletes this directory when writing fails; every step after it keeps the tree
async function writeProject(input: ScaffoldInput, plan: GitPlan, existed: boolean): Promise<TemplateContext> {
    const context = buildContext(input.answers, {
        developerUsername: plan.developerUsername,
        runCommand: runPrefix(input.agent)
    });

    try {
        await input.steps.run({ running: 'Writing files', done: 'Files written' }, async () => {
            await mkdir(input.target, { recursive: true });
            await writeTree(input.target, await renderTemplates(input.templatesRoot, context));
        });

        return context;
    } catch (error) {
        await rm(input.target, { recursive: true, force: true });
        // claimTarget refuses a non-empty target
        if (existed) await mkdir(input.target, { recursive: true });

        throw error;
    }
}

export async function scaffold(input: ScaffoldInput, run: CommandRunner): Promise<ScaffoldResult> {
    const { existed } = await claimTarget(input.target);

    // execFile rejects when cwd does not exist
    const parent = dirname(input.target);
    await mkdir(parent, { recursive: true });

    const plan = gitPlanFrom(await probeGit(parent), input.git);
    const context = await writeProject(input, plan, existed);

    const outcome = input.install
        ? await runInstallSteps(input, run, context.isGateway)
        : skipInstallSteps(input.steps);

    const gitNotice = await gitNoticeFor(input, run, plan);

    return {
        installed: outcome.installed,
        notices: gitNotice === null ? outcome.notices : [...outcome.notices, gitNotice],
        failed: outcome.failed
    };
}
