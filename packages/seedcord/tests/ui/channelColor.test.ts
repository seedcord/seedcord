import { describe, expect, it } from 'vitest';

import { channelColor } from '@ui/channelColor';

describe('channelColor', () => {
    it('maps a name to a stable hex color', () => {
        const first = channelColor('db');
        expect(first).toMatch(/^#[0-9a-f]{6}$/iu);
        expect(channelColor('db')).toBe(first);
    });

    it('picks the color from the name, independent of call order', () => {
        const alpha = channelColor('alpha');
        channelColor('beta');
        channelColor('gamma');
        expect(channelColor('alpha')).toBe(alpha);
    });

    it('spreads names across more than one palette color', () => {
        const colors = new Set(['db', 'http', 'core', 'hmr', 'events', 'cache', 'gateway'].map(channelColor));
        expect(colors.size).toBeGreaterThan(1);
    });
});
