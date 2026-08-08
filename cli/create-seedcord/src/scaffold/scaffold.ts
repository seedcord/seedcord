import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { addCommand, runPrefix } from '@cli/packageManager';
import { gitPlanFrom, probeGit } from '@scaffold/git';
import { claimTarget } from '@scaffold/target';
import { buildContext } from '@template/context';
import { renderTemplates } from '@template/render';

import type { StepLogger, StepUi } from '@cli/steps';
import type { ScaffoldAnswers } from '@template/context';
import type { AgentName } from 'package-manager-detector';

export type CommandRunner = (command: string, args: string[], cwd: string, onLine?: StepLogger) => Promise<void>;

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
    committed: boolean;
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

export async function scaffold(input: ScaffoldInput, run: CommandRunner): Promise<ScaffoldResult> {
    const { existed } = await claimTarget(input.target);
    const plan = gitPlanFrom(await probeGit(dirname(input.target)), input.git);

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
            const deps = addCommand(input.agent, runtimePackages(context.isGateway), false);
            const dev = addCommand(input.agent, DEV_PACKAGES, true);

            await steps.run(
                { running: 'Installing dependencies', done: 'Dependencies installed', stream: true },
                async (onLine) => {
                    await run(deps.command, deps.args, input.target, onLine);
                    await run(dev.command, dev.args, input.target, onLine);
                }
            );

            // prettier is only on disk after the install above
            await steps.run({ running: 'Formatting', done: 'Code formatted' }, () =>
                run(input.agent, ['exec', 'prettier', '--write', '.'], input.target)
            );

            await steps.run({ running: 'Generating types', done: 'Types generated' }, () =>
                run(input.agent, ['exec', 'seedcord', 'codegen'], input.target)
            );
        } else {
            steps.skip('Dependencies installed');
            steps.skip('Code formatted');
            steps.skip('Types generated');
        }

        if (plan.init) {
            await steps.run({ running: 'Setting up git', done: 'Committed' }, async () => {
                await run('git', ['init'], input.target);
                await run('git', ['add', '.'], input.target);
                await run('git', ['commit', '-m', 'chore: create seedcord bot'], input.target);
            });
        } else {
            steps.skip('Committed');
        }

        return { installed: input.install, committed: plan.init, gitNotice: plan.notice };
    } catch (error) {
        await rm(input.target, { recursive: true, force: true });
        if (existed) await mkdir(input.target, { recursive: true });

        throw error;
    }
}
