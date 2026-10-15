import { paint } from '@seedcord/errors';

import { commandLabel, printSections } from '#commands/commands/commandRows';
import { plural } from '#core/format';

import type { CommandSection } from '#commands/commands/commandRows';
import type { StepPrinter } from '#core/output/StepPrinter';
import type { Flagged } from './classify';
import type { DeleteResult, ScanResult, SkippedGuild } from './CleanRunner';
import type { CleanStep, CleanStepLabel } from './cleanSteps';
import type { EmptyOutcome } from './executeClean';

export type Confirm = (message: string) => Promise<boolean>;

type CleanOutput = Pick<StepPrinter<CleanStepLabel>, 'step' | 'line' | 'wrapped' | 'warn'>;

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
                'Re-run with a full reset (--purge) to remove guild commands.'
            ],
            outro: 'Nothing to clean.'
        },
        'no-overlaps': {
            info: [
                `Scanned ${plural(scan.scannedCommandCount, 'guild command')} across ${plural(scan.scannedGuildCount, 'guild')}. None duplicate a global command.`,
                'Re-run with a full reset (--purge) to remove all of them.'
            ],
            outro: 'Nothing to clean.'
        }
    };
    return variants[outcome];
}

function guildSection({ guildName, commands }: GuildGroup): CommandSection {
    const noun = commands[0]?.reason === 'purge' ? 'command' : 'duplicate';
    return { title: guildName, note: plural(commands.length, noun), commands: commands.map(commandLabel) };
}

export class CleanPresenter {
    constructor(
        private readonly output: CleanOutput,
        private readonly confirm: Confirm
    ) {}

    public step<Result>(step: CleanStep<Result>, task: () => Promise<Result>): Promise<Result> {
        return this.output.step(step.label, task, step.doneNote);
    }

    public preview(scan: ScanResult): void {
        printSections(this.output, groupByGuild(scan.flagged).map(guildSection));
        if (scan.skipped.length > 0) this.output.warn(skippedSummary(scan.skipped));
    }

    public largeBotGuard(guildCount: number): Promise<boolean> {
        return this.ask(`The bot is in ${guildCount} guilds. Scan all of them? This makes ${guildCount} requests.`);
    }

    public confirmDelete(count: number, skippedCount: number): Promise<boolean> {
        const skips = skippedCount > 0 ? ` ${plural(skippedCount, 'guild')} could not be read.` : '';
        return this.ask(`Delete ${plural(count, 'guild command')}? This cannot be undone.${skips}`);
    }

    public result(deletion: DeleteResult): void {
        for (const failure of deletion.failed) this.output.warn(failedDelete(failure));
        this.output.line();
        this.output.line(paint.mute('Global commands untouched.'));
    }

    public nothingToClean(scan: ScanResult, outcome: EmptyOutcome): void {
        const lines = emptyLines(scan, outcome);
        this.output.line();
        for (const line of lines.info) this.output.line(paint.mute(line));
        this.output.line(lines.outro);
    }

    public dryRunHint(): void {
        this.output.line(paint.mute('Dry run. Re-run with --apply to delete these.'));
    }

    private async ask(message: string): Promise<boolean> {
        const yes = await this.confirm(message);
        if (!yes) this.output.line(paint.mute('Nothing deleted.'));
        return yes;
    }
}
