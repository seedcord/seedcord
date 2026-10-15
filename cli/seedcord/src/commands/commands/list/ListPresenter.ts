import { paint } from '@seedcord/errors';

import { commandLabel, printSections } from '#commands/commands/commandRows';
import { plural } from '#core/format';

import type { CommandRow, CommandSection } from '#commands/commands/commandRows';
import type { StepPrinter } from '#core/output/StepPrinter';
import type { ListStep } from './ListRunner';
import type { APIApplicationCommand } from 'discord-api-types/v10';

type ListOutput = Pick<StepPrinter<ListStep>, 'step' | 'detail' | 'line' | 'wrapped'>;

export interface ScopeListing {
    title: string;
    commands: readonly APIApplicationCommand[];
}

export class ListPresenter {
    constructor(
        private readonly output: ListOutput,
        private readonly verbose: boolean
    ) {}

    public step<Result>(
        label: ListStep,
        task: () => Promise<Result>,
        note?: (result: Result) => string
    ): Promise<Result> {
        return this.output.step(label, task, note);
    }

    public detail(key: string, value: string): void {
        this.output.detail(key, value);
    }

    public list(listings: readonly ScopeListing[]): void {
        printSections(
            this.output,
            listings.map((listing) => this.section(listing))
        );
    }

    private section({ title, commands }: ScopeListing): CommandSection {
        return { title, note: plural(commands.length, 'command'), rows: this.rows(commands) };
    }

    private rows(commands: readonly APIApplicationCommand[]): CommandRow[] {
        if (commands.length === 0) return [];
        if (this.verbose) {
            return commands.map((command) => ({ items: [`${commandLabel(command)}  ${paint.mute(command.id)}`] }));
        }
        return [{ items: commands.map((command) => commandLabel(command)) }];
    }
}
