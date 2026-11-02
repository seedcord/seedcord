import type { NamesFor } from '#registries/ContextMenuRegistry';
import type { SlashRegistry } from '#registries/SlashRegistry';
import type { InteractionKind, MiddlewareKind } from '#src/metadataKeys';
import type { ApplicationCommandType } from 'discord-api-types/v10';
import type { LiteralUnion } from 'type-fest';

interface RegisteredRoutes {
    [InteractionKind.Slash]: keyof SlashRegistry;
    [InteractionKind.UserContextMenu]: NamesFor<ApplicationCommandType.User>;
    [InteractionKind.MessageContextMenu]: NamesFor<ApplicationCommandType.Message>;
}

/** @internal */
export type MiddlewareRoute<Kind extends MiddlewareKind> = Kind extends keyof RegisteredRoutes
    ? // middleware also runs when no handler matched, like on a stale command
      LiteralUnion<RegisteredRoutes[Kind], string>
    : // no registry lists custom-ID prefixes
      string;
