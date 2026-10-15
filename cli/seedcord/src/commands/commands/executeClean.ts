import { connectStep, deleteStep, scanStep } from './cleanSteps';

import type { CleanOps, CleanScope, DeleteResult, GuildSummary, ScanResult, SkippedGuild } from './CleanRunner';
import type { CleanStep } from './cleanSteps';

// the wizard and the flag path print every line and ask every question through one of these
export interface CleanPresenter {
    step<Result>(step: CleanStep<Result>, task: () => Promise<Result>): Promise<Result>;
    preview(scan: ScanResult): void;
    largeBotGuard(guildCount: number): Promise<boolean>;
    confirmDelete(count: number, skippedCount: number): Promise<boolean>;
    result(deletion: DeleteResult, skipped: SkippedGuild[]): void;
    nothingToClean(scan: ScanResult, outcome: EmptyOutcome): void;
    dryRunHint(): void;
}

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
    presenter.result(deletion, scan.skipped);
}

function overlayNames(guilds: GuildSummary[], knownGuilds?: GuildSummary[]): GuildSummary[] {
    if (!knownGuilds?.length) return guilds;
    const known = new Map(knownGuilds.map((guild) => [guild.id, guild.name]));
    return guilds.map((guild) => ({ id: guild.id, name: known.get(guild.id) ?? guild.name }));
}
