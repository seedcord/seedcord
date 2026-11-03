import { ComponentType } from 'discord-api-types/v10';

import { InteractionKind } from '#src/metadataKeys';

const COMPONENT_KINDS: Partial<Record<ComponentType, InteractionKind>> = {
    [ComponentType.Button]: InteractionKind.Button,
    [ComponentType.StringSelect]: InteractionKind.StringMenu,
    [ComponentType.UserSelect]: InteractionKind.UserMenu,
    [ComponentType.RoleSelect]: InteractionKind.RoleMenu,
    [ComponentType.ChannelSelect]: InteractionKind.ChannelMenu,
    [ComponentType.MentionableSelect]: InteractionKind.MentionableMenu
};

export function componentKindOf(type: ComponentType): InteractionKind | null {
    return COMPONENT_KINDS[type] ?? null;
}
