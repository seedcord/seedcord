import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { describe, expect, it } from 'vitest';

import { recordThrownBy, vitePluginThrew } from '#src/node/importFailed';

const CONFIG_FILE = join(process.cwd(), 'seedcord.config.ts');

function messageOf(error: unknown): string {
    return stripVTControlCharacters(vitePluginThrew(error)?.message ?? '');
}

describe('vitePluginThrew', () => {
    it('names the plugin that threw when its error passes through another plugin hook', () => {
        const thrown = recordThrownBy(new Error('bad yaml'), {
            plugin: 'inner-yaml',
            hook: 'load',
            configFile: CONFIG_FILE
        });
        recordThrownBy(thrown, { plugin: 'outer-wrapper', hook: 'load', configFile: CONFIG_FILE });

        const message = messageOf(thrown);

        expect(message).toContain('inner-yaml');
        expect(message).not.toContain('outer-wrapper');
    });

    it('shows a virtual module by its id and points the fix at the plugin options', () => {
        const thrown = recordThrownBy(new Error('boom'), {
            plugin: 'virtual-maker',
            hook: 'load',
            configFile: CONFIG_FILE,
            moduleId: '\0virtual:thing'
        });

        const message = messageOf(thrown);

        expect(message).toContain('while loading virtual:thing');
        expect(message).not.toContain('Fix virtual:thing');
        expect(message).toContain('Check the options you pass the plugin.');
    });

    it('shows a file outside the working folder by its full path, without the query', () => {
        const outside = join(process.cwd(), '..', 'shared', 'shop.yaml');
        const thrown = recordThrownBy(new Error('boom'), {
            plugin: 'shop-loader',
            hook: 'transform',
            configFile: CONFIG_FILE,
            moduleId: `${outside}?raw`
        });

        expect(messageOf(thrown)).toContain(`while loading ${outside}.`);
    });
});
