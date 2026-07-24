import { describe, expect, it } from 'vitest';

import * as pluginEntry from '@src/plugin.index';

// the phase enums' single home is the core root barrel
describe('@seedcord/core/plugin entry', () => {
    it('exports the Plugin base', () => {
        expect(pluginEntry.Plugin).toBeTypeOf('function');
    });

    it('keeps internal helpers and the phase enums off the entry', () => {
        const keys = Object.keys(pluginEntry);
        expect(keys).toStrictEqual(['Plugin']);
        for (const name of ['finalizePluginContext', 'resolvedLifecycleSpecOf', 'StartupPhase', 'ShutdownPhase']) {
            expect(keys).not.toContain(name);
        }
    });
});
