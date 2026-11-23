import type {
    APIApplicationCommandAutocompleteInteraction,
    APIChatInputApplicationCommandInteraction,
    APIContextMenuInteraction,
    APIMessageComponentInteraction,
    APIModalSubmitInteraction
} from 'discord-api-types/v10';
import type { ExcludeStrict } from 'type-fest';

export type ValidInteractionTypes =
    | APIChatInputApplicationCommandInteraction
    | APIContextMenuInteraction
    | APIMessageComponentInteraction
    | APIModalSubmitInteraction
    | APIApplicationCommandAutocompleteInteraction;

export type Repliables = ExcludeStrict<ValidInteractionTypes, APIApplicationCommandAutocompleteInteraction>;
