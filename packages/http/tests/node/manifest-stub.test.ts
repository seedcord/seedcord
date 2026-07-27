import { describe, expect, it } from 'vitest';

import { manifest } from '@src/manifest.index';

import type { RouteManifest } from '@src/manifest.index';

describe('manifest stub', () => {
    it('resolves the RouteManifest type and imports without throwing', () => {
        // the type import erases, the value import evaluates the stub
        const typed: RouteManifest = {
            commandRoutes: [],
            componentRoutes: [],
            autocompleteRoutes: [],
            subscriberRoutes: [],
            middlewareRoutes: []
        };

        expect(typed.commandRoutes).toEqual([]);
        expect(manifest).toBeDefined();
    });

    it('throws reporting the build when a route list is read off the un-built stub', () => {
        expect(() => manifest.commandRoutes).toThrow(/seedcord build/);
        expect(() => manifest.middlewareRoutes).toThrow(/seedcord build/);
    });
});
