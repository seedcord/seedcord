import { groupByScope, resolveDeployTarget, scopeIdsOf } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';

import { plural } from '#core/format';
import { CommandScanner } from '#core/modules/CommandScanner';
import { importInstance } from '#core/modules/importInstance';
import { printResolvedConfig } from '#core/output/printResolvedConfig';

import type { RunnerDeps } from '#commands/commands/runnerDeps';
import type { ResolvedTarget } from '#core/config/schema';
import type { FoundCommand } from '#core/modules/CommandScanner';
import type { Steps } from '#core/output/Steps';
import type { CommandScopes } from '@seedcord/core/internal';

export const LOAD_STEPS = ['read config', 'load bot', 'scan'] as const;
type LoadStep = (typeof LOAD_STEPS)[number];

interface CodeScopes {
    target: ResolvedTarget['kind'];
    instance: string;
    // undefined when the bot sets commands.path to null
    scopes: CommandScopes | undefined;
}

type LoadDeps = Pick<RunnerDeps, 'projectLoader'>;

// global is left out when no command in code targets it
export function scopesInCode(found: readonly FoundCommand[], configuredGuilds: readonly string[]): CommandScopes {
    const grouped = groupByScope(found, ({ meta, className }) =>
        scopeIdsOf(resolveDeployTarget(meta, configuredGuilds, className))
    );
    return new Map(grouped.entries().map(([scope, commands]) => [scope, commands.map(({ json }) => json)]));
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
    if (guilds.length > 0) steps.detail('guilds', guilds.map((id) => paint.mute(id)).join(', '));

    const found = await steps.step(
        'scan',
        () => new CommandScanner(modules, config.root).scan(path),
        (commands) => plural(commands.length, 'command')
    );
    return { ...loaded, scopes: scopesInCode(found, guilds) };
}
