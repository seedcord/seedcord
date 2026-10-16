import { paint } from '@seedcord/errors';

import { commandLabel, printSections } from '#commands/commands/commandRows';
import { StepsPresenter } from '#commands/commands/StepsPresenter';
import { plural } from '#core/format';
import { unlessCancelled } from '#core/prompts/unlessCancelled';

import type { ScopesInCode } from '#commands/commands/codeScopes';
import type { CommandRow, CommandSection } from '#commands/commands/commandRows';
import type { Confirm } from '#commands/commands/confirm';
import type { PresenterOutput } from '#commands/commands/StepsPresenter';
import type { ScopeDiff } from './deployPlan';
import type { DeployStep } from './DeployRunner';
import type { CommandBody } from '@seedcord/core/internal';

export interface ScopePlan {
    title: string;
    inCode: readonly CommandBody[];
    diff: ScopeDiff;
}

function deployedNote({ global, guilds }: ScopesInCode): string {
    const parts: string[] = [];
    if (global) parts.push(`${paint.iris(String(global.length))} global`);
    if (guilds.size > 0) {
        const inGuilds = guilds.values().reduce((sum, commands) => sum + commands.length, 0);
        parts.push(`${paint.iris(String(inGuilds))} in ${plural(guilds.size, 'guild')}`);
    }
    return parts.join(', ');
}

export class DeployPresenter extends StepsPresenter<DeployStep> {
    constructor(
        output: PresenterOutput<DeployStep>,
        private readonly confirm: Confirm,
        private readonly verbose: boolean
    ) {
        super(output);
    }

    public preview(plans: readonly ScopePlan[]): void {
        printSections(
            this.output,
            plans.map((plan) => this.section(plan))
        );
    }

    public async approve(plans: readonly ScopePlan[]): Promise<boolean> {
        const message = `Deploy to ${plural(plans.length, 'scope')}? Discord replaces the commands in each.`;
        const yes = await unlessCancelled(this.output, () => this.confirm(message));
        if (yes === false) this.output.line(paint.mute('Nothing deployed.'));
        return yes === true;
    }

    public deploy(task: () => Promise<unknown>, scopes: ScopesInCode): Promise<unknown> {
        return this.output.step('deploy', task, () => deployedNote(scopes));
    }

    public edgeHint(): void {
        this.output.line();
        this.output.line(paint.mute('Your edge worker still has the old command ids built in.'));
        this.output.line(
            paint.mute(`Run ${paint.bold('seedcord build')} and deploy the worker again to pick up the new ones.`)
        );
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
