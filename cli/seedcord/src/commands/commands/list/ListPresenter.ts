import { labelRows, printSections } from '#commands/commands/commandRows';
import { plural } from '#core/format';

import type { CommandRow, CommandSection } from '#commands/commands/commandRows';
import type { StepPrinter } from '#core/output/StepPrinter';
import type { Listing } from './ListRunner';
import type { APIApplicationCommand } from 'discord-api-types/v10';

type ListOutput = Pick<StepPrinter<string>, 'line' | 'wrapped'>;

export class ListPresenter {
    constructor(
        private readonly output: ListOutput,
        private readonly verbose: boolean
    ) {}

    public list({ global, guilds }: Listing): void {
        printSections(this.output, [
            this.section('global', global),
            ...guilds.map((guild) => this.section(guild.name, guild.commands))
        ]);
    }

    private section(title: string, commands: readonly APIApplicationCommand[]): CommandSection {
        return { title, note: plural(commands.length, 'command'), rows: this.rows(commands) };
    }

    private rows(commands: readonly APIApplicationCommand[]): CommandRow[] {
        return commands.length === 0 ? [] : labelRows(commands, this.verbose);
    }
}
