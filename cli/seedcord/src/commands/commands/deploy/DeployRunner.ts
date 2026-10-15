import { REST } from '@discordjs/rest';
import { putCommands } from '@seedcord/core/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError, validateDiscordToken } from '@seedcord/errors/internal';
import { Routes } from 'discord-api-types/v10';
import { Envapter } from 'envapt';

import { cliLogger } from '#core/cliLogger';
import { ProjectLoader } from '#core/config/ProjectLoader';
import { applicationOf } from '#core/discord/applicationOf';
import { readDeployed } from '#core/discord/readDeployed';
import { plural } from '#core/format';
import { CommandScanner } from '#core/modules/CommandScanner';
import { importInstance } from '#core/modules/importInstance';
import { openModuleLoader } from '#core/modules/openModuleLoader';
import { printResolvedConfig } from '#core/output/printResolvedConfig';

import { diffScope, scopesInCode } from './deployPlan';

import type { ScopesInCode } from './deployPlan';
import type { DeployPresenter, ScopePlan } from './DeployPresenter';
import type { DeployResult } from '@seedcord/core/internal';
import type { ILogger } from '@seedcord/types';
import type { RESTGetAPIGuildResult } from 'discord-api-types/v10';

export const DEPLOY_STEPS = ['read config', 'load bot', 'scan', 'read discord', 'deploy'] as const;
export type DeployStep = (typeof DEPLOY_STEPS)[number];

type DiscordRest = Pick<REST, 'get' | 'put' | 'on' | 'off'>;

interface DeployRunnerDeps {
    readonly projectLoader: Pick<ProjectLoader, 'open'>;
    readonly openDiscord: () => DiscordRest;
    readonly logger: ILogger;
}

interface DiscordState {
    rest: DiscordRest;
    applicationId: string;
    deployed: DeployResult;
    guildNames: Map<string, string>;
}

export class DeployRunner {
    constructor(private readonly deps: DeployRunnerDeps) {}

    public static create(): DeployRunner {
        return new DeployRunner({
            projectLoader: new ProjectLoader(openModuleLoader),
            // opening the project loads .env first
            openDiscord: () =>
                new REST({ version: '10' }).setToken(validateDiscordToken(Envapter.get('DISCORD_BOT_TOKEN'))),
            logger: cliLogger('Commands')
        });
    }

    public async run(presenter: DeployPresenter, projectDir = process.cwd()): Promise<void> {
        const { projectLoader, openDiscord, logger } = this.deps;

        await using project = await presenter.step('read config', () => projectLoader.open(projectDir));
        const { config, modules } = project;
        printResolvedConfig(presenter, config);

        const instance = await presenter.step('load bot', () => importInstance(modules, config.instance));
        const { commands } = instance.config.bot;
        if (commands.path === null) {
            throw new SeedcordError(SeedcordErrorCode.CliDeployNoCommandsFolder, [config.instance]);
        }
        const { path, guilds = [] } = commands;
        presenter.detail('commands', paint.path(project.fromRoot(path)));
        if (guilds.length > 0) presenter.detail('guilds', guilds.join(', '));

        const found = await presenter.step(
            'scan',
            () => new CommandScanner(modules, logger, config.root).scan(path),
            (commands) => plural(commands.length, 'command')
        );
        const scopes = scopesInCode(found, guilds);

        const discord = await presenter.step('read discord', () => readDiscordState(openDiscord(), scopes));
        const { rest, applicationId } = discord;
        presenter.detail('app', applicationId);

        const plans = plansFor(scopes, discord);
        presenter.preview(plans);
        if (!(await presenter.approve(plans))) return;

        await presenter.deploy(() => putCommands(scopes, { rest, applicationId, logger }), scopes);
        if (config.target.kind === 'edge') presenter.edgeHint();
    }
}

async function readDiscordState(rest: DiscordRest, scopes: ScopesInCode): Promise<DiscordState> {
    const { id } = await applicationOf(rest);
    const [deployed, names] = await Promise.all([
        readDeployed(rest, id, scopes.guilds.keys()),
        Promise.all(scopes.guilds.keys().map(async (guildId) => [guildId, await guildName(rest, guildId)] as const))
    ]);
    return { rest, applicationId: id, deployed, guildNames: new Map(names) };
}

// readDeployed reports a guild the bot cannot reach. the name is only a label
async function guildName(rest: DiscordRest, guildId: string): Promise<string> {
    try {
        // justified: the discord api contract for the guild route
        return ((await rest.get(Routes.guild(guildId))) as RESTGetAPIGuildResult).name;
    } catch {
        return guildId;
    }
}

function plansFor(scopes: ScopesInCode, { deployed, guildNames }: DiscordState): ScopePlan[] {
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
