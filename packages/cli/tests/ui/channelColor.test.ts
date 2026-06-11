import { beforeEach, describe, expect, it } from 'vitest';

import { channelColor, resetChannelColors } from '@ui/channelColor';

describe('channelColor', () => {
    beforeEach(() => resetChannelColors());

    it('assigns distinct palette colors in order of first appearance and keeps them stable', () => {
        expect(channelColor('a')).toBe('cyan');
        expect(channelColor('b')).toBe('green');
        expect(channelColor('a')).toBe('cyan');
    });

    it('restarts assignment from the first color after a reset', () => {
        channelColor('a');
        channelColor('b');
        resetChannelColors();
        expect(channelColor('c')).toBe('cyan');
    });
});
