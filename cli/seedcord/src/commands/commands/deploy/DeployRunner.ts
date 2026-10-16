import { GLOBAL_ID, globalFirst, scopeHashes, scopesDiscordLacks, splitByHash } from '@seedcord/core/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { LOAD_STEPS, loadCodeScopes } from '#commands/commands/codeScopes';
import { DiscordSession } from '#commands/commands/DiscordSession';
import { defaultRunnerDeps } from '#commands/commands/runnerDeps';
import { deployedCommandsFile, lastDeployOf } from '#core/state/deployedCommands';
import { StateFolder } from '#core/state/StateFolder';

import { diffScope } from './diffScope';

import type { DeployTargets } from '#commands/commands/DiscordSession';
import type { RunnerDeps } from '#commands/commands/runnerDeps';
import type { DeployPresenter, ScopePlan } from './DeployPresenter';
import type { CommandScopes, ScopeId } from '@seedcord/core/internal';
import type { DeployedHashes } from '@seedcord/types/internal';

export const DEPLOY_STEPS = [...LOAD_STEPS, 'read discord', 'deploy'] as const;
export type DeployStep = (typeof DEPLOY_STEPS)[number];

interface DeployOptions {
    readonly force?: boolean | undefined;
}

export class DeployRunner {
    constructor(private readonly deps: RunnerDeps) {}

    public static create(): DeployRunner {
        return new DeployRunner(defaultRunnerDeps());
    }

    public async run(presenter: DeployPresenter, { force = false }: DeployOptions = {}): Promise<void> {
        const { target, instance, configFile, scopes } = await loadCodeScopes(presenter, this.deps, process.cwd());
        if (!scopes) throw new SeedcordError(SeedcordErrorCode.CliDeployNoCommandsFolder, [instance]);

        const { session, targets } = await presenter.step('read discord', async () => {
            const session = await DiscordSession.open(this.deps.openDiscord());
            return { session, targets: await session.readTargets([...scopes.keys()]) };
        });
        presenter.detail('app', paint.mute(session.appId));

        const state = StateFolder.besideConfig(configFile, this.deps.logger);
        const hashes = await scopeHashes(scopes);
        const last = force ? undefined : lastDeployOf(state, session.appId);
        const { changed, skipped } = skipUnchanged(scopes, hashes, last, targets);
        presenter.skipped(skipped.map((scope) => titleOf(scope, targets)));

        const plans = plansFor(changed, targets);
        const approved =
            plans.length > 0
                ? await askToDeploy(presenter, plans, changed)
                : await forceSkipped(presenter, skipped, scopes);
        if (!approved) return;

        await presenter.deploy(() => session.deploy(approved, this.deps.logger), approved);
        state.write(deployedCommandsFile, { applicationId: session.appId, scopes: hashes });
        // discord's docs count only new commands as creates. we read that as an existing command keeping its id
        if (target === 'edge' && plans.some(({ diff }) => diff.added.length > 0)) presenter.edgeHint();
    }
}

async function askToDeploy(
    presenter: DeployPresenter,
    plans: readonly ScopePlan[],
    changed: CommandScopes
): Promise<CommandScopes | undefined> {
    presenter.preview(plans);
    return (await presenter.approve(plans)) ? changed : undefined;
}

async function forceSkipped(
    presenter: DeployPresenter,
    skipped: readonly ScopeId[],
    scopes: CommandScopes
): Promise<CommandScopes | undefined> {
    if (skipped.length === 0) {
        presenter.nothingToDeploy();
        return undefined;
    }
    return (await presenter.deployAnyway()) ? scopes : undefined;
}

function skipUnchanged(
    scopes: CommandScopes,
    hashes: DeployedHashes['scopes'],
    last: DeployedHashes | undefined,
    { deployed }: DeployTargets
): { changed: CommandScopes; skipped: ScopeId[] } {
    const { changed, unchanged } = splitByHash(scopes, hashes, last?.scopes);
    const lacking = scopesDiscordLacks(unchanged, deployed);
    return {
        changed: new Map([...changed, ...lacking]),
        skipped: globalFirst(unchanged)
            .filter(([scope]) => !lacking.has(scope))
            .map(([scope]) => scope)
    };
}

function titleOf(scope: ScopeId, { guildNames }: DeployTargets): string {
    return scope === GLOBAL_ID ? 'global' : (guildNames.get(scope) ?? scope);
}

function plansFor(scopes: CommandScopes, targets: DeployTargets): ScopePlan[] {
    return globalFirst(scopes).map(([scope, inCode]) => ({
        title: titleOf(scope, targets),
        inCode,
        diff: diffScope(inCode, targets.deployed.get(scope)?.values() ?? [])
    }));
}
