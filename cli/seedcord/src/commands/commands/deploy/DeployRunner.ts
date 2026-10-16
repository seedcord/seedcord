import { diffScope, GLOBAL_ID, globalFirst } from '@seedcord/core/internal';
import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { LOAD_STEPS, loadCodeScopes } from '#commands/commands/codeScopes';
import { DiscordSession } from '#commands/commands/DiscordSession';
import { defaultRunnerDeps } from '#commands/commands/runnerDeps';

import type { DeployTargets } from '#commands/commands/DiscordSession';
import type { RunnerDeps } from '#commands/commands/runnerDeps';
import type { DeployPresenter, ScopePlan } from './DeployPresenter';
import type { CommandScopes } from '@seedcord/core/internal';

export const DEPLOY_STEPS = [...LOAD_STEPS, 'read discord', 'deploy'] as const;
export type DeployStep = (typeof DEPLOY_STEPS)[number];

export class DeployRunner {
    constructor(private readonly deps: RunnerDeps) {}

    public static create(): DeployRunner {
        return new DeployRunner(defaultRunnerDeps());
    }

    public async run(presenter: DeployPresenter): Promise<void> {
        const { target, instance, scopes } = await loadCodeScopes(presenter, this.deps, process.cwd());
        if (!scopes) throw new SeedcordError(SeedcordErrorCode.CliDeployNoCommandsFolder, [instance]);

        const { session, targets } = await presenter.step('read discord', async () => {
            const session = await DiscordSession.open(this.deps.openDiscord());
            return { session, targets: await session.readTargets([...scopes.keys()]) };
        });
        presenter.detail('app', paint.mute(session.appId));

        const plans = plansFor(scopes, targets);
        if (plans.length === 0) {
            presenter.nothingToDeploy();
            return;
        }
        presenter.preview(plans);
        if (!(await presenter.approve(plans))) return;

        await presenter.deploy(() => session.deploy(scopes, this.deps.logger), scopes);
        // discord's docs count only new commands as creates. we read that as an existing command keeping its id
        if (target === 'edge' && plans.some(({ diff }) => diff.added.length > 0)) presenter.edgeHint();
    }
}

function plansFor(scopes: CommandScopes, { deployed, guildNames }: DeployTargets): ScopePlan[] {
    return globalFirst(scopes).map(([scope, inCode]) => ({
        title: scope === GLOBAL_ID ? 'global' : (guildNames.get(scope) ?? scope),
        inCode,
        diff: diffScope(inCode, deployed.get(scope)?.values() ?? [])
    }));
}
