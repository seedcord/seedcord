import { isSeedcordError, paint, SeedcordErrorCode } from '@seedcord/errors';

import { commandLabel, printSections } from '#commands/commands/commandRows';
import { plural } from '#core/format';

import type { ScopesInCode } from '#commands/commands/codeScopes';
import type { CommandRow, CommandSection } from '#commands/commands/commandRows';
import type { Confirm } from '#commands/commands/confirm';
import type { StepPrinter } from '#core/output/StepPrinter';
import type { ScopeDiff } from './deployPlan';
import type { DeployStep } from './DeployRunner';
import type { CommandBody } from '@seedcord/core/internal';

type DeployOutput = Pick<StepPrinter<DeployStep>, 'step' | 'detail' | 'line' | 'wrapped'>;

export interface ScopePlan {
    title: string;
    inCode: readonly CommandBody[];
    diff: ScopeDiff;
}

function deployedNote({ global, guilds }: ScopesInCode): string {
    const globalCount = `${paint.iris(String(global.length))} global`;
    if (guilds.size === 0) return globalCount;
    const inGuilds = guilds.values().reduce((sum, commands) => sum + commands.length, 0);
    return `${globalCount}, ${paint.iris(String(inGuilds))} in ${plural(guilds.size, 'guild')}`;
}

export class DeployPresenter {
    constructor(
        private readonly output: DeployOutput,
        private readonly confirm: Confirm,
        private readonly verbose: boolean
    ) {}

    public step<Result>(
        label: DeployStep,
        task: () => Promise<Result>,
        note?: (result: Result) => string
    ): Promise<Result> {
        return this.output.step(label, task, note);
    }

    public detail(key: string, value: string): void {
        this.output.detail(key, value);
    }

    public preview(plans: readonly ScopePlan[]): void {
        const touched = plans.filter(({ inCode, diff }) => inCode.length > 0 || diff.removed.length > 0);
        printSections(
            this.output,
            touched.map((plan) => this.section(plan))
        );
    }

    public async approve(plans: readonly ScopePlan[]): Promise<boolean> {
        const message = `Deploy to ${plural(plans.length, 'scope')}? Discord replaces the commands in each.`;
        try {
            const yes = await this.confirm(message);
            if (!yes) this.output.line(paint.mute('Nothing deployed.'));
            return yes;
        } catch (error: unknown) {
            if (!isSeedcordError(error, 'SeedcordError', SeedcordErrorCode.CliCancelled)) throw error;
            this.output.line(paint.mute('cancelled'));
            return false;
        }
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
