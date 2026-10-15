import { paint } from '@seedcord/errors';
import { ApplicationCommandType } from 'discord-api-types/v10';

import type { StepPrinter } from '#core/output/StepPrinter';
import type { APIApplicationCommand } from 'discord-api-types/v10';

type CommandRef = Pick<APIApplicationCommand, 'name' | 'type'>;

export interface CommandSection {
    title: string;
    note?: string;
    commands: string[];
}

type SectionOutput = Pick<StepPrinter<string>, 'line' | 'wrapped'>;

const COMMANDS_INDENT = '    ';
// wrap-ansi breaks lines at plain spaces only
const NO_BREAK = ' ';

const MENU_KIND: Partial<Record<ApplicationCommandType, string>> = {
    [ApplicationCommandType.User]: 'user',
    [ApplicationCommandType.Message]: 'message'
};

// discord shows a user or message command in its context menu under the bare name
export function commandLabel({ name, type }: CommandRef): string {
    const menu = MENU_KIND[type];
    if (menu === undefined) return paint.sky(`/${name}`);
    return `${paint.iris(name.replaceAll(' ', NO_BREAK))}${paint.mute(`${NO_BREAK}(${menu})`)}`;
}

export function printSections(output: SectionOutput, sections: readonly CommandSection[]): void {
    output.line();
    for (const { title, note, commands } of sections) {
        output.line(note ? `${paint.bold(title)}  ${paint.mute(note)}` : paint.bold(title));
        output.wrapped(commands.join(' '), COMMANDS_INDENT);
        output.line();
    }
}
