import { describe, expect, it } from 'vitest';

import { manifest } from '#src/manifest.index';

describe('manifest stub', () => {
    it('throws reporting the build when a route list is read off the un-built stub', () => {
        expect(() => manifest.commandRoutes).toThrow(/seedcord build/);
        expect(() => manifest.middlewareRoutes).toThrow(/seedcord build/);
    });
});
