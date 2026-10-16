import { GLOBAL_ID, skippedNote } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';

import { commandLabel, printSections } from '#commands/commands/commandRows';
import { StepsPresenter } from '#commands/commands/StepsPresenter';
import { plural } from '#core/format';
import { unlessCancelled } from '#core/prompts/unlessCancelled';

import type { CommandRow, CommandSection } from '#commands/commands/commandRows';
import type { Confirm } from '#commands/commands/confirm';
import type { PresenterOutput } from '#commands/commands/StepsPresenter';
import type { DeployStep } from './DeployRunner';
import type { ScopeDiff } from './diffScope';
import type { CommandBody, CommandScopes } from '@seedcord/core/internal';

export interface ScopePlan {
    title: string;
    inCode: readonly CommandBody[];
    diff: ScopeDiff;
}

function deployedNote(scopes: CommandScopes): string {
    const parts: string[] = [];
    const global = scopes.get(GLOBAL_ID);
    if (global) parts.push(`${paint.iris(String(global.length))} global`);
    const guilds = [...scopes].filter(([scope]) => scope !== GLOBAL_ID);
    if (guilds.length > 0) {
        const inGuilds = guilds.reduce((sum, [, commands]) => sum + commands.length, 0);
        parts.push(`${paint.iris(String(inGuilds))} in ${plural(guilds.length, 'guild')}`);
    }
    return parts.join(', ');
}

export class DeployPresenter extends StepsPresenter<DeployStep> {
    // --yes passes no confirm
    constructor(
        output: PresenterOutput<DeployStep>,
        private readonly confirm: Confirm | undefined,
        private readonly verbose: boolean
    ) {
        super(output);
    }

    public skipped(titles: readonly string[]): void {
        if (titles.length === 0) return;
        this.output.line();
        this.output.line(skippedNote(titles));
    }

    public nothingToDeploy(): void {
        this.output.line();
        this.output.line('Nothing to deploy.');
    }

    public preview(plans: readonly ScopePlan[]): void {
        printSections(
            this.output,
            plans.map((plan) => this.section(plan))
        );
    }

    public async approve(plans: readonly ScopePlan[]): Promise<boolean> {
        if (!this.confirm) return true;
        return this.ask(
            this.confirm,
            `Deploy to ${plural(plans.length, 'scope')}? Discord replaces the commands in each.`
        );
    }

    public async deployAnyway(): Promise<boolean> {
        if (this.confirm) return this.ask(this.confirm, 'Deploy them anyway?');
        this.nothingToDeploy();
        return false;
    }

    public deploy(task: () => Promise<unknown>, scopes: CommandScopes): Promise<unknown> {
        return this.output.step('deploy', task, () => deployedNote(scopes));
    }

    public edgeHint(): void {
        this.output.line();
        this.output.line(paint.mute('Your edge worker has no ids for the commands this deploy added.'));
        this.output.line(
            paint.mute(`Run ${paint.bold('seedcord build')} and deploy the worker again to pick them up.`)
        );
    }

    private async ask(confirm: Confirm, message: string): Promise<boolean> {
        const yes = await unlessCancelled(this.output, () => confirm(message));
        if (yes === false) this.output.line(paint.mute('Nothing deployed.'));
        return yes === true;
    }

    private section({ title, inCode, diff }: ScopePlan): CommandSection {
        const rows: CommandRow[] = [];
        if (diff.added.length > 0) {
            rows.push({
                marker: paint.mint.bold('+'),
                items: diff.added.map((command) => commandLabel(command, paint.mint))
            });
        }
        if (diff.removed.length > 0) {
            rows.push({
                marker: paint.coral.bold('-'),
                items: diff.removed.map((command) => commandLabel(command, paint.coral))
            });
        }

        const changed = rows.length > 0;
        if (diff.kept.length > 0 && (changed || this.verbose)) rows.push(this.keptRow(diff.kept));

        const count = plural(inCode.length, 'command');
        return { title, note: changed ? count : `${count}, none added or removed`, rows };
    }

    private keptRow(kept: readonly CommandBody[]): CommandRow {
        if (this.verbose) return { items: kept.map((command) => commandLabel(command)) };
        return { items: [paint.mute(`${kept.length} kept`)] };
    }
}
