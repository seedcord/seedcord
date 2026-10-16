import { labelRows, printSections } from '#commands/commands/commandRows';
import { StepsPresenter } from '#commands/commands/StepsPresenter';
import { plural } from '#core/format';

import type { CommandRow, CommandSection } from '#commands/commands/commandRows';
import type { PresenterOutput } from '#commands/commands/StepsPresenter';
import type { Listing, ListStep } from './ListRunner';
import type { APIApplicationCommand } from 'discord-api-types/v10';

export class ListPresenter extends StepsPresenter<ListStep> {
    constructor(
        output: PresenterOutput<ListStep>,
        private readonly verbose: boolean
    ) {
        super(output);
    }

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
