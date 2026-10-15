import { SeedcordErrorCode, paint } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { ApplicationCommandType } from 'discord-api-types/v10';
import stringWidth from 'string-width';

import { plural } from '#core/format';

import { confirmCount } from './confirm';

import type { StepPrinter } from '#core/output/StepPrinter';
import type { Prompter } from '#core/prompts/Prompter';
import type { Flagged } from './classify';
import type { DeleteResult, ScanResult, SkippedGuild } from './CleanRunner';
import type { CleanStep, CleanStepLabel } from './cleanSteps';
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

function failedDelete({ command, reason }: DeleteResult['failed'][number]): string {
    return `Could not delete ${command.name} in ${command.guildName} (${reason}).`;
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

const UNTOUCHED = 'Global commands untouched.';

type CleanOutput = Pick<StepPrinter<CleanStepLabel>, 'step' | 'line' | 'warn'>;

// a user or message command shows in Discord's context menu under its bare name
function commandLabel(command: Flagged): string {
    return command.type === ApplicationCommandType.ChatInput ? `/${command.name}` : command.name;
}

// a CJK character takes two columns where padEnd counts one
function padToWidth(text: string, width: number): string {
    return text + ' '.repeat(width - stringWidth(text));
}

export class InteractivePresenter implements CleanPresenter {
    constructor(
        private readonly output: CleanOutput,
        private readonly prompter: Prompter
    ) {}

    public step<Result>(step: CleanStep<Result>, task: () => Promise<Result>): Promise<Result> {
        return this.output.step(step.label, task, step.doneNote);
    }

    public preview(scan: ScanResult): void {
        const groups = groupByGuild(scan.flagged);
        const width = Math.max(...groups.map((group) => stringWidth(group.guildName)));

        this.output.line();
        for (const group of groups) {
            const commands = group.commands.map((command) => paint.sky(commandLabel(command))).join(' ');
            this.output.line(`  ${padToWidth(group.guildName, width)}  ${commands}`);
        }
        this.output.line();
        if (scan.skipped.length > 0) this.output.warn(skippedSummary(scan.skipped));
    }

    public largeBotGuard(guildCount: number): Promise<boolean> {
        return this.prompter.confirm({
            message: `The bot is in ${guildCount} guilds. Scan all of them? This makes ${guildCount} requests.`
        });
    }

    public confirmDelete(count: number, skippedCount: number): Promise<boolean> {
        const skips = skippedCount > 0 ? ` ${plural(skippedCount, 'guild')} could not be read.` : '';
        return this.prompter.confirm({
            message: `Delete ${plural(count, 'guild command')}? This cannot be undone.${skips}`
        });
    }

    public result(deletion: DeleteResult): void {
        for (const failure of deletion.failed) this.output.warn(failedDelete(failure));
        this.output.line();
        this.output.line(paint.mute(UNTOUCHED));
    }

    public nothingToClean(scan: ScanResult, outcome: EmptyOutcome): void {
        const lines = emptyLines(scan, outcome);
        this.output.line();
        for (const line of lines.info) this.output.line(paint.mute(line));
        this.output.line(lines.outro);
    }

    public dryRunHint(): void {
        this.output.line(paint.mute('Dry run, nothing was deleted.'));
    }
}

export class FlagPresenter implements CleanPresenter {
    constructor(
        private readonly logger: ILogger,
        private readonly yes: boolean
    ) {}

    public step<Result>(step: CleanStep<Result>, task: () => Promise<Result>): Promise<Result> {
        this.logger.info(step.startMessage);
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
        for (const failure of deletion.failed) this.logger.warn(failedDelete(failure));
        if (skipped.length > 0) this.logger.warn(skippedSummary(skipped));
        this.logger.info(paint.mint(`Deleted ${plural(deletion.deleted, 'guild command')}. ${UNTOUCHED}`));
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
