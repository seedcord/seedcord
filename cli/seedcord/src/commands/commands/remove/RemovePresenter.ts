import { paint } from '@seedcord/errors';

import { labelRows, printSections } from '#commands/commands/commandRows';
import { scopeTitle } from '#commands/commands/scope';
import { StepsPresenter } from '#commands/commands/StepsPresenter';
import { plural } from '#core/format';

import type { CommandSection } from '#commands/commands/commandRows';
import type { Confirm } from '#commands/commands/confirm';
import type { RemoveFailure, RemoveResult } from '#commands/commands/DiscordSession';
import type { ScopedCommands } from '#commands/commands/scope';
import type { PresenterOutput } from '#commands/commands/StepsPresenter';
import type { EmptyMessage } from './RemoveMode';
import type { RemoveStep } from './removeSteps';

function failureLine(failure: RemoveFailure): string {
    const where = scopeTitle(failure.scope);
    return failure.kind === 'command'
        ? `Could not delete ${failure.command.name} in ${where} (${failure.reason}).`
        : `Could not delete the commands in ${where} (${failure.reason}).`;
}

export class RemovePresenter extends StepsPresenter<RemoveStep> {
    constructor(
        output: PresenterOutput<RemoveStep>,
        private readonly confirm: Confirm,
        private readonly verbose: boolean
    ) {
        super(output);
    }

    public preview(selected: readonly ScopedCommands[], itemName: string): void {
        printSections(
            this.output,
            selected.map((scoped) => this.section(scoped, itemName))
        );
    }

    public confirmDelete(count: number): Promise<boolean> {
        return this.ask(`Delete ${plural(count, 'command')}? This cannot be undone.`);
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
        this.output.line(paint.mute(`Dry run. Re-run with ${paint.bold('--yes')} to delete these.`));
    }

    private section({ scope, commands }: ScopedCommands, itemName: string): CommandSection {
        return {
            title: scopeTitle(scope),
            note: plural(commands.length, itemName),
            rows: labelRows(commands, this.verbose)
        };
    }

    private async ask(message: string): Promise<boolean> {
        const yes = await this.confirm(message);
        if (!yes) this.output.line(paint.mute('Nothing deleted.'));
        return yes;
    }
}
