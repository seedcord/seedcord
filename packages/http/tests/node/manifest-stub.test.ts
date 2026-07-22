import { describe, expect, it } from 'vitest';

import type { RouteManifest } from '@src/manifest.index';

describe('manifest stub', () => {
    it('resolves the RouteManifest type and throws on an un-built runtime import', async () => {
        // the type import above erases. The value import evaluates the stub
        const typed: RouteManifest = { commands: [], components: [], autocomplete: [], subscribers: [] };
        expect(typed.commands).toEqual([]);

        await expect(import('@src/manifest.index')).rejects.toThrow(/seedcord build/);
    });
});
