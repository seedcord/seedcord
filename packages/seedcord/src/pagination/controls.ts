import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordRangeError } from '@seedcord/errors/internal';
import { PAGE_MAX, type PageCursor } from '@seedcord/kit/internal';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

import type { PageView } from '@seedcord/kit';
import type { ComponentEmojiResolvable } from 'discord.js';

/** The five built-in nav controls. */
export type ControlKey = 'first' | 'prev' | 'indicator' | 'next' | 'last';

// the button styles with a custom_id. Link and Premium have none, so they would un-route a control.
type CustomIdStyle = ButtonStyle.Primary | ButtonStyle.Secondary | ButtonStyle.Success | ButtonStyle.Danger;

/** Cosmetic overrides for a control button. `style` excludes Link and Premium, which would un-route it. */
export interface ControlCosmetics {
    label?: string;
    style?: CustomIdStyle;
    emoji?: ComponentEmojiResolvable;
}

/** The controls passed to `render`. Each accessor returns a fresh builder stamped with its target page. */
export interface PaginatorControls {
    /**
     * A fresh `ButtonBuilder` for one control, already stamped with its target page and disabled-at-bounds
     * state. Call only cosmetic setters on it, a `setCustomId` or `setStyle(Link)` un-routes it.
     */
    button(key: ControlKey, cosmetics?: ControlCosmetics): ButtonBuilder;
    /** Assemble an action row of the chosen controls, in order. Rejects more than five. */
    row(...keys: ControlKey[]): ActionRowBuilder<ButtonBuilder>;
}

const DEFAULT_LABEL: Record<ControlKey, string> = {
    first: 'First',
    prev: 'Prev',
    indicator: '',
    next: 'Next',
    last: 'Last'
};

// a distinct slot per control keeps two controls with the same target page from sharing an id, within
// the cursor's SLOT_MAX (0-4).
const CONTROL_SLOT: Record<ControlKey, number> = {
    first: 0,
    prev: 1,
    indicator: 2,
    next: 3,
    last: 4
};

const MAX_BUTTONS_PER_ROW = 5;

export class Controls implements PaginatorControls {
    constructor(
        private readonly cursor: PageCursor<string>,
        private readonly view: PageView<unknown>
    ) {}

    button(key: ControlKey, cosmetics?: ControlCosmetics): ButtonBuilder {
        const { page, totalPages, hasPrev, hasNext } = this.view;
        const knownTotal = totalPages !== undefined;
        const target = {
            first: 0,
            prev: page - 1,
            indicator: page,
            next: page + 1,
            last: knownTotal ? totalPages - 1 : page
        }[key];
        const disabled = {
            first: !hasPrev,
            prev: !hasPrev,
            indicator: true,
            next: !hasNext,
            last: !hasNext || !knownTotal
        }[key];

        // an emoji with no explicit label makes an icon-only button. the indicator always shows its page text.
        const defaultLabel = key === 'indicator' ? this.indicatorText() : DEFAULT_LABEL[key];
        const label = cosmetics?.label ?? (key === 'indicator' || !cosmetics?.emoji ? defaultLabel : undefined);

        const button = new ButtonBuilder()
            // clamp to the cursor's [0, PAGE_MAX] bound, an enormous list could push last/next past it and encode throws.
            .setCustomId(this.cursor.encode({ page: Math.min(Math.max(0, target), PAGE_MAX), slot: CONTROL_SLOT[key] }))
            .setStyle(cosmetics?.style ?? ButtonStyle.Secondary)
            .setDisabled(disabled);
        if (label !== undefined) button.setLabel(label);
        if (cosmetics?.emoji) button.setEmoji(cosmetics.emoji);
        return button;
    }

    row(...keys: ControlKey[]): ActionRowBuilder<ButtonBuilder> {
        if (keys.length > MAX_BUTTONS_PER_ROW) {
            throw new SeedcordRangeError(SeedcordErrorCode.PaginationTooManyControls, [keys.length]);
        }
        return new ActionRowBuilder<ButtonBuilder>().addComponents(keys.map((key) => this.button(key)));
    }

    private indicatorText(): string {
        const { page, totalPages } = this.view;
        return totalPages === undefined ? `Page ${page + 1}` : `Page ${page + 1} of ${totalPages}`;
    }
}
