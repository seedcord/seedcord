import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { isPrerelease } from '#cli/version';
import { gitPlanFrom, probeGit } from '#scaffold/git';
import { claimTarget } from '#scaffold/target';
import { buildContext } from '#template/context';
import { copyStarters, renderTemplates } from '#template/render';

import type { PackageManager } from '#cli/PackageManager';
import type { StepLabel, StepUi } from '#cli/steps';
import type { GitPlan } from '#scaffold/git';
import type { ScaffoldAnswers, TemplateContext } from '#template/context';
import type { ResolvedCommand } from 'package-manager-detector';

// the resolved string is a warning worth printing
export type CommandRunner = (command: string, args: string[], cwd: string) => Promise<string | null>;

export interface ScaffoldInput {
    target: string;
    templatesRoot: string;
    startersRoot: string;
    answers: ScaffoldAnswers;
    manager: PackageManager;
    steps: StepUi;
}

interface DependencyOutcome {
    pending: ResolvedCommand[];
    notices: string[];
    failed: boolean;
}

export type ScaffoldResult = { created: false } | ({ created: true } & DependencyOutcome);

const BASE_DEV_PACKAGES = [
    '@seedcord/tsconfig',
    // @seedcord/tsconfig sets types: ['node']
    '@types/node',
    'seedcord',
    // typescript-eslint 8 caps typescript below 6.1
    'typescript@~6.0',
    // seedcord's peer range
    'vite@^8.3.4'
];

const ESLINT_DEV_PACKAGES = [
    '@seedcord/eslint-config',
    // @seedcord/eslint-config takes this as a required peer
    'eslint',
    // eslint reads eslint.config.ts through jiti
    'jiti',
    'prettier'
];

const BIOME_DEV_PACKAGES = ['@biomejs/biome'];

const OX_DEV_PACKAGES = ['oxlint', 'oxfmt'];

// both are betas, pinned to the versions seedcord's own edge tests run on
const EDGE_DEV_PACKAGES = ['cf@1.0.0-beta.26', '@cloudflare/vite-plugin@2.0.0-beta.v.8'];
// the starters import ButtonStyle and TextInputStyle from discord-api-types
const SHARED_PACKAGES = ['@discordjs/builders', 'discord-api-types', 'envapt'];

const NEXT_TAGGED_PACKAGES = new Set(['seedcord', '@seedcord/gateway', '@seedcord/http']);

function runtimePackages({ isGateway }: TemplateContext): string[] {
    const transport = isGateway ? ['@seedcord/gateway', 'discord.js'] : ['@seedcord/http'];
    return [...transport, ...SHARED_PACKAGES];
}

function devPackages({ isEdge, tools }: TemplateContext): string[] {
    const toolPackages = tools.isBiome ? BIOME_DEV_PACKAGES : tools.isOx ? OX_DEV_PACKAGES : ESLINT_DEV_PACKAGES;

    const base = [...BASE_DEV_PACKAGES, ...toolPackages];
    return isEdge ? [...base, ...EDGE_DEV_PACKAGES] : base;
}

function withReleaseTag(name: string): string {
    return isPrerelease && NEXT_TAGGED_PACKAGES.has(name) ? `${name}@next` : name;
}

// cf is in the first add, since bun runs the project's postinstall after every one
function addCommands(manager: PackageManager, context: TemplateContext): ResolvedCommand[] {
    return [
        manager.add(devPackages(context).map(withReleaseTag), true),
        manager.add(runtimePackages(context).map(withReleaseTag), false)
    ];
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
        // StepUi has already printed the failure
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

async function formatAndWriteTypes(
    { manager, steps, target }: ScaffoldInput,
    run: CommandRunner,
    { isEdge, tools }: TemplateContext
): Promise<boolean> {
    const formatArgs = tools.isBiome
        ? ['biome', 'format', '--write', '.']
        : tools.isOx
          ? ['oxfmt', '.']
          : ['prettier', '--write', '.'];

    const format = manager.exec(formatArgs);
    const codegen = manager.exec(['seedcord', 'codegen']);

    const formatted = await succeeded(steps, 'format', () => run(format.command, format.args, target));
    const generated = await succeeded(steps, 'types', async () => {
        await run(codegen.command, codegen.args, target);
        if (!isEdge) return;

        // pnpm and npm skip the project's postinstall on an add
        const bindingTypes = manager.exec(['cf', 'workers', 'types']);
        await run(bindingTypes.command, bindingTypes.args, target);
    });

    return formatted && generated;
}

async function setUpDependencies(
    input: ScaffoldInput,
    run: CommandRunner,
    context: TemplateContext
): Promise<DependencyOutcome> {
    const { answers, manager, steps, target } = input;

    const adds = addCommands(manager, context);
    const commands = answers.install ? adds : adds.map((add) => manager.lockfileOnly(add));

    const notices: string[] = [];
    const added = await succeeded(steps, 'deps', async () => {
        for (const { command, args } of commands) {
            const warning = await run(command, args, target);
            if (warning !== null) notices.push(warning);
        }
    });

    // npx and bun x fetch a missing binary from the registry
    if (!added || !answers.install) {
        steps.skip('format');
        steps.skip('types');
        return { pending: added ? [manager.install()] : adds, notices, failed: !added };
    }

    return { pending: [], notices, failed: !(await formatAndWriteTypes(input, run, context)) };
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
    const context = buildContext(input.answers, { developerUsername: plan.developerUsername, manager: input.manager });
    if (!(await writeProject(input, context, existed))) return { created: false };

    const outcome = await setUpDependencies(input, run, context);
    const gitNotice = await gitNoticeFor(input, run, plan);

    return {
        created: true,
        ...outcome,
        notices: gitNotice === null ? outcome.notices : [...outcome.notices, gitNotice]
    };
}
