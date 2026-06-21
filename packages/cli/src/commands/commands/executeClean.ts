import { plural } from '@core/format';

import type { CleanOps, CleanScope, DeleteResult, GuildSummary, ScanResult, SkippedGuild } from './CleanRunner';

export interface CleanPresenter {
    status<Value>(message: string, task: () => Promise<Value>, done?: string): Promise<Value>;
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
    /** Names the caller already fetched (the wizard picker), used to label guilds the scan only knows by id. */
    knownGuilds?: GuildSummary[] | undefined;
}

// one guild page, above this --all-guilds means a fetch per guild
export const LARGE_BOT_THRESHOLD = 200;

export type EmptyOutcome = 'all-skipped' | 'no-commands' | 'no-globals' | 'no-overlaps';

/** Why a scan found nothing to delete, so the caller can explain it instead of a bare "nothing to clean". */
export function emptyOutcome(scan: ScanResult, purge: boolean): EmptyOutcome {
    if (scan.scannedGuildCount === 0 && scan.skipped.length > 0) return 'all-skipped';
    if (scan.scannedCommandCount === 0) return 'no-commands';
    if (!purge && scan.globalCommandCount === 0) return 'no-globals';
    return 'no-overlaps';
}

/**
 * The dry-run-then-confirm flow for `commands --clean`. Resolves targets, scans, previews, and only deletes
 * once `apply` is set and the presenter confirms. The presenter owns all output and the two confirmations,
 * so the wizard and the flag path share this flow with different presenters.
 */
export async function executeClean(request: CleanRequest): Promise<void> {
    const { runner, scope, apply, token, presenter, knownGuilds } = request;

    const { appId, guilds } = await presenter.status(
        'Connecting to Discord...',
        () => runner.resolveTargets(scope, token),
        'Connected to Discord.'
    );

    if (scope.allGuilds && guilds.length > LARGE_BOT_THRESHOLD) {
        if (!(await presenter.largeBotGuard(guilds.length))) return;
    }

    const scan = await presenter.status(
        `Scanning ${plural(guilds.length, 'guild')} for commands...`,
        () => runner.scanGuilds(token, appId, overlayNames(guilds, knownGuilds), scope.purge),
        `Scanned ${plural(guilds.length, 'guild')}.`
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

    const deletion = await presenter.status(
        `Deleting ${plural(scan.flagged.length, 'guild command')}...`,
        () => runner.applyDeletions(token, appId, scan.flagged),
        'Deletion complete.'
    );
    presenter.result(deletion, scan.skipped);
}

function overlayNames(guilds: GuildSummary[], knownGuilds?: GuildSummary[]): GuildSummary[] {
    if (!knownGuilds?.length) return guilds;
    const known = new Map(knownGuilds.map((guild) => [guild.id, guild.name]));
    return guilds.map((guild) => ({ id: guild.id, name: known.get(guild.id) ?? guild.name }));
}
