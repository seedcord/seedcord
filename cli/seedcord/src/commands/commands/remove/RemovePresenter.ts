import { paint } from '@seedcord/errors';

import { labelRows, printSections } from '#commands/commands/commandRows';
import { plural } from '#core/format';

import { scopeTitle } from './scope';

import type { CommandSection } from '#commands/commands/commandRows';
import type { Confirm } from '#commands/commands/confirm';
import type { StepPrinter } from '#core/output/StepPrinter';
import type { EmptyMessage } from './RemoveMode';
import type { RemoveFailure, RemoveResult, SkippedGuild } from './RemoveRunner';
import type { RemoveStep, RemoveStepLabel } from './removeSteps';
import type { ScopedCommands } from './scope';

type RemoveOutput = Pick<StepPrinter<RemoveStepLabel>, 'step' | 'line' | 'wrapped' | 'warn'>;

function skippedSummary(skipped: readonly SkippedGuild[]): string {
    const names = skipped.map(({ guild }) => guild.name).join(', ');
    return `Could not read ${plural(skipped.length, 'guild')} (${names}).`;
}

function failureLine({ scope, command, reason }: RemoveFailure): string {
    const where = scopeTitle(scope);
    return command
        ? `Could not delete ${command.name} in ${where} (${reason}).`
        : `Could not delete the commands in ${where} (${reason}).`;
}

export class RemovePresenter {
    constructor(
        private readonly output: RemoveOutput,
        private readonly confirm: Confirm,
        private readonly verbose: boolean
    ) {}

    public step<Result>(step: RemoveStep<Result>, task: () => Promise<Result>): Promise<Result> {
        return this.output.step(step.label, task, step.doneNote);
    }

    public preview(selected: readonly ScopedCommands[], skipped: readonly SkippedGuild[], noun: string): void {
        printSections(
            this.output,
            selected.map((scoped) => this.section(scoped, noun))
        );
        if (skipped.length > 0) this.output.warn(skippedSummary(skipped));
    }

    public largeBotGuard(guildCount: number): Promise<boolean> {
        return this.ask(`The bot is in ${guildCount} guilds. Scan all of them? This makes ${guildCount} requests.`);
    }

    public confirmDelete(count: number, skippedCount: number): Promise<boolean> {
        const skips = skippedCount > 0 ? ` ${plural(skippedCount, 'guild')} could not be read.` : '';
        return this.ask(`Delete ${plural(count, 'command')}? This cannot be undone.${skips}`);
    }

    public result({ failed }: RemoveResult, touchedGlobal: boolean): void {
        for (const failure of failed) this.output.warn(failureLine(failure));
        if (touchedGlobal) return;
        this.output.line();
        this.output.line(paint.mute('Global commands untouched.'));
    }

    public nothing({ info, outro }: EmptyMessage): void {
        this.output.line();
        for (const line of info) this.output.line(paint.mute(line));
        this.output.line(outro);
    }

    public dryRunHint(): void {
        this.output.line(paint.mute('Dry run. Re-run with --yes to delete these.'));
    }

    private section({ scope, commands }: ScopedCommands, noun: string): CommandSection {
        return {
            title: scopeTitle(scope),
            note: plural(commands.length, noun),
            rows: labelRows(commands, this.verbose)
        };
    }

    private async ask(message: string): Promise<boolean> {
        const yes = await this.confirm(message);
        if (!yes) this.output.line(paint.mute('Nothing deleted.'));
        return yes;
    }
}
