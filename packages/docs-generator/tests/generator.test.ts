import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { MOCK_PACKAGE_NAME, TEMP_DIR } from './utils';
import { entryPointMembers, findMember, readApiPackage, readApiPackageRaw } from './utils/test-helpers';

import type { ApiPackageJson } from './utils/test-helpers';

interface ManifestPackage {
    name: string;
    version: string;
    entryPoints: string[];
    output: string | null;
    succeeded: boolean;
}
interface Manifest {
    tool: string;
    apiExtractorVersion: string;
    packages: ManifestPackage[];
}

const MOCK_FULL_NAME = '@seedcord/mock-docs';

describe('ApiDocsGenerator', () => {
    let manifest: Manifest;
    let pkg: ApiPackageJson;

    beforeAll(() => {
        // globalSetup builds the mock declarations and runs the generator into TEMP_DIR.
        manifest = JSON.parse(readFileSync(resolve(TEMP_DIR, 'manifest.json'), 'utf8')) as Manifest;
        pkg = readApiPackage(TEMP_DIR, MOCK_PACKAGE_NAME);
    });

    describe('manifest', () => {
        it('records API Extractor as the tool with its version', () => {
            expect(manifest.tool).toBe('api-extractor');
            expect(manifest.apiExtractorVersion).toMatch(/^\d+\.\d+\.\d+/);
        });

        it('lists the mock package with a succeeded result pointing at its .api.json', () => {
            expect(manifest.packages).toHaveLength(1);
            const [entry] = manifest.packages;
            expect(entry!.name).toBe(MOCK_FULL_NAME);
            expect(entry!.version).toBe('0.0.0');
            expect(entry!.succeeded).toBe(true);
            expect(entry!.output).toMatch(/mock-docs\.api\.json$/);
            expect(entry!.entryPoints).toEqual(['dist/index.d.ts']);
        });
    });

    describe('doc model', () => {
        it('is a loadable API Extractor package model', () => {
            expect(pkg.kind).toBe('Package');
            expect(pkg.name).toBe(MOCK_FULL_NAME);
            expect(pkg.metadata?.toolPackage).toContain('api-extractor');
        });

        it('extracts the package entry-point exports', () => {
            const names = new Set(entryPointMembers(pkg).map((member) => member.name));
            for (const expected of [
                'MockClass',
                'MockEnum',
                'MockInterface',
                'MockUnion',
                'mockFunction',
                'mockVariable'
            ]) {
                expect(names.has(expected)).toBe(true);
            }
        });

        it('excludes private members', () => {
            const raw = readApiPackageRaw(TEMP_DIR, MOCK_PACKAGE_NAME);
            expect(raw).not.toContain('privateStaticProp');
            expect(raw).not.toContain('privateMethod');
        });

        it('keeps @internal exports (rendered as a badge, not gated out of the surface)', () => {
            const asyncMockFunction = findMember(pkg.members[0]!, 'asyncMockFunction');
            expect(asyncMockFunction).toBeDefined();
            expect(asyncMockFunction?.releaseTag).toBe('Internal');
        });
    });
});
