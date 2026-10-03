import { describe, expect, it } from 'vitest';

import { SymbolRef } from '#lib/SymbolRef';

const parts = (ref: SymbolRef | null): object | null =>
    ref && { pkg: ref.pkg, symbol: ref.symbol, owner: ref.owner, member: ref.member };

describe('a ref: link', () => {
    it.each([
        ['ref:core/Notice', { pkg: 'core', symbol: 'Notice', owner: 'Notice', member: undefined }],
        ['ref:core/Paginator#start', { pkg: 'core', symbol: 'Paginator#start', owner: 'Paginator', member: 'start' }],
        ['ref:core/Paginator.start', { pkg: 'core', symbol: 'Paginator.start', owner: 'Paginator', member: 'start' }],
        ['ref:core', { pkg: 'core', symbol: '', owner: '', member: undefined }]
    ])('reads %s', (url, expected) => {
        expect(parts(SymbolRef.fromUrl(url))).toEqual(expected);
    });

    it('points at the package overview when it carries no symbol', () => {
        expect(SymbolRef.fromUrl('ref:core')?.isPackage).toBe(true);
    });

    it.each(['ref:', 'ref:/Notice', 'ref:core/', 'ref:core/Notice/x', 'ref:core/.Notice', 'https://seedcord.org'])(
        'reads nothing from %s',
        (url) => {
            expect(SymbolRef.fromUrl(url)).toBeNull();
        }
    );
});

describe('the symbol a hover points at', () => {
    const gateway = '/repo/packages/gateway/dist/index.d.mts';

    it('takes the package and the symbol', () => {
        expect(parts(SymbolRef.fromDeclaration(gateway, 'SlashHandler'))).toEqual({
            pkg: 'gateway',
            symbol: 'SlashHandler',
            owner: 'SlashHandler',
            member: undefined
        });
    });

    it('splits a member off its owner', () => {
        const ref = SymbolRef.fromDeclaration(gateway, 'SlashHandler.options');

        expect([ref?.owner, ref?.member]).toEqual(['SlashHandler', 'options']);
    });

    it('drops the quoted module the checker prefixes onto some names', () => {
        expect(
            SymbolRef.fromDeclaration('/repo/packages/core/dist/index.d.mts', '"@seedcord/core".Notice')?.symbol
        ).toBe('Notice');
    });

    it('prefixes a workspace plugin the way its package name does', () => {
        expect(SymbolRef.fromDeclaration('/repo/plugins/mongoose/dist/index.d.mts', 'Mongo')?.pkg).toBe(
            'plugin-mongoose'
        );
    });

    it('reads an installed package out of its node_modules path', () => {
        const installed = '/repo/node_modules/.pnpm/@seedcord+http@0.3.0/node_modules/@seedcord/http/dist/index.d.mts';

        expect(SymbolRef.fromDeclaration(installed, 'Seedcord')?.pkg).toBe('http');
    });

    it.each([
        ['/lib.es5.d.ts', 'Promise', 'a typescript lib'],
        ['index.ts', '"index".Ping', "the sample's own class"],
        [
            '/repo/node_modules/.pnpm/discord.js@14.0.0/node_modules/discord.js/typings/index.d.ts',
            'Client',
            'a third party dep'
        ],
        ['/repo/apps/guide/src/lib/twoslash.ts', 'renderer', 'a file outside any published package']
    ])('points nowhere for %s', (file, name) => {
        expect(SymbolRef.fromDeclaration(file, name)).toBeNull();
    });

    // the checker calls an inline object type __type. the reference site has no page for one
    it.each([
        ['__type.durationMs', 'a field on an inline payload type'],
        ['__type', 'the inline type itself'],
        ['__object.routeId', 'a field on an object literal'],
        ['__function', 'an anonymous function type']
    ])('points nowhere for %s, %s', (name) => {
        expect(SymbolRef.fromDeclaration(gateway, name)).toBeNull();
    });
});
