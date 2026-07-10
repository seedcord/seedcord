import { beforeEach, describe, expect, it } from 'vitest';

import { channelColor, resetChannelColors } from '@ui/channelColor';

describe('channelColor', () => {
    beforeEach(() => resetChannelColors());

    it('assigns colors in first-seen order and keeps them stable', () => {
        const first = channelColor('a');
        const second = channelColor('b');
        expect(second).not.toBe(first);
        expect(channelColor('a')).toBe(first);
    });

    it('restarts assignment from the first color after a reset', () => {
        const first = channelColor('a');
        channelColor('b');
        resetChannelColors();
        expect(channelColor('c')).toBe(first);
    });

    it('gives 20 channels distinct colors', () => {
        const colors = new Set(Array.from({ length: 20 }, (_, index) => channelColor(`ch${index}`)));
        expect(colors.size).toBe(20);
    });
});
