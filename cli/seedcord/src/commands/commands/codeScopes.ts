import { resolveDeployTarget } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';

import { plural } from '#core/format';
import { CommandScanner } from '#core/modules/CommandScanner';
import { importInstance } from '#core/modules/importInstance';
import { printResolvedConfig } from '#core/output/printResolvedConfig';

import type { ProjectLoader } from '#core/config/ProjectLoader';
import type { ResolvedTarget } from '#core/config/schema';
import type { FoundCommand } from '#core/modules/CommandScanner';
import type { Steps } from '#core/output/Steps';
import type { CommandBody, CommandScopes } from '@seedcord/core/internal';
import type { ILogger } from '@seedcord/types';

export const LOAD_STEPS = ['read config', 'load bot', 'scan'] as const;
type LoadStep = (typeof LOAD_STEPS)[number];

// an empty global list makes a deploy clear the global scope
export interface ScopesInCode extends CommandScopes {
    readonly global: CommandBody[];
    readonly guilds: Map<string, CommandBody[]>;
}

export interface CodeScopes {
    target: ResolvedTarget['kind'];
    instance: string;
    // undefined when the bot sets commands.path to null
    scopes: ScopesInCode | undefined;
}

interface LoadDeps {
    readonly projectLoader: Pick<ProjectLoader, 'open'>;
    readonly logger: ILogger;
}

export function scopesInCode(found: readonly FoundCommand[], configuredGuilds: readonly string[]): ScopesInCode {
    const scopes: ScopesInCode = { global: [], guilds: new Map() };
    for (const { json, meta, className } of found) {
        const target = resolveDeployTarget(meta, configuredGuilds, className);
        if (target.scope === 'global') {
            scopes.global.push(json);
            continue;
        }
        for (const guildId of target.guilds) {
            const inGuild = scopes.guilds.get(guildId) ?? [];
            inGuild.push(json);
            scopes.guilds.set(guildId, inGuild);
        }
    }
    return scopes;
}

export async function loadCodeScopes(
    steps: Steps<LoadStep>,
    { projectLoader, logger }: LoadDeps,
    projectDir: string
): Promise<CodeScopes> {
    await using project = await steps.step('read config', () => projectLoader.open(projectDir));
    const { config, modules } = project;
    printResolvedConfig(steps, config);
    const loaded = { target: config.target.kind, instance: config.instance };

    const instance = await steps.step('load bot', () => importInstance(modules, config.instance));
    const { commands } = instance.config.bot;
    if (commands.path === null) return { ...loaded, scopes: undefined };

    const { path, guilds = [] } = commands;
    steps.detail('commands', paint.path(project.fromRoot(path)));
    if (guilds.length > 0) steps.detail('guilds', guilds.join(', '));

    const found = await steps.step(
        'scan',
        () => new CommandScanner(modules, logger, config.root).scan(path),
        (commands) => plural(commands.length, 'command')
    );
    return { ...loaded, scopes: scopesInCode(found, guilds) };
}
