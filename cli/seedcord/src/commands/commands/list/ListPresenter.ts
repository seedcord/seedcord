import { labelRows } from '#commands/commands/commandRows';
import { plural } from '#core/format';
import { printSections } from '#core/output/printSections';
import { StepsPresenter } from '#core/output/StepsPresenter';

import type { Section, SectionRow } from '#core/output/printSections';
import type { PresenterOutput } from '#core/output/StepsPresenter';
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

    private section(title: string, commands: readonly APIApplicationCommand[]): Section {
        return { title, note: plural(commands.length, 'command'), rows: this.rows(commands) };
    }

    private rows(commands: readonly APIApplicationCommand[]): SectionRow[] {
        return commands.length === 0 ? [] : labelRows(commands, this.verbose);
    }
}
