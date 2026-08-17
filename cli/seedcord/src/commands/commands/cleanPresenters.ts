import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';

import { plural } from '#core/format';
import { confirm, log, note, outro, spinner } from '#core/prompts';

import { confirmCount } from './confirm';

import type { Flagged } from './classify';
import type { DeleteResult, ScanResult, SkippedGuild } from './CleanRunner';
import type { CleanPresenter, EmptyOutcome } from './executeClean';
import type { ILogger } from '@seedcord/types';

interface GuildGroup {
    guildName: string;
    commands: Flagged[];
}

function groupByGuild(flagged: Flagged[]): GuildGroup[] {
    const groups = new Map<string, GuildGroup>();
    for (const command of flagged) {
        const group = groups.get(command.guildId) ?? { guildName: command.guildName, commands: [] };
        group.commands.push(command);
        groups.set(command.guildId, group);
    }
    return [...groups.values()];
}

function skippedSummary(skipped: SkippedGuild[]): string {
    return `Could not read ${plural(skipped.length, 'guild')} (${skipped.map((s) => s.guildName).join(', ')}).`;
}

function emptyLines(scan: ScanResult, outcome: EmptyOutcome): { info: string[]; outro: string } {
    const variants: Record<EmptyOutcome, { info: string[]; outro: string }> = {
        'all-skipped': {
            info: [],
            outro: `Could not read any of the ${plural(scan.skipped.length, 'guild')}, nothing was scanned.`
        },
        'no-commands': {
            info: [],
            outro: `Scanned ${plural(scan.scannedGuildCount, 'guild')} with no guild commands deployed. Nothing to clean.`
        },
        'no-globals': {
            info: [
                'This app has no global commands, so nothing can duplicate one.',
                'Re-run and choose a full reset to remove guild commands.'
            ],
            outro: 'Nothing to clean.'
        },
        'no-overlaps': {
            info: [
                `Scanned ${plural(scan.scannedCommandCount, 'guild command')} across ${plural(scan.scannedGuildCount, 'guild')}. None duplicate a global command.`,
                'Re-run and choose a full reset to remove all of them.'
            ],
            outro: 'Nothing to clean.'
        }
    };
    return variants[outcome];
}

/** Renders the clean flow as clack framed output for an interactive terminal. */
export class InteractivePresenter implements CleanPresenter {
    public async status<Value>(message: string, task: () => Promise<Value>, done?: string): Promise<Value> {
        const status = spinner();
        status.start(message);
        try {
            return await task();
        } finally {
            status.stop(done ?? message);
        }
    }

    public preview(scan: ScanResult): void {
        const body = groupByGuild(scan.flagged)
            .map((group) => `${paint.bold(group.guildName)}\n${group.commands.map((c) => `  ${c.name}`).join('\n')}`)
            .join('\n\n');
        note(body, `Will delete ${plural(scan.flagged.length, 'guild command')} (nothing deleted yet)`);
        if (scan.skipped.length > 0) log.warn(skippedSummary(scan.skipped));
    }

    public largeBotGuard(guildCount: number): Promise<boolean> {
        return confirm({
            message: `The bot is in ${guildCount} guilds. Scan all of them? This makes ${guildCount} requests.`,
            initialValue: false
        });
    }

    public confirmDelete(count: number, skippedCount: number): Promise<boolean> {
        const skips = skippedCount > 0 ? ` ${plural(skippedCount, 'guild')} could not be read.` : '';
        return confirm({
            message: `Delete ${plural(count, 'guild command')}? This cannot be undone.${skips}`,
            initialValue: false
        });
    }

    public result(deletion: DeleteResult, skipped: SkippedGuild[]): void {
        for (const failure of deletion.failed) {
            log.warn(`Could not delete ${failure.command.name} in ${failure.command.guildName} (${failure.reason}).`);
        }
        if (skipped.length > 0) log.warn(skippedSummary(skipped));
        outro(`Deleted ${plural(deletion.deleted, 'guild command')}. Global commands untouched.`);
    }

    public nothingToClean(scan: ScanResult, outcome: EmptyOutcome): void {
        const lines = emptyLines(scan, outcome);
        for (const line of lines.info) log.info(line);
        outro(lines.outro);
    }

    public dryRunHint(): void {
        outro('Dry run, nothing was deleted.');
    }
}

/** Renders the clean flow as plain logger lines for the flag, CI, and non-TTY path. */
export class FlagPresenter implements CleanPresenter {
    constructor(
        private readonly logger: ILogger,
        private readonly yes: boolean
    ) {}

    public status<Value>(message: string, task: () => Promise<Value>): Promise<Value> {
        this.logger.info(message);
        return task();
    }

    public preview(scan: ScanResult): void {
        this.logger.info(paint.bold(`${plural(scan.flagged.length, 'guild command')} selected for deletion`));
        for (const group of groupByGuild(scan.flagged)) {
            this.logger.info(paint.sky(group.guildName));
            for (const command of group.commands) this.logger.info(`  ${command.name}`);
        }
        for (const skip of scan.skipped) this.logger.warn(`Skipped ${skip.guildName} (${skip.reason}).`);
    }

    public largeBotGuard(guildCount: number): Promise<boolean> {
        if (this.yes) return Promise.resolve(true);
        return Promise.reject(new SeedcordError(SeedcordErrorCode.CliCleanLargeBotUnconfirmed, [guildCount]));
    }

    // clack confirm needs a tty, so this prompts for a typed count instead
    public confirmDelete(count: number, skippedCount: number): Promise<boolean> {
        if (this.yes) return Promise.resolve(true);
        // readline cannot prompt without a terminal
        if (!process.stdin.isTTY || !process.stdout.isTTY) {
            return Promise.reject(new SeedcordError(SeedcordErrorCode.CliCleanApplyNeedsYes));
        }
        if (skippedCount > 0)
            this.logger.warn(`${plural(skippedCount, 'guild')} could not be read and were not scanned.`);
        return confirmCount(count, this.logger);
    }

    public result(deletion: DeleteResult, skipped: SkippedGuild[]): void {
        for (const failure of deletion.failed) {
            this.logger.warn(
                `Could not delete ${failure.command.name} in ${failure.command.guildName} (${failure.reason}).`
            );
        }
        if (skipped.length > 0) this.logger.warn(skippedSummary(skipped));
        this.logger.info(
            paint.mint(`Deleted ${plural(deletion.deleted, 'guild command')}. Global commands untouched.`)
        );
    }

    public nothingToClean(scan: ScanResult, outcome: EmptyOutcome): void {
        const lines = emptyLines(scan, outcome);
        for (const line of lines.info) this.logger.info(line);
        this.logger.info(paint.mint(lines.outro));
    }

    public dryRunHint(): void {
        this.logger.info(paint.italic('Dry run. Re-run with --apply to delete the above.'));
    }
}
