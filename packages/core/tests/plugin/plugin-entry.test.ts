import { describe, expect, it } from 'vitest';

import * as pluginEntry from '#src/plugin.index';

// the phase enums' single home is the core root barrel
describe('@seedcord/core/plugin entry', () => {
    it('keeps internal helpers and the phase enums off the entry', () => {
        expect(Object.keys(pluginEntry)).toStrictEqual(['Plugin']);
    });
});
