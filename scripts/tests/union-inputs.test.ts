import { describe, expect, it } from 'vitest';

import { buildIndex } from '@seedcord/docs-engine';

import { buildUnionInputs, type EmittedEntry } from '../docs/union-inputs';

import type { IndexJson, PackageVersionsInput } from '@seedcord/docs-engine';

const UPDATED_AT = '2026-06-06T00:00:00.000Z';

// A real remote index is produced by buildIndex, so building the fixtures the same way exercises the
// round-trip the additive merge relies on: heads -> versions -> heads.
function remoteWith(...packages: PackageVersionsInput[]): IndexJson {
    return buildIndex(packages, { updatedAt: UPDATED_AT });
}

function emit(
    folder: string,
    version: string,
    opts: { fullName?: string; entities?: EmittedEntry['entities']; description?: string } = {}
): EmittedEntry {
    return {
        folder,
        fullName: opts.fullName ?? folder,
        version,
        channel: version.includes('-') ? 'prerelease' : 'stable',
        entities: opts.entities,
        description: opts.description
    };
}

function versionSet(inputs: readonly PackageVersionsInput[], folder: string): Set<string> {
    return new Set(inputs.find((input) => input.folder === folder)?.versions ?? []);
}

describe('buildUnionInputs', () => {
    it('returns only the emitted versions when there is no remote index (first publish)', () => {
        const inputs = buildUnionInputs(null, [emit('seedcord', '0.11.0-next.0')]);

        expect(inputs).toHaveLength(1);
        expect(inputs[0]).toMatchObject({ folder: 'seedcord', fullName: 'seedcord', versions: ['0.11.0-next.0'] });
    });

    it('unions every remote line head with the newly emitted version, dropping nothing', () => {
        const remote = remoteWith({ folder: 'seedcord', fullName: 'seedcord', versions: ['0.8.7', '0.9.4', '0.10.6'] });

        const inputs = buildUnionInputs(remote, [emit('seedcord', '0.11.0-next.0')]);

        expect(versionSet(inputs, 'seedcord')).toEqual(new Set(['0.8.7', '0.9.4', '0.10.6', '0.11.0-next.0']));
    });

    it('round-trips: rebuilding the index from the union advances the head and keeps prior minors', () => {
        const remote = remoteWith({ folder: 'seedcord', fullName: 'seedcord', versions: ['0.8.7', '0.9.4', '0.10.6'] });

        const rebuilt = buildIndex(buildUnionInputs(remote, [emit('seedcord', '0.10.7')]), { updatedAt: UPDATED_AT });

        expect(rebuilt.packages.seedcord?.stable?.latest).toBe('0.10.7');
        expect(rebuilt.packages.seedcord?.stable?.latestByMinor).toEqual({
            '0.8': '0.8.7',
            '0.9': '0.9.4',
            '0.10': '0.10.7'
        });
    });

    it('does not duplicate a version that is already a remote head (idempotent re-run)', () => {
        const remote = remoteWith({ folder: 'seedcord', fullName: 'seedcord', versions: ['0.10.6'] });

        const inputs = buildUnionInputs(remote, [emit('seedcord', '0.10.6')]);

        expect(versionSet(inputs, 'seedcord')).toEqual(new Set(['0.10.6']));
    });

    it('advances the prerelease head while keeping the prior prerelease in the version set', () => {
        const remote = remoteWith({
            folder: 'seedcord',
            fullName: 'seedcord',
            versions: ['0.10.6', '0.11.0-next.0']
        });

        const inputs = buildUnionInputs(remote, [emit('seedcord', '0.11.0-next.1')]);

        expect(versionSet(inputs, 'seedcord')).toEqual(new Set(['0.10.6', '0.11.0-next.0', '0.11.0-next.1']));

        const rebuilt = buildIndex(inputs, { updatedAt: UPDATED_AT });
        expect(rebuilt.packages.seedcord?.prerelease).toEqual({ latest: '0.11.0-next.1' });
        expect(rebuilt.packages.seedcord?.stable?.latest).toBe('0.10.6');
    });

    it('keeps packages that were not republished, with their remote entities intact', () => {
        const remote = remoteWith(
            { folder: 'seedcord', fullName: 'seedcord', versions: ['0.10.6'], entities: { client: 'class' } },
            { folder: 'utils', fullName: '@seedcord/utils', versions: ['1.0.0'], entities: { chunk: 'function' } }
        );

        const inputs = buildUnionInputs(remote, [
            emit('seedcord', '0.10.7', { entities: { client: 'class', boot: 'function' } })
        ]);

        expect(inputs.find((input) => input.folder === 'utils')).toMatchObject({
            fullName: '@seedcord/utils',
            versions: ['1.0.0'],
            entities: { chunk: 'function' }
        });
    });

    it('overwrites entities for a republished package with the freshly emitted tone map', () => {
        const remote = remoteWith({
            folder: 'seedcord',
            fullName: 'seedcord',
            versions: ['0.10.6'],
            entities: { stale: 'class' }
        });

        const inputs = buildUnionInputs(remote, [emit('seedcord', '0.10.7', { entities: { fresh: 'interface' } })]);

        expect(inputs.find((input) => input.folder === 'seedcord')?.entities).toEqual({ fresh: 'interface' });
    });

    it('adds a brand-new package that is absent from the remote index, leaving others untouched', () => {
        const remote = remoteWith({ folder: 'seedcord', fullName: 'seedcord', versions: ['0.10.6'] });

        const inputs = buildUnionInputs(remote, [
            emit('plugins', '0.1.0', { fullName: '@seedcord/plugins', entities: { mongo: 'class' } })
        ]);

        expect(inputs.find((input) => input.folder === 'plugins')).toMatchObject({
            fullName: '@seedcord/plugins',
            versions: ['0.1.0'],
            entities: { mongo: 'class' }
        });
        expect(versionSet(inputs, 'seedcord')).toEqual(new Set(['0.10.6']));
    });

    it('omits the entities key when neither remote nor emitted supply a tone map', () => {
        const inputs = buildUnionInputs(null, [emit('seedcord', '0.11.0-next.0')]);

        expect(inputs[0]).not.toHaveProperty('entities');
    });

    it('keeps the remote description for a package that was not republished', () => {
        const remote = remoteWith(
            { folder: 'seedcord', fullName: 'seedcord', versions: ['0.10.6'] },
            { folder: 'utils', fullName: '@seedcord/utils', versions: ['1.0.0'], description: 'Utility helpers.' }
        );

        const inputs = buildUnionInputs(remote, [emit('seedcord', '0.10.7')]);

        expect(inputs.find((input) => input.folder === 'utils')?.description).toBe('Utility helpers.');
    });

    it('overwrites the description for a republished package with the freshly emitted one', () => {
        const remote = remoteWith({
            folder: 'utils',
            fullName: '@seedcord/utils',
            versions: ['1.0.0'],
            description: 'Stale blurb.'
        });

        const inputs = buildUnionInputs(remote, [
            emit('utils', '1.0.1', { fullName: '@seedcord/utils', description: 'Fresh blurb.' })
        ]);

        expect(inputs.find((input) => input.folder === 'utils')?.description).toBe('Fresh blurb.');
    });

    it('omits the description key when neither remote nor emitted supply one', () => {
        const inputs = buildUnionInputs(null, [emit('seedcord', '0.11.0-next.0')]);

        expect(inputs[0]).not.toHaveProperty('description');
    });
});
