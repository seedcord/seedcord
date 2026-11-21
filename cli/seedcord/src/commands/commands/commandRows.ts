import { commandRefOf } from '@seedcord/core/internal';
import { paint } from '@seedcord/errors';
import { ApplicationCommandType } from 'discord-api-types/v10';

import type { SectionRow } from '#core/output/printSections';

type CommandLike = Parameters<typeof commandRefOf>[0];
type Tone = (text: string) => string;

// wrap-ansi breaks lines at plain spaces only
const NO_BREAK = ' ';

const MENU_KIND: Partial<Record<ApplicationCommandType, string>> = {
    [ApplicationCommandType.User]: 'user',
    [ApplicationCommandType.Message]: 'message'
};

// discord shows a user or message command in its context menu under the bare name
export function commandLabel(command: CommandLike, tone?: Tone): string {
    const { name, type } = commandRefOf(command);
    const menu = MENU_KIND[type];
    if (menu === undefined) return (tone ?? paint.sky)(`/${name}`);
    return `${(tone ?? paint.iris)(name.replaceAll(' ', NO_BREAK))}${paint.mute(`${NO_BREAK}(${menu})`)}`;
}

export function labelRows(commands: readonly (CommandLike & { id: string })[], verbose: boolean): SectionRow[] {
    if (verbose) return commands.map((command) => ({ items: [`${commandLabel(command)}  ${paint.mute(command.id)}`] }));
    return [{ items: commands.map((command) => commandLabel(command)) }];
}
