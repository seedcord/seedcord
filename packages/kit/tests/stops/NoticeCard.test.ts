import { ComponentType, ContainerBuilder } from 'discord.js';
import { afterEach, describe, expect, it } from 'vitest';

import { setBotColor } from '@src/botColorHolder';
import { NoticeCard } from '@stops/NoticeCard';

function cardText(card: ContainerBuilder): string {
    const text = card.toJSON().components.find((c) => c.type === ComponentType.TextDisplay);
    if (!text || !('content' in text)) throw new Error('card has no text display');
    return text.content;
}

describe('NoticeCard', () => {
    afterEach(() => {
        setBotColor(undefined);
    });

    it('renders the title as an h3 line with the description on the next line', () => {
        const card = new NoticeCard('Something broke.', 'Cannot Proceed').component;
        expect(card).toBeInstanceOf(ContainerBuilder);
        expect(cardText(card)).toBe('### Cannot Proceed\nSomething broke.');
    });

    it('defaults the title to Cannot Proceed', () => {
        expect(cardText(new NoticeCard('body').component)).toBe('### Cannot Proceed\nbody');
    });

    it('applies the configured bot color as the container accent', () => {
        setBotColor(0xfe_56_5a);
        expect(new NoticeCard('body').component.data.accent_color).toBe(0xfe_56_5a);
    });
});
