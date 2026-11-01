import type { NamesFor } from '#registries/ContextMenuRegistry';
import type { SlashRegistry } from '#registries/SlashRegistry';
import type { InteractionKind, MiddlewareKind } from '#src/metadataKeys';
import type { ApplicationCommandType } from 'discord-api-types/v10';

interface RegisteredRoutes {
    [InteractionKind.Slash]: keyof SlashRegistry;
    [InteractionKind.UserContextMenu]: NamesFor<ApplicationCommandType.User>;
    [InteractionKind.MessageContextMenu]: NamesFor<ApplicationCommandType.Message>;
}

// no registry lists custom-ID prefixes
/** @internal */
export type MiddlewareRoute<Kind extends MiddlewareKind> = Kind extends keyof RegisteredRoutes
    ? RegisteredRoutes[Kind]
    : string;
