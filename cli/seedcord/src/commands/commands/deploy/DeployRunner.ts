import { GLOBAL_ID, globalFirst, planDeploy } from '@seedcord/core/internal';
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

export const DEPLOY_STEPS = [...LOAD_STEPS, 'read discord', 'deploy'] as const;
export type DeployStep = (typeof DEPLOY_STEPS)[number];

export interface DeployOptions {
    readonly force?: boolean | undefined;
    readonly yes?: boolean | undefined;
}

type DeployDeps = RunnerDeps & { readonly state: StateFolder };

export class DeployRunner {
    constructor(private readonly deps: DeployDeps) {}

    public static create(): DeployRunner {
        const deps = defaultRunnerDeps();
        return new DeployRunner({ ...deps, state: new StateFolder(process.cwd(), deps.logger) });
    }

    public async run(presenter: DeployPresenter, { force = false, yes = false }: DeployOptions = {}): Promise<void> {
        const { target, instance, scopes } = await loadCodeScopes(presenter, this.deps, process.cwd());
        if (!scopes) throw new SeedcordError(SeedcordErrorCode.CliDeployNoCommandsFolder, [instance]);

        const { session, targets } = await presenter.step('read discord', async () => {
            const session = await DiscordSession.open(this.deps.openDiscord());
            return { session, targets: await session.readTargets([...scopes.keys()]) };
        });
        presenter.detail('app', paint.mute(session.appId));

        const { state } = this.deps;
        const last = force ? undefined : lastDeployOf(state, session.appId);
        const plan = await planDeploy(scopes, last?.scopes, () => Promise.resolve(targets.deployed));
        presenter.skipped(plan.skipped, (guildId) => guildLabel(guildId, targets));

        const plans = plansFor(plan.toPut, targets);
        const approved =
            plans.length > 0
                ? await askToDeploy(presenter, plans, plan.toPut)
                : await askToForce(presenter, plan.skipped, scopes, yes);
        if (!approved) return;

        state.write(deployedCommandsFile, { applicationId: session.appId, scopes: plan.skippedHashes });
        await presenter.deploy(() => session.deploy(approved, this.deps.logger), approved);
        state.write(deployedCommandsFile, { applicationId: session.appId, scopes: plan.hashes });
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

async function askToForce(
    presenter: DeployPresenter,
    skipped: readonly ScopeId[],
    scopes: CommandScopes,
    yes: boolean
): Promise<CommandScopes | undefined> {
    if (skipped.length === 0 || yes) {
        presenter.nothingToDeploy();
        return undefined;
    }
    return (await presenter.deployAnyway()) ? scopes : undefined;
}

function guildLabel(guildId: string, { guildNames }: DeployTargets): string {
    return guildNames.get(guildId) ?? guildId;
}

function titleOf(scope: ScopeId, targets: DeployTargets): string {
    return scope === GLOBAL_ID ? 'global' : guildLabel(scope, targets);
}

function plansFor(scopes: CommandScopes, targets: DeployTargets): ScopePlan[] {
    return globalFirst(scopes).map(([scope, inCode]) => ({
        title: titleOf(scope, targets),
        inCode,
        diff: diffScope(inCode, targets.deployed.get(scope)?.values() ?? [])
    }));
}
