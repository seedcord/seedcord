import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { addCommand, execCommand, installCommand, lockfileOnlyFlag } from '#cli/packageManager';
import { isPrerelease } from '#cli/version';
import { gitPlanFrom, probeGit } from '#scaffold/git';
import { claimTarget } from '#scaffold/target';
import { buildContext } from '#template/context';
import { copyStarters, renderTemplates } from '#template/render';

import type { StepLabel, StepUi } from '#cli/steps';
import type { GitPlan } from '#scaffold/git';
import type { ScaffoldAnswers, TemplateContext } from '#template/context';
import type { AgentName, ResolvedCommand } from 'package-manager-detector';

// the resolved string is a warning worth printing
export type CommandRunner = (command: string, args: string[], cwd: string) => Promise<string | null>;

export interface ScaffoldInput {
    target: string;
    templatesRoot: string;
    startersRoot: string;
    answers: ScaffoldAnswers;
    agent: AgentName;
    steps: StepUi;
}

export type ScaffoldResult =
    | { created: false }
    | {
          created: true;
          pending: ResolvedCommand[];
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
    // typescript-eslint 8 caps typescript below 6.1
    'typescript@~6.0',
    // seedcord's peer range
    'vite@^8.3.4'
];
// both are betas, pinned to the versions seedcord's own edge tests run on
const EDGE_DEV_PACKAGES = ['cf@1.0.0-beta.26', '@cloudflare/vite-plugin@2.0.0-beta.v.8'];
// the starters import ButtonStyle and TextInputStyle from discord-api-types
const SHARED_PACKAGES = ['@discordjs/builders', 'discord-api-types', 'envapt'];

function tagged(name: string): string {
    return isPrerelease ? `${name}@next` : name;
}

function runtimePackages({ isGateway }: TemplateContext): string[] {
    const transport = isGateway ? [tagged('@seedcord/gateway'), 'discord.js'] : [tagged('@seedcord/http')];
    return [...transport, ...SHARED_PACKAGES];
}

function devPackages({ isEdge }: TemplateContext): string[] {
    const packages = [tagged('seedcord'), ...DEV_PACKAGES];
    return isEdge ? [...packages, ...EDGE_DEV_PACKAGES] : packages;
}

// cf goes in the first add, since bun runs the project's postinstall after every one
function addCommands(agent: AgentName, context: TemplateContext): ResolvedCommand[] {
    return [addCommand(agent, devPackages(context), true), addCommand(agent, runtimePackages(context), false)];
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
    pending: ResolvedCommand[];
    notices: string[];
    failed: boolean;
}

function skipAfterDeps(steps: StepUi): void {
    steps.skip('format');
    steps.skip('types');
}

interface AddOutcome {
    added: boolean;
    notices: string[];
}

async function runAdds(
    input: ScaffoldInput,
    run: CommandRunner,
    commands: readonly ResolvedCommand[]
): Promise<AddOutcome> {
    const notices: string[] = [];

    const added = await succeeded(input.steps, 'deps', async () => {
        for (const { command, args } of commands) {
            const warning = await run(command, args, input.target);
            if (warning !== null) notices.push(warning);
        }
    });

    return { added, notices };
}

async function installDependencies(
    input: ScaffoldInput,
    run: CommandRunner,
    context: TemplateContext
): Promise<InstallOutcome> {
    const { agent, steps, target } = input;

    const adds = addCommands(agent, context);
    const format = execCommand(agent, ['prettier', '--write', '.']);
    const codegen = execCommand(agent, ['seedcord', 'codegen']);
    const { added, notices } = await runAdds(input, run, adds);

    // npx and bun x fetch a missing binary from the registry
    if (!added) {
        skipAfterDeps(steps);
        return { pending: adds, notices, failed: true };
    }

    const formatted = await succeeded(steps, 'format', () => run(format.command, format.args, target));
    const generated = await succeeded(steps, 'types', async () => {
        await run(codegen.command, codegen.args, target);
        if (!context.isEdge) return;

        // pnpm and npm skip the project's postinstall on an add
        const bindingTypes = execCommand(agent, ['cf', 'workers', 'types']);
        await run(bindingTypes.command, bindingTypes.args, target);
    });

    return { pending: [], notices, failed: !formatted || !generated };
}

async function writeLockfile(
    input: ScaffoldInput,
    run: CommandRunner,
    context: TemplateContext
): Promise<InstallOutcome> {
    const { agent, steps } = input;

    const adds = addCommands(agent, context);
    const flag = lockfileOnlyFlag(agent);

    if (flag === null) {
        steps.skip('deps');
        skipAfterDeps(steps);
        return { pending: adds, notices: [], failed: false };
    }

    const lockfileAdds = adds.map((add) => ({ command: add.command, args: [...add.args, flag] }));
    const { added, notices } = await runAdds(input, run, lockfileAdds);
    skipAfterDeps(steps);

    return { pending: added ? [installCommand(agent)] : adds, notices, failed: false };
}

// scaffold deletes this directory when writing fails; every step after it keeps the tree
async function writeProject(input: ScaffoldInput, context: TemplateContext, existed: boolean): Promise<boolean> {
    const written = await succeeded(input.steps, 'files', async () => {
        await mkdir(input.target, { recursive: true });
        const files = await Promise.all([
            renderTemplates(input.templatesRoot, context),
            copyStarters(input.startersRoot, context)
        ]);
        await writeTree(input.target, files.flat());
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

    const outcome = input.answers.install
        ? await installDependencies(input, run, context)
        : await writeLockfile(input, run, context);

    const gitNotice = await gitNoticeFor(input, run, plan);

    return {
        created: true,
        pending: outcome.pending,
        notices: gitNotice === null ? outcome.notices : [...outcome.notices, gitNotice],
        failed: outcome.failed
    };
}
