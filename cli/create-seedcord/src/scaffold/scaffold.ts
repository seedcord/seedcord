import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { addCommand, execCommand } from '#cli/packageManager';
import { gitPlanFrom, probeGit } from '#scaffold/git';
import { claimTarget } from '#scaffold/target';
import { buildContext } from '#template/context';
import { renderTemplates } from '#template/render';

import type { StepLabel, StepUi } from '#cli/steps';
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
    steps: StepUi;
}

export type ScaffoldResult =
    | { created: false }
    | {
          created: true;
          installed: boolean;
          notices: string[];
          failed: boolean;
      };

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
    'typescript@~6.0',
    // seedcord's peer range
    'vite@^8.3.4'
];
// both are betas, pinned to the versions seedcord's own edge tests run on
const EDGE_DEV_PACKAGES = ['cf@1.0.0-beta.17', '@cloudflare/vite-plugin@2.0.0-beta.v.0'];
const SHARED_PACKAGES = ['@discordjs/builders', 'envapt'];

function runtimePackages({ isGateway }: TemplateContext): string[] {
    const transport = isGateway ? ['@seedcord/gateway', 'discord.js'] : ['@seedcord/http'];
    return [...transport, ...SHARED_PACKAGES];
}

function devPackages({ isEdge }: TemplateContext): string[] {
    return isEdge ? [...DEV_PACKAGES, ...EDGE_DEV_PACKAGES] : DEV_PACKAGES;
}

async function writeTree(target: string, files: { path: string; contents: string }[]): Promise<void> {
    for (const file of files) {
        const destination = join(target, file.path);
        await mkdir(dirname(destination), { recursive: true });
        await writeFile(destination, file.contents, 'utf8');
    }
}

// a throw here would cut the summary in index.ts short
async function succeeded(steps: StepUi, label: StepLabel, work: () => Promise<unknown>): Promise<boolean> {
    try {
        await steps.run(label, work);
        return true;
    } catch {
        // StepUi already printed the failure
        return false;
    }
}

async function gitNoticeFor(input: ScaffoldInput, run: CommandRunner, plan: GitPlan): Promise<string | null> {
    if (!plan.init) {
        input.steps.skip('git');
        return plan.notice;
    }

    const committed = await succeeded(input.steps, 'git', async () => {
        await run('git', ['init'], input.target);
        await run('git', ['add', '.'], input.target);
        await run('git', ['commit', '-m', 'chore: create seedcord bot'], input.target);
    });

    return committed ? plan.notice : 'The project is complete and uncommitted.';
}

interface InstallOutcome {
    installed: boolean;
    notices: string[];
    failed: boolean;
}

function skipInstallSteps(steps: StepUi): InstallOutcome {
    for (const label of ['install', 'format', 'types'] as const) steps.skip(label);

    return { installed: false, notices: [], failed: false };
}

async function runInstallSteps(
    input: ScaffoldInput,
    run: CommandRunner,
    context: TemplateContext
): Promise<InstallOutcome> {
    const { agent, steps, target } = input;

    const deps = addCommand(agent, runtimePackages(context), false);
    const dev = addCommand(agent, devPackages(context), true);
    const format = execCommand(agent, ['prettier', '--write', '.']);
    const codegen = execCommand(agent, ['seedcord', 'codegen']);

    const warnings: string[] = [];
    const collect = (warning: string | null): void => {
        if (warning !== null) warnings.push(warning);
    };

    // cf goes in the first add, since bun runs the project's postinstall after every one
    const installed = await succeeded(steps, 'install', async () => {
        collect(await run(dev.command, dev.args, target));
        collect(await run(deps.command, deps.args, target));
    });

    // npx and bun x fetch a missing binary from the registry
    if (!installed) {
        steps.skip('format');
        steps.skip('types');

        return { installed: false, notices: warnings, failed: true };
    }

    const formatted = await succeeded(steps, 'format', () => run(format.command, format.args, target));
    const generated = await succeeded(steps, 'types', async () => {
        await run(codegen.command, codegen.args, target);
        if (!context.isEdge) return;

        // pnpm and npm skip the project's postinstall on an add
        const bindingTypes = execCommand(agent, ['cf', 'workers', 'types']);
        await run(bindingTypes.command, bindingTypes.args, target);
    });

    return { installed: true, notices: warnings, failed: !formatted || !generated };
}

// scaffold deletes this directory when writing fails; every step after it keeps the tree
async function writeProject(input: ScaffoldInput, context: TemplateContext, existed: boolean): Promise<boolean> {
    const written = await succeeded(input.steps, 'files', async () => {
        await mkdir(input.target, { recursive: true });
        await writeTree(input.target, await renderTemplates(input.templatesRoot, context));
    });

    if (!written) {
        await rm(input.target, { recursive: true, force: true });
        // claimTarget refuses a non-empty target
        if (existed) await mkdir(input.target, { recursive: true });
    }

    return written;
}

export async function scaffold(input: ScaffoldInput, run: CommandRunner): Promise<ScaffoldResult> {
    const { existed } = claimTarget(input.target);

    // execFile rejects when cwd does not exist
    const parent = dirname(input.target);
    await mkdir(parent, { recursive: true });

    const plan = gitPlanFrom(await probeGit(parent), input.answers.git);
    const context = buildContext(input.answers, { developerUsername: plan.developerUsername, agent: input.agent });
    if (!(await writeProject(input, context, existed))) return { created: false };

    const outcome = input.answers.install ? await runInstallSteps(input, run, context) : skipInstallSteps(input.steps);

    const gitNotice = await gitNoticeFor(input, run, plan);

    return {
        created: true,
        installed: outcome.installed,
        notices: gitNotice === null ? outcome.notices : [...outcome.notices, gitNotice],
        failed: outcome.failed
    };
}
