import { describe, expect, it } from 'vitest';

import {
    DEFAULT_MANIFEST_PACKAGE,
    DEFAULT_VERSION,
    formatDisplayPackageName,
    resolveExternalPackageUrl,
    resolvePackageIdentity
} from '@packages/identity';

import type { PackageIdentity } from '@packages/identity';

const id = (fullName: string): PackageIdentity => ({ folder: formatDisplayPackageName(fullName), fullName });
const ids = (...fullNames: string[]): PackageIdentity[] => fullNames.map(id);

describe('packages module constants', () => {
    it('exposes the default manifest package and version', () => {
        expect(DEFAULT_MANIFEST_PACKAGE).toBe('seedcord');
        expect(DEFAULT_VERSION).toBe('latest');
    });
});

describe('formatDisplayPackageName', () => {
    it('strips the @seedcord scope for known overrides', () => {
        expect(formatDisplayPackageName('@seedcord/plugins')).toBe('plugins');
        expect(formatDisplayPackageName('@seedcord/services')).toBe('services');
        expect(formatDisplayPackageName('@seedcord/cli')).toBe('cli');
    });

    it('keeps the canonical core name', () => {
        expect(formatDisplayPackageName('seedcord')).toBe('seedcord');
    });

    it('returns the input verbatim for unknown manifest names', () => {
        expect(formatDisplayPackageName('@scope/unknown')).toBe('@scope/unknown');
        expect(formatDisplayPackageName('mystery')).toBe('mystery');
    });
});

describe('resolveExternalPackageUrl', () => {
    it('returns null for null, undefined, or empty input', () => {
        expect(resolveExternalPackageUrl(null)).toBeNull();
        expect(resolveExternalPackageUrl(undefined)).toBeNull();
        expect(resolveExternalPackageUrl('')).toBeNull();
    });

    it('resolves a lowercase MDN built-in primitive', () => {
        const url = resolveExternalPackageUrl('string');
        expect(url).toBe('https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String');
    });

    it('resolves a capitalised MDN built-in class', () => {
        expect(resolveExternalPackageUrl('Promise')).toBe(
            'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise'
        );
        expect(resolveExternalPackageUrl('Map')).toBe(
            'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map'
        );
    });

    it('capitalises a lowercase class name to find a built-in', () => {
        expect(resolveExternalPackageUrl('promise')).toBe(
            'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise'
        );
    });

    it('resolves the ErrorOptions lib type to the MDN Error constructor page', () => {
        expect(resolveExternalPackageUrl('ErrorOptions')).toBe(
            'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Error/Error'
        );
    });

    it('strips generics, array brackets, and union tails before lookup', () => {
        expect(resolveExternalPackageUrl('Promise<void>')).toBe(
            'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise'
        );
        expect(resolveExternalPackageUrl('Map[]')).toBe(
            'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Map'
        );
        expect(resolveExternalPackageUrl('string | null')).toBe(
            'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String'
        );
    });

    it('strips surrounding non-alphanumerics before lookup', () => {
        expect(resolveExternalPackageUrl('  Promise  ')).toBe(
            'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise'
        );
        expect(resolveExternalPackageUrl('"Promise"')).toBe(
            'https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise'
        );
    });

    it('returns null for unknown names', () => {
        expect(resolveExternalPackageUrl('totally-not-a-thing')).toBeNull();
    });

    it('maps a DefinitelyTyped package to its runtime entry (@types/pg -> pg)', () => {
        // AE reports Pool/PoolConfig as belonging to @types/pg; the table keys the runtime name.
        expect(resolveExternalPackageUrl('@types/pg')).toBe('https://node-postgres.com');
    });

    it('maps discord-api-types to the discord.js docs (enums like ButtonStyle are re-exported there)', () => {
        // AE reports ButtonStyle as discord-api-types!ButtonStyle:enum, discord.js re-exports and documents it.
        expect(resolveExternalPackageUrl('discord-api-types')).toBe('https://discord.js.org/docs');
    });

    it('maps the @discordjs scoped helper packages to the discord.js docs (JSONEncodable lives in util)', () => {
        expect(resolveExternalPackageUrl('@discordjs/util')).toBe('https://discord.js.org/docs');
    });

    it('does not lowercase-match Map (mixed case lookup keys are preserved)', () => {
        expect(resolveExternalPackageUrl('MAP')).toBeNull();
    });
});

