import type {
    APIApplicationCommandAutocompleteInteraction,
    APIChatInputApplicationCommandInteraction,
    APIContextMenuInteraction,
    APIMessageComponentInteraction,
    APIModalSubmitInteraction
} from 'discord-api-types/v10';

export type ValidInteractionTypes =
    | APIChatInputApplicationCommandInteraction
    | APIContextMenuInteraction
    | APIMessageComponentInteraction
    | APIModalSubmitInteraction
    | APIApplicationCommandAutocompleteInteraction;

export type Repliables = Exclude<ValidInteractionTypes, APIApplicationCommandAutocompleteInteraction>;
