import { describe, expect, it } from 'vitest';

import { packageOfDeclaration, referenceFor } from '#lib/symbolRef';

describe('the package a declaration came from', () => {
    it('reads a workspace package off its directory', () => {
        expect(packageOfDeclaration('/repo/packages/gateway/dist/index.d.mts')).toBe('gateway');
    });

    it('prefixes a workspace plugin the way its package name does', () => {
        expect(packageOfDeclaration('/repo/plugins/mongoose/dist/index.d.mts')).toBe('plugin-mongoose');
    });

    it('reads an installed package out of its node_modules path', () => {
        const installed = '/repo/node_modules/.pnpm/@seedcord+http@0.3.0/node_modules/@seedcord/http/dist/index.d.mts';

        expect(packageOfDeclaration(installed)).toBe('http');
    });

    it.each([
        ['/lib.es5.d.ts', 'a typescript lib'],
        ['index.ts', "twoslash's own virtual file"],
        ['/repo/node_modules/.pnpm/discord.js@14.0.0/node_modules/discord.js/typings/index.d.ts', 'a third party dep'],
        ['/repo/apps/guide/src/lib/twoslash.ts', 'a file outside any published package']
    ])('reaches no package for %s', (file) => {
        expect(packageOfDeclaration(file)).toBeNull();
    });
});

describe('the reference a hovered symbol points at', () => {
    const gateway = '/repo/packages/gateway/dist/index.d.mts';

    it('names the package and the symbol', () => {
        expect(referenceFor(gateway, 'SlashHandler')).toEqual({ pkg: 'gateway', symbol: 'SlashHandler' });
    });

    it('keeps a member dotted for Ref to split', () => {
        expect(referenceFor(gateway, 'SlashHandler.options')).toEqual({
            pkg: 'gateway',
            symbol: 'SlashHandler.options'
        });
    });

    it('drops the quoted module the checker prefixes onto some names', () => {
        expect(referenceFor('/repo/packages/core/dist/index.d.mts', '"@seedcord/core".Notice')).toEqual({
            pkg: 'core',
            symbol: 'Notice'
        });
    });

    it.each([
        ['index.ts', '"index".Ping', "the sample's own class"],
        ['/lib.es5.d.ts', 'Promise', 'a stdlib type']
    ])('points nowhere for %s', (file, fqn) => {
        expect(referenceFor(file, fqn)).toBeNull();
    });
});
