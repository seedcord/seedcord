import type { ButtonStyle, ComponentType, SeparatorSpacingSize } from 'discord-api-types/v10';

type UsedComponentType =
    'ActionRow' | 'Button' | 'Container' | 'MediaGallery' | 'Section' | 'Separator' | 'TextDisplay' | 'Thumbnail';

export const TYPE: { readonly [Name in UsedComponentType]: (typeof ComponentType)[Name] } = {
    ActionRow: 1,
    Button: 2,
    Section: 9,
    TextDisplay: 10,
    Thumbnail: 11,
    MediaGallery: 12,
    Separator: 14,
    Container: 17
};
export const LINK_STYLE: ButtonStyle.Link = 5;
export const SPACING: Readonly<Record<'small' | 'large', SeparatorSpacingSize>> = { small: 1, large: 2 };
