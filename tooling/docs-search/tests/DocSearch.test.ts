import { describe, expect, it } from 'vite-plus/test';

import { DocKind } from '#src/DocKind';
import { DocSearch } from '#src/DocSearch';

import type { DocSearchEntry } from '#src/DocSearchEntry';

function entry(name: string, overrides: Partial<DocSearchEntry> = {}): DocSearchEntry {
    return {
        name,
        qualifiedName: name,
        slug: name.toLowerCase(),
        packageName: '@seedcord/core',
        packageVersion: '0.22.0',
        kind: DocKind.Class,
        summary: null,
        tokens: [name.toLowerCase()],
        ...overrides
    };
}

describe('DocSearch', () => {
    it.each(['', ' \t ', 'zzzzzzzz'])('returns no results for %j', (query) => {
        expect(new DocSearch([entry('Bus')]).search(query)).toEqual([]);
    });

    it('ranks exact names ahead of member and prefix matches', () => {
        const prefix = entry('BusFactory');
        const exact = entry('Bus', { kind: DocKind.Interface });
        const member = entry('Bus', { kind: DocKind.Method, qualifiedName: 'Manager.Bus', slug: 'manager/bus' });

        expect(new DocSearch([prefix, member, exact]).search('bus')).toEqual([exact, member, prefix]);
    });

    it('uses kind weights to rank otherwise identical matches', () => {
        const method = entry('Bus', { kind: DocKind.Method });
        const iface = entry('Bus', { kind: DocKind.Interface });
        const cls = entry('Bus');

        expect(new DocSearch([method, iface, cls]).search('Bus')).toEqual([cls, iface, method]);
    });

    it('preserves input order and display data for tied matches', () => {
        const first = { ...entry('Bus'), id: 'first', url: '/first', condition: 'workerd' };
        const second = { ...entry('Bus'), id: 'second', url: '/second', condition: 'workerd' };
        const search = new DocSearch([first, second]);

        expect(search.search('Bus')).toEqual([first, second]);
    });

    it('scopes fuzzy matches to the requested package', () => {
        const core = entry('MockFunction');
        const http = entry('MockFunction', { packageName: '@seedcord/http' });
        const search = new DocSearch([http, core]);

        expect(search.search('mockfuncton', '@seedcord/core')).toEqual([core]);
        expect(search.search('mockfuncton')).toEqual([http, core]);
    });

    it('ranks the package root first for a full package-name query', () => {
        const root = entry('@seedcord/core', { kind: DocKind.Project, slug: '', tokens: ['seedcord', 'core'] });
        const symbol = entry('MockClass');

        expect(new DocSearch([symbol, root]).search('@seedcord/core')).toEqual([root, symbol]);
    });

    it.each<[string, Partial<DocSearchEntry>]>([
        ['Runtime', { qualifiedName: 'Runtime.Bus' }],
        ['10', { kind: DocKind.EnumMember, tokens: ['10'], value: '10' }],
        ['work', { tokens: ['worker'] }],
        ['mockFunction(param: number): number', { aliases: ['mockFunction(param: number): number'] }],
        ['source.ts', { file: 'source.ts' }],
        ['@seedcord/core', {}],
        ['0.22.0', {}],
        ['rest-method', { slug: 'mock-class/rest-method' }]
    ])('matches entry metadata for %j', (query, overrides) => {
        const bus = entry('Bus', overrides);
        const unrelated = entry('Other', { packageName: '@seedcord/http', packageVersion: '9.9.9' });

        expect(new DocSearch([unrelated, bus]).search(query)).toEqual([bus]);
    });
});
