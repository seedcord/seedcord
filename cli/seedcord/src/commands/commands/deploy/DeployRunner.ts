import { putCommands } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { LOAD_STEPS, loadCodeScopes } from '#commands/commands/codeScopes';
import { readDiscordState } from '#commands/commands/discordState';
import { defaultRunnerDeps } from '#commands/commands/runnerDeps';

import { diffScope } from './deployPlan';

import type { ScopesInCode } from '#commands/commands/codeScopes';
import type { DiscordState } from '#commands/commands/discordState';
import type { RunnerDeps } from '#commands/commands/runnerDeps';
import type { DeployPresenter, ScopePlan } from './DeployPresenter';

export const DEPLOY_STEPS = [...LOAD_STEPS, 'read discord', 'deploy'] as const;
export type DeployStep = (typeof DEPLOY_STEPS)[number];

export class DeployRunner {
    constructor(private readonly deps: RunnerDeps) {}

    public static create(): DeployRunner {
        return new DeployRunner(defaultRunnerDeps());
    }

    public async run(presenter: DeployPresenter, projectDir = process.cwd()): Promise<void> {
        const { openDiscord, logger } = this.deps;

        const { target, instance, scopes } = await loadCodeScopes(presenter, this.deps, projectDir);
        if (!scopes) throw new SeedcordError(SeedcordErrorCode.CliDeployNoCommandsFolder, [instance]);

        const guildIds = [...scopes.guilds.keys()];
        const { rest, discord } = await presenter.step('read discord', async () => {
            const rest = openDiscord();
            return { rest, discord: await readDiscordState(rest, guildIds) };
        });
        const { applicationId } = discord;
        presenter.detail('app', applicationId);

        const plans = plansFor(scopes, discord);
        presenter.preview(plans);
        if (!(await presenter.approve(plans))) return;

        await presenter.deploy(() => putCommands(scopes, { rest, applicationId, logger }), scopes);
        // a command that already exists keeps its id through a bulk overwrite based on the docs
        if (target === 'edge' && plans.some(({ diff }) => diff.added.length > 0)) presenter.edgeHint();
    }
}

function plansFor(scopes: ScopesInCode, { deployed, guildNames }: DiscordState): ScopePlan[] {
    const guilds = scopes.guilds.entries().map(([guildId, inCode]) => ({
        title: guildNames.get(guildId) ?? guildId,
        inCode,
        diff: diffScope(inCode, deployed.guilds.get(guildId)?.values() ?? [])
    }));
    if (!scopes.global) return [...guilds];
    const global = { title: 'global', inCode: scopes.global, diff: diffScope(scopes.global, deployed.global.values()) };
    return [global, ...guilds];
}
