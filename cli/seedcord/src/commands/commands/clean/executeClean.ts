import { connectStep, deleteStep, scanStep } from './cleanSteps';

import type { GuildSummary } from '#core/discord/readBotGuilds';
import type { CleanPresenter } from './CleanPresenter';
import type { CleanOps, CleanScope, ScanResult } from './CleanRunner';

export interface CleanRequest {
    runner: CleanOps;
    scope: CleanScope;
    apply: boolean;
    token: string;
    presenter: CleanPresenter;
    // the guilds the wizard already fetched, used to label guilds the scan only knows by id
    knownGuilds?: GuildSummary[] | undefined;
}

// one guild page, above this --all-guilds means a fetch per guild
export const LARGE_BOT_THRESHOLD = 200;

export type EmptyOutcome = 'all-skipped' | 'no-commands' | 'no-globals' | 'no-overlaps';

export function emptyOutcome(scan: ScanResult, purge: boolean): EmptyOutcome {
    if (scan.scannedGuildCount === 0 && scan.skipped.length > 0) return 'all-skipped';
    if (scan.scannedCommandCount === 0) return 'no-commands';
    if (!purge && scan.globalCommandCount === 0) return 'no-globals';
    return 'no-overlaps';
}

export async function executeClean(request: CleanRequest): Promise<void> {
    const { runner, scope, apply, token, presenter, knownGuilds } = request;

    const { appId, guilds } = await presenter.step(connectStep(), () => runner.resolveTargets(scope, token));

    if (scope.allGuilds && guilds.length > LARGE_BOT_THRESHOLD && !(await presenter.largeBotGuard(guilds.length)))
        return;

    const scan = await presenter.step(scanStep(guilds.length, scope.purge), () =>
        runner.scanGuilds(token, appId, overlayNames(guilds, knownGuilds), scope.purge)
    );

    if (scan.flagged.length === 0) {
        presenter.nothingToClean(scan, emptyOutcome(scan, scope.purge));
        return;
    }

    presenter.preview(scan);

    if (!apply) {
        presenter.dryRunHint();
        return;
    }

    if (!(await presenter.confirmDelete(scan.flagged.length, scan.skipped.length))) return;

    const deletion = await presenter.step(deleteStep(scan.flagged.length), () =>
        runner.applyDeletions(token, appId, scan.flagged)
    );
    presenter.result(deletion);
}

function overlayNames(guilds: GuildSummary[], knownGuilds?: GuildSummary[]): GuildSummary[] {
    if (!knownGuilds?.length) return guilds;
    const known = new Map(knownGuilds.map((guild) => [guild.id, guild.name]));
    return guilds.map((guild) => ({ id: guild.id, name: known.get(guild.id) ?? guild.name }));
}