describe('resolvePackageIdentity', () => {
    it('returns null for an empty package list', () => {
        expect(resolvePackageIdentity([], 'anything')).toBeNull();
        expect(resolvePackageIdentity([], null)).toBeNull();
    });

    it('falls back to seedcord when present and no request was made', () => {
        const list = ids('@seedcord/services', 'seedcord', '@seedcord/plugins');
        expect(resolvePackageIdentity(list, null)?.fullName).toBe('seedcord');
        expect(resolvePackageIdentity(list, '')?.fullName).toBe('seedcord');
    });

    it('falls back to the first package when seedcord is absent and no request', () => {
        const list = ids('@seedcord/services', '@seedcord/plugins');
        expect(resolvePackageIdentity(list, null)?.fullName).toBe('@seedcord/services');
    });

    it('resolves a scoped name directly', () => {
        const list = ids('seedcord', '@seedcord/services');
        expect(resolvePackageIdentity(list, '@seedcord/services')?.fullName).toBe('@seedcord/services');
    });

    it('resolves the display alias to the identity (folder + fullName)', () => {
        const list = ids('seedcord', '@seedcord/services', '@seedcord/plugins');
        expect(resolvePackageIdentity(list, 'services')).toEqual({
            folder: 'services',
            fullName: '@seedcord/services'
        });
        expect(resolvePackageIdentity(list, 'plugins')?.fullName).toBe('@seedcord/plugins');
    });

    it('resolves last-segment alias for scoped packages', () => {
        expect(resolvePackageIdentity(ids('@seedcord/types'), 'types')?.fullName).toBe('@seedcord/types');
    });

    it('resolves by folder directly', () => {
        const list = ids('seedcord', '@seedcord/eslint-config');
        expect(resolvePackageIdentity(list, 'eslint-config')?.fullName).toBe('@seedcord/eslint-config');
    });

    it('is case-insensitive on the requested name', () => {
        const list = ids('seedcord', '@seedcord/services');
        expect(resolvePackageIdentity(list, 'SERVICES')?.fullName).toBe('@seedcord/services');
        expect(resolvePackageIdentity(list, '  Services  ')?.fullName).toBe('@seedcord/services');
        expect(resolvePackageIdentity(list, '@SEEDCORD/Services')?.fullName).toBe('@seedcord/services');
    });

    it('resolves explicit override aliases', () => {
        const list = ids('seedcord', '@seedcord/core', '@seedcord/eslint-config', '@seedcord/cli');
        expect(resolvePackageIdentity(list, 'eslint-config')?.fullName).toBe('@seedcord/eslint-config');
        expect(resolvePackageIdentity(list, 'cli')?.fullName).toBe('@seedcord/cli');
        expect(resolvePackageIdentity(list, 'core')?.fullName).toBe('@seedcord/core');
    });

    it('synthesises an @seedcord/<name> alias for unscoped manifest names', () => {
        const list = ids('utils-extra');
        expect(resolvePackageIdentity(list, '@seedcord/utils-extra')?.fullName).toBe('utils-extra');
        expect(resolvePackageIdentity(list, 'utils-extra')?.fullName).toBe('utils-extra');
    });

    it('falls back to the default when the requested name is unknown', () => {
        const list = ids('seedcord', '@seedcord/services');
        expect(resolvePackageIdentity(list, 'no-such-package')?.fullName).toBe('seedcord');
    });

    it('falls back to the first package when seedcord is absent and request is unknown', () => {
        const list = ids('@seedcord/services', '@seedcord/plugins');
        expect(resolvePackageIdentity(list, 'no-such-package')?.fullName).toBe('@seedcord/services');
    });
});
