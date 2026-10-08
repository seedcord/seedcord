import { beforeAll, describe, expect, it } from 'vitest';

import { MOCK_PACKAGE_FULL_NAME } from './utils/constants';
import { getEngine } from './utils/test-helpers';

import type { DocsEngine } from '#src/DocsEngine';

let engine: DocsEngine;

describe('DocsEngine search integration', () => {
    beforeAll(async () => {
        engine = await getEngine();
    });

    it('returns empty results for empty queries', () => {
        expect(engine.search('')).toEqual([]);
    });

    it('ranks exact matches first', () => {
        const [first] = engine.search('MockClass');
        expect(first?.name).toBe('MockClass');
        expect(first?.packageName).toBe(MOCK_PACKAGE_FULL_NAME);
    });

    it('supports fuzzy matching with minor typos', () => {
        const results = engine.search('mockfuncton');
        expect(results.some((entry) => entry.name === 'mockFunction')).toBe(true);
    });

    it('indexes slug tokens for lookups', () => {
        const results = engine.search('rest-method');
        expect(results.some((entry) => entry.slug === 'mock-class/rest-method')).toBe(true);
    });

    it('indexes numeric enum member values for code lookups', () => {
        expect(engine.search('10').some((entry) => entry.name === 'Second')).toBe(true);
        expect(engine.search('20').some((entry) => entry.name === 'Fifth')).toBe(true);
    });

    it('exposes the enum member value on the search entry for display', () => {
        expect(engine.search('Second').find((entry) => entry.name === 'Second')?.value).toBe('10');
    });

    it('indexes signature tokens for overloads', () => {
        const results = engine.search('rest parameters');
        const match = results.find((entry) => entry.slug === 'mock-class/rest-method');
        expect(match).toBeDefined();
    });

    it('matches alias strings derived from signature renderings', () => {
        const [match] = engine.search('mockFunction(param: number): number');
        expect(match?.slug).toBe('mock-function');
    });

    it('matches package names and versions with punctuation', () => {
        const packageMatches = engine.search('@seedcord/mock-docs');
        expect(packageMatches[0]).toMatchObject({ packageName: MOCK_PACKAGE_FULL_NAME, name: MOCK_PACKAGE_FULL_NAME });

        const versionMatches = engine.search('0.0.0');
        expect(versionMatches.length).toBeGreaterThan(0);
        expect(versionMatches.some((entry) => entry.packageVersion === '0.0.0')).toBe(true);
    });

    it('marks a runtime build class and its members with the condition', () => {
        const [top] = engine.search('MockRuntimeHost workerd');
        const fetch = engine.search('fetch').find((entry) => entry.slug === 'mock-runtime-host-workerd/fetch');

        expect(top).toMatchObject({ slug: 'mock-runtime-host-workerd', condition: 'workerd' });
        expect(fetch?.condition).toBe('workerd');
    });

    it('scopes searches to a package when requested', () => {
        const scoped = engine.search('MockClass', MOCK_PACKAGE_FULL_NAME);
        expect(scoped).not.toHaveLength(0);
        expect(scoped.every((entry) => entry.packageName === MOCK_PACKAGE_FULL_NAME)).toBe(true);
    });
});
