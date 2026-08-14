import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { addCommand, execCommand, runPrefix } from '@cli/packageManager';
import { gitPlanFrom, probeGit } from '@scaffold/git';
import { claimTarget } from '@scaffold/target';
import { buildContext } from '@template/context';
import { renderTemplates } from '@template/render';

import type { StepUi } from '@cli/steps';
import type { ScaffoldAnswers } from '@template/context';
import type { AgentName } from 'package-manager-detector';

export type CommandRunner = (command: string, args: string[], cwd: string) => Promise<void>;

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
    gitNotice: string | null;
}

const DEV_PACKAGES = [
    '@seedcord/eslint-config',
    '@seedcord/tsconfig',
    // @seedcord/tsconfig sets types: ['node']
    '@types/node',
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

async function runGitSteps(input: ScaffoldInput, run: CommandRunner): Promise<string | null> {
    try {
        await input.steps.run({ running: 'Setting up git', done: 'Committed' }, async () => {
            await run('git', ['init'], input.target);
            await run('git', ['add', '.'], input.target);
            await run('git', ['commit', '-m', 'chore: create seedcord bot'], input.target);
        });

        return null;
    } catch (error: unknown) {
        const reason = Error.isError(error) ? error.message : String(error);
        // make sure a git failure is non fatal and can't delete the project
        return `${reason} The project is complete and uncommitted.`;
    }
}

async function runInstallSteps(input: ScaffoldInput, run: CommandRunner, isGateway: boolean): Promise<void> {
    const { agent, steps, target } = input;

    const deps = addCommand(agent, runtimePackages(isGateway), false);
    const dev = addCommand(agent, DEV_PACKAGES, true);
    const format = execCommand(agent, ['prettier', '--write', '.']);
    const codegen = execCommand(agent, ['seedcord', 'codegen']);

    await steps.run({ running: 'Installing dependencies', done: 'Dependencies installed' }, async () => {
        await run(deps.command, deps.args, target);
        await run(dev.command, dev.args, target);
    });

    // prettier is only on disk after the install above
    await steps.run({ running: 'Formatting', done: 'Code formatted' }, () => run(format.command, format.args, target));

    await steps.run({ running: 'Generating types', done: 'Types generated' }, () =>
        run(codegen.command, codegen.args, target)
    );
}

export async function scaffold(input: ScaffoldInput, run: CommandRunner): Promise<ScaffoldResult> {
    const { existed } = await claimTarget(input.target);

    // execFile rejects when cwd does not exist
    const parent = dirname(input.target);
    await mkdir(parent, { recursive: true });
    const plan = gitPlanFrom(await probeGit(parent), input.git);

    try {
        const context = buildContext(input.answers, {
            developerUsername: plan.developerUsername,
            runCommand: runPrefix(input.agent)
        });

        const { steps } = input;

        await steps.run({ running: 'Writing files', done: 'Files written' }, async () => {
            await mkdir(input.target, { recursive: true });
            await writeTree(input.target, await renderTemplates(input.templatesRoot, context));
        });

        if (input.install) {
            await runInstallSteps(input, run, context.isGateway);
        } else {
            steps.skip('Dependencies installed');
            steps.skip('Code formatted');
            steps.skip('Types generated');
        }

        let gitNotice = plan.notice;

        if (plan.init) {
            gitNotice = (await runGitSteps(input, run)) ?? gitNotice;
        } else {
            steps.skip('Committed');
        }

        return { installed: input.install, gitNotice };
    } catch (error) {
        await rm(input.target, { recursive: true, force: true });
        if (existed) await mkdir(input.target, { recursive: true });

        throw error;
    }
}
