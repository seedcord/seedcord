import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordError } from '@seedcord/errors/internal';
import { ApplicationCommandOptionType, ApplicationCommandType } from 'discord-api-types/v10';

import type { TranslationTree } from './commandTranslations';
import type {
    APIApplicationCommandOption,
    APIApplicationCommandOptionChoice,
    APIApplicationCommandSubcommandGroupOption,
    APIApplicationCommandSubcommandOption,
    Locale,
    RESTPostAPIApplicationCommandsJSONBody,
    RESTPostAPIChatInputApplicationCommandsJSONBody
} from 'discord-api-types/v10';

// discord caps every command, option, and menu name at 32 characters
const MAX_NAME = 32;
const MAX_TEXT = 100;
// discord's rule for slash command, subcommand, and option names, from its application command docs
const SLASH_NAME = new RegExp(String.raw`^[-_'\p{L}\p{N}\p{sc=Deva}\p{sc=Thai}]{1,${MAX_NAME}}$`, 'u');

type SlashNode = NonNullable<NonNullable<TranslationTree['slash']>[string]>;
type OptionNode = NonNullable<NonNullable<SlashNode['options']>[string]>;

type NestedOption = APIApplicationCommandSubcommandOption | APIApplicationCommandSubcommandGroupOption;
type SlashTarget = RESTPostAPIChatInputApplicationCommandsJSONBody | NestedOption;

function isNested(option: APIApplicationCommandOption): option is NestedOption {
    return (
        option.type === ApplicationCommandOptionType.Subcommand ||
        option.type === ApplicationCommandOptionType.SubcommandGroup
    );
}

function isSlash(
    body: RESTPostAPIApplicationCommandsJSONBody
): body is RESTPostAPIChatInputApplicationCommandsJSONBody {
    return (body.type ?? ApplicationCommandType.ChatInput) === ApplicationCommandType.ChatInput;
}

function entries<Value>(record: Readonly<Record<string, Value | undefined>> | undefined): [string, Value][] {
    return Object.entries(record ?? {}).filter((entry): entry is [string, Value] => entry[1] !== undefined);
}

// fills in one locale's name_localizations and description_localizations, and collects what Discord would reject
export class CommandLocalizer {
    public readonly problems: SeedcordError[] = [];

    public constructor(
        private readonly locale: Locale,
        private readonly file: string
    ) {}

    public apply(commands: readonly RESTPostAPIApplicationCommandsJSONBody[], translations: TranslationTree): void {
        for (const [name, node] of entries(translations.slash)) {
            const command = commands.filter(isSlash).find((body) => body.name === name);
            if (command) this.slash(command, node, `slash.${name}`);
            else this.unknown(`slash.${name}`);
        }
        this.menus(commands, ApplicationCommandType.User, 'userMenus', translations.userMenus);
        this.menus(commands, ApplicationCommandType.Message, 'messageMenus', translations.messageMenus);
    }

    private slash(target: SlashTarget, node: SlashNode, path: string): void {
        if (node.name !== undefined) this.name(target, node.name, `${path}.name`);
        if (node.description !== undefined) this.description(target, node.description, `${path}.description`);

        const options: readonly APIApplicationCommandOption[] = target.options ?? [];
        for (const [name, child] of entries(node.subcommands)) {
            const subcommand = options.filter(isNested).find((option) => option.name === name);
            if (subcommand) this.slash(subcommand, child, `${path}.subcommands.${name}`);
            else this.unknown(`${path}.subcommands.${name}`);
        }
        for (const [name, child] of entries(node.options)) {
            const option = options.find((candidate) => !isNested(candidate) && candidate.name === name);
            if (option) this.option(option, child, `${path}.options.${name}`);
            else this.unknown(`${path}.options.${name}`);
        }
    }

    private option(target: APIApplicationCommandOption, node: OptionNode, path: string): void {
        if (node.name !== undefined) this.name(target, node.name, `${path}.name`);
        if (node.description !== undefined) this.description(target, node.description, `${path}.description`);

        const choices: APIApplicationCommandOptionChoice[] = 'choices' in target ? (target.choices ?? []) : [];
        for (const [value, name] of entries(node.choices)) {
            const choice = choices.find((candidate) => String(candidate.value) === value);
            if (!choice) {
                this.unknown(`${path}.choices.${value}`);
            } else if (this.fits(name, MAX_TEXT, `${path}.choices.${value}`, 'a choice name')) {
                choice.name_localizations = { ...choice.name_localizations, [this.locale]: name };
            }
        }
    }

    private menus(
        commands: readonly RESTPostAPIApplicationCommandsJSONBody[],
        type: ApplicationCommandType.User | ApplicationCommandType.Message,
        section: 'userMenus' | 'messageMenus',
        translations: Readonly<Record<string, string | undefined>> | undefined
    ): void {
        for (const [name, translated] of entries(translations)) {
            const menu = commands.find((body) => body.type === type && body.name === name);
            const path = `${section}.${name}`;
            if (!menu) this.unknown(path);
            else if (this.fits(translated, MAX_NAME, path, 'a menu name')) {
                menu.name_localizations = { ...menu.name_localizations, [this.locale]: translated };
            }
        }
    }

    private name(target: SlashTarget | APIApplicationCommandOption, name: string, path: string): void {
        if (!SLASH_NAME.test(name) || name !== name.toLocaleLowerCase(this.locale)) {
            this.reject(path, name, `a name of 1 to ${MAX_NAME} lowercase letters, numbers, -, _ or ', without spaces`);
            return;
        }
        target.name_localizations = { ...target.name_localizations, [this.locale]: name };
    }

    private description(target: SlashTarget | APIApplicationCommandOption, description: string, path: string): void {
        if (!this.fits(description, MAX_TEXT, path, 'a description')) return;
        target.description_localizations = { ...target.description_localizations, [this.locale]: description };
    }

    private fits(text: string, max: number, path: string, field: string): boolean {
        if (text.length > 0 && text.length <= max) return true;
        this.reject(path, text, `${field} of 1 to ${max} characters`);
        return false;
    }

    private reject(path: string, value: string, accepts: string): void {
        this.problems.push(
            new SeedcordError(SeedcordErrorCode.PluginI18nDiscordRejects, [this.file, path, value, accepts])
        );
    }

    private unknown(path: string): void {
        this.problems.push(new SeedcordError(SeedcordErrorCode.PluginI18nUnknownCommand, [this.file, path]));
    }
}
