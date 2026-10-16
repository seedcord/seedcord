import { resolveDeployTarget } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';

import { plural } from '#core/format';
import { CommandScanner } from '#core/modules/CommandScanner';
import { importInstance } from '#core/modules/importInstance';
import { printResolvedConfig } from '#core/output/printResolvedConfig';

import type { RunnerDeps } from '#commands/commands/runnerDeps';
import type { ResolvedTarget } from '#core/config/schema';
import type { FoundCommand } from '#core/modules/CommandScanner';
import type { Steps } from '#core/output/Steps';
import type { CommandBody, CommandScopes } from '@seedcord/core/internal';

export const LOAD_STEPS = ['read config', 'load bot', 'scan'] as const;
type LoadStep = (typeof LOAD_STEPS)[number];

// global is unset when no command in code targets it
export interface ScopesInCode extends CommandScopes {
    readonly global?: CommandBody[];
    readonly guilds: Map<string, CommandBody[]>;
}

interface CodeScopes {
    target: ResolvedTarget['kind'];
    instance: string;
    // undefined when the bot sets commands.path to null
    scopes: ScopesInCode | undefined;
}

type LoadDeps = Pick<RunnerDeps, 'projectLoader'>;

export function scopesInCode(found: readonly FoundCommand[], configuredGuilds: readonly string[]): ScopesInCode {
    const global: CommandBody[] = [];
    const guilds = new Map<string, CommandBody[]>();
    for (const { json, meta, className } of found) {
        const target = resolveDeployTarget(meta, configuredGuilds, className);
        if (target.scope === 'global') {
            global.push(json);
            continue;
        }
        for (const guildId of target.guilds) {
            const inGuild = guilds.get(guildId) ?? [];
            inGuild.push(json);
            guilds.set(guildId, inGuild);
        }
    }
    return global.length > 0 ? { global, guilds } : { guilds };
}

export async function loadCodeScopes(
    steps: Steps<LoadStep>,
    { projectLoader }: LoadDeps,
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
        () => new CommandScanner(modules, config.root).scan(path),
        (commands) => plural(commands.length, 'command')
    );
    return { ...loaded, scopes: scopesInCode(found, guilds) };
}
