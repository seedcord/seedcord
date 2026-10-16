import { connectStep, deleteStep, scanStep } from './removeSteps';
import { commandCount } from './scope';

import type { RemoveMode } from './RemoveMode';
import type { RemovePresenter } from './RemovePresenter';
import type { RemoveOps } from './RemoveRunner';
import type { GuildTargets } from './scope';

export interface RemoveRequest {
    ops: RemoveOps;
    mode: RemoveMode;
    guilds: GuildTargets;
    // false prints what would go and deletes nothing
    apply: boolean;
    token: string;
    presenter: RemovePresenter;
}

// one guild page, above this --all-guilds means a fetch per guild
export const LARGE_BOT_THRESHOLD = 200;

export async function executeRemove({ ops, mode, guilds, apply, token, presenter }: RemoveRequest): Promise<void> {
    mode.checkTargets(guilds);

    const { appId, guilds: resolved } = await presenter.step(connectStep(), () => ops.connect(guilds, token));

    if (
        guilds.kind === 'all' &&
        resolved.length > LARGE_BOT_THRESHOLD &&
        !(await presenter.largeBotGuard(resolved.length))
    )
        return;

    const scan = await presenter.step(scanStep(mode), () => ops.scan(token, appId, resolved));
    const selected = mode.select(scan);
    const count = commandCount(selected);

    if (count === 0) {
        presenter.nothing(mode.nothingToRemove(scan));
        return;
    }

    presenter.preview(selected, scan.skipped, mode.noun);

    if (!apply) {
        presenter.dryRunHint();
        return;
    }

    if (!(await presenter.confirmDelete(count, scan.skipped.length))) return;

    const result = await presenter.step(deleteStep(), () => mode.remove(ops, token, appId, selected));
    presenter.result(
        result,
        selected.some(({ scope }) => scope.kind === 'global')
    );
}
