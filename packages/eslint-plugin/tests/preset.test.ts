import { describe, expect, it } from 'vitest';

import plugin, { recommended } from '#src/index';

describe('the recommended preset', () => {
    it('turns on every rule the plugin carries', () => {
        const carried = Object.keys(plugin.rules ?? {})
            .map((name) => `@seedcord/${name}`)
            .sort();
        expect(Object.keys(recommended.rules ?? {}).sort()).toEqual(carried);
    });
});
