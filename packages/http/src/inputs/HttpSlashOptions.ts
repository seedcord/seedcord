import { ApplicationCommandOptionType } from 'discord-api-types/v10';

import type {
    APIApplicationCommandInteractionDataBasicOption,
    APIApplicationCommandInteractionDataOption,
    APIAttachment,
    APIAutocompleteApplicationCommandInteractionData,
    APIChatInputApplicationCommandInteractionData,
    APIInteractionDataResolved,
    APIInteractionDataResolvedChannel,
    APIInteractionDataResolvedGuildMember,
    APIRole,
    APIUser,
    InteractionType
} from 'discord-api-types/v10';

type SlashLikeData = APIChatInputApplicationCommandInteractionData | APIAutocompleteApplicationCommandInteractionData;

type AnyOption = APIApplicationCommandInteractionDataOption<InteractionType>;
type Leaf = APIApplicationCommandInteractionDataBasicOption<InteractionType>;

interface FocusedOption {
    name: string;
    value: string;
}

// the raw-payload option reader for the typed SlashOptions/AutocompleteOptions views.
export class HttpSlashOptions {
    private readonly leaves = new Map<string, Leaf>();
    private readonly resolved: APIInteractionDataResolved | undefined;

    constructor(data: SlashLikeData) {
        this.resolved = data.resolved;
        let options: readonly AnyOption[] = data.options ?? [];
        const first = options[0];
        if (first?.type === ApplicationCommandOptionType.SubcommandGroup) options = first.options;
        const second = options[0];
        if (second?.type === ApplicationCommandOptionType.Subcommand) options = second.options ?? [];
        for (const option of options) {
            if (
                option.type !== ApplicationCommandOptionType.Subcommand &&
                option.type !== ApplicationCommandOptionType.SubcommandGroup
            ) {
                this.leaves.set(option.name, option);
            }
        }
    }

    getString(name: string): string | null {
        const leaf = this.leaves.get(name);
        return leaf?.type === ApplicationCommandOptionType.String ? leaf.value : null;
    }

    getInteger(name: string): number | null {
        const leaf = this.leaves.get(name);
        return leaf?.type === ApplicationCommandOptionType.Integer ? numeric(leaf.value) : null;
    }

    getNumber(name: string): number | null {
        const leaf = this.leaves.get(name);
        return leaf?.type === ApplicationCommandOptionType.Number ? numeric(leaf.value) : null;
    }

    getBoolean(name: string): boolean | null {
        const leaf = this.leaves.get(name);
        return leaf?.type === ApplicationCommandOptionType.Boolean ? leaf.value : null;
    }

    getUser(name: string): APIUser | null {
        const leaf = this.leaves.get(name);
        if (leaf?.type !== ApplicationCommandOptionType.User) return null;
        return this.resolved?.users?.[leaf.value] ?? null;
    }

    getMember(name: string): APIInteractionDataResolvedGuildMember | null {
        const leaf = this.leaves.get(name);
        if (leaf?.type !== ApplicationCommandOptionType.User) return null;
        return this.resolved?.members?.[leaf.value] ?? null;
    }

    getChannel(name: string): APIInteractionDataResolvedChannel | null {
        const leaf = this.leaves.get(name);
        if (leaf?.type !== ApplicationCommandOptionType.Channel) return null;
        return this.resolved?.channels?.[leaf.value] ?? null;
    }

    getRole(name: string): APIRole | null {
        const leaf = this.leaves.get(name);
        if (leaf?.type !== ApplicationCommandOptionType.Role) return null;
        return this.resolved?.roles?.[leaf.value] ?? null;
    }

    getAttachment(name: string): APIAttachment | null {
        const leaf = this.leaves.get(name);
        if (leaf?.type !== ApplicationCommandOptionType.Attachment) return null;
        return this.resolved?.attachments?.[leaf.value] ?? null;
    }

    getMentionable(name: string): APIUser | APIInteractionDataResolvedGuildMember | APIRole | null {
        const leaf = this.leaves.get(name);
        if (leaf?.type !== ApplicationCommandOptionType.Mentionable) return null;
        const resolved = this.resolved;
        return (
            resolved?.members?.[leaf.value] ?? resolved?.users?.[leaf.value] ?? resolved?.roles?.[leaf.value] ?? null
        );
    }

    getFocused(): FocusedOption | null {
        for (const leaf of this.leaves.values()) {
            if ('focused' in leaf && leaf.focused === true) return { name: leaf.name, value: String(leaf.value) };
        }
        return null;
    }
}

// the autocomplete wire carries integer/number values as strings
function numeric(value: number | string): number | null {
    if (typeof value === 'number') return value;
    if (value.trim() === '') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}
