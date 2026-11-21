import { resolveDeployTarget, scopeIdsOf } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { HostPlugins } from '@seedcord/types/internal';

import { openProjectWithSteps } from '#core/config/openProjectWithSteps';
import { plural } from '#core/format';
import { CommandScanner } from '#core/modules/CommandScanner';
import { BOT_STEPS, importBot } from '#core/modules/loadBot';

import type { ResolvedTarget } from '#core/config/schema';
import type { RunnerDeps } from '#core/discord/runnerDeps';
import type { FoundCommand } from '#core/modules/CommandScanner';
import type { Steps } from '#core/output/Steps';
import type { CommandBody, CommandScopes, ScopeId } from '@seedcord/core/internal';
import type { SeedcordInstance } from '@seedcord/types/internal';

export const LOAD_STEPS = [...BOT_STEPS, 'scan'] as const;
type LoadStep = (typeof LOAD_STEPS)[number];

interface CodeScopes {
    target: ResolvedTarget['kind'];
    instancePath: string;
    instance: SeedcordInstance;
    // undefined when the bot sets commands.path to null
    scopes: CommandScopes | undefined;
}

type LoadDeps = Pick<RunnerDeps, 'projectLoader'>;

export function scopesInCode(found: readonly FoundCommand[], configuredGuilds: readonly string[]): CommandScopes {
    const scopes = new Map<ScopeId, CommandBody[]>();
    for (const { json, meta, className } of found) {
        for (const scope of scopeIdsOf(resolveDeployTarget(meta, configuredGuilds, className))) {
            const inScope = scopes.get(scope);
            if (inScope) inScope.push(json);
            else scopes.set(scope, [json]);
        }
    }
    return scopes;
}

export async function loadCodeScopes(
    steps: Steps<LoadStep>,
    { projectLoader }: LoadDeps,
    projectDir: string
): Promise<CodeScopes> {
    await using project = await openProjectWithSteps(steps, projectLoader, { projectDir });
    const { config, modules } = project;
    const instance = await importBot(steps, project);
    const loaded = { target: config.target.kind, instancePath: config.instance, instance };
    const { commands } = instance.config.bot;
    if (commands.path === null) return { ...loaded, scopes: undefined };

    const { path, guilds = [] } = commands;
    steps.detail('commands', paint.path(project.files.layout.resolve(path)));
    if (guilds.length > 0) steps.detail('guilds', guilds.map((id) => paint.mute(id)).join(', '));

    const found = await steps.step(
        'scan',
        () => new CommandScanner(modules, project.files, instance[HostPlugins]).scan(path),
        (commands) => plural(commands.length, 'command')
    );
    return { ...loaded, scopes: scopesInCode(found, guilds) };
}
