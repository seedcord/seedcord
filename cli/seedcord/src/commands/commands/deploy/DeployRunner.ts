import { putCommands } from '@seedcord/core/internal';
import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { LOAD_STEPS, loadCodeScopes } from '#commands/commands/codeScopes';
import { readDiscordState } from '#commands/commands/discordState';
import { cliLogger } from '#core/cliLogger';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { restFromEnv } from '#core/discord/restFromEnv';
import { openModuleLoader } from '#core/modules/openModuleLoader';

import { diffScope } from './deployPlan';

import type { ScopesInCode } from '#commands/commands/codeScopes';
import type { DiscordState } from '#commands/commands/discordState';
import type { DeployPresenter, ScopePlan } from './DeployPresenter';
import type { REST } from '@discordjs/rest';
import type { ILogger } from '@seedcord/types';

export const DEPLOY_STEPS = [...LOAD_STEPS, 'read discord', 'deploy'] as const;
export type DeployStep = (typeof DEPLOY_STEPS)[number];

type DiscordRest = Pick<REST, 'get' | 'put' | 'on' | 'off'>;

interface DeployRunnerDeps {
    readonly projectLoader: Pick<ProjectLoader, 'open'>;
    readonly openDiscord: () => DiscordRest;
    readonly logger: ILogger;
}

export class DeployRunner {
    constructor(private readonly deps: DeployRunnerDeps) {}

    public static create(): DeployRunner {
        return new DeployRunner({
            projectLoader: new ProjectLoader(openModuleLoader),
            openDiscord: restFromEnv,
            logger: cliLogger('Commands')
        });
    }

    public async run(presenter: DeployPresenter, projectDir = process.cwd()): Promise<void> {
        const { openDiscord, logger } = this.deps;

        const { target, instance, scopes } = await loadCodeScopes(presenter, this.deps, projectDir);
        if (!scopes) throw new SeedcordError(SeedcordErrorCode.CliDeployNoCommandsFolder, [instance]);

        const guildIds = [...scopes.guilds.keys()];
        const discord = await presenter.step('read discord', () => readDiscordState(openDiscord(), guildIds));
        const { rest, applicationId } = discord;
        presenter.detail('app', applicationId);

        const plans = plansFor(scopes, discord);
        presenter.preview(plans);
        if (!(await presenter.approve(plans))) return;

        await presenter.deploy(() => putCommands(scopes, { rest, applicationId, logger }), scopes);
        if (target === 'edge') presenter.edgeHint();
    }
}

function plansFor(scopes: ScopesInCode, { deployed, guildNames }: DiscordState<DiscordRest>): ScopePlan[] {
    const global: ScopePlan = {
        title: 'global',
        inCode: scopes.global,
        diff: diffScope(scopes.global, deployed.global.values())
    };
    const guilds = scopes.guilds.entries().map(([guildId, inCode]) => ({
        title: guildNames.get(guildId) ?? guildId,
        inCode,
        diff: diffScope(inCode, deployed.guilds.get(guildId)?.values() ?? [])
    }));
    return [global, ...guilds];
}
