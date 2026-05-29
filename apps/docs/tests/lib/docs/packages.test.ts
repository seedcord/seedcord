import { describe, expect, it } from 'vitest';

import {
    DEFAULT_MANIFEST_PACKAGE,
    DEFAULT_VERSION,
    formatDisplayPackageName,
    resolveExternalPackageUrl,
    resolveManifestPackageName
} from '../../../src/lib/docs/packages';

import type { DocsEngine } from '@seedcord/docs-engine';

function makeEngine(packages: string[]): DocsEngine {
    return { listPackages: () => packages } as unknown as DocsEngine;
}

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

    it('does not lowercase-match Map (mixed case lookup keys are preserved)', () => {
        expect(resolveExternalPackageUrl('MAP')).toBeNull();
    });
});

describe('resolveManifestPackageName', () => {
    it('returns the default when the engine reports no packages', () => {
        const engine = makeEngine([]);
        expect(resolveManifestPackageName(engine, 'anything')).toBe(DEFAULT_MANIFEST_PACKAGE);
        expect(resolveManifestPackageName(engine, null)).toBe(DEFAULT_MANIFEST_PACKAGE);
        expect(resolveManifestPackageName(engine, undefined)).toBe(DEFAULT_MANIFEST_PACKAGE);
    });

    it('falls back to seedcord when present and no request was made', () => {
        const engine = makeEngine(['@seedcord/services', 'seedcord', '@seedcord/plugins']);
        expect(resolveManifestPackageName(engine, null)).toBe('seedcord');
        expect(resolveManifestPackageName(engine, '')).toBe('seedcord');
    });

    it('falls back to the first package when seedcord is absent and no request', () => {
        const engine = makeEngine(['@seedcord/services', '@seedcord/plugins']);
        expect(resolveManifestPackageName(engine, null)).toBe('@seedcord/services');
    });

    it('resolves a scoped name directly', () => {
        const engine = makeEngine(['seedcord', '@seedcord/services']);
        expect(resolveManifestPackageName(engine, '@seedcord/services')).toBe('@seedcord/services');
    });

    it('resolves the display alias to the scoped manifest name', () => {
        const engine = makeEngine(['seedcord', '@seedcord/services', '@seedcord/plugins']);
        expect(resolveManifestPackageName(engine, 'services')).toBe('@seedcord/services');
        expect(resolveManifestPackageName(engine, 'plugins')).toBe('@seedcord/plugins');
    });

    it('resolves last-segment alias for scoped packages', () => {
        const engine = makeEngine(['@seedcord/types']);
        expect(resolveManifestPackageName(engine, 'types')).toBe('@seedcord/types');
    });

    it('is case-insensitive on the requested name', () => {
        const engine = makeEngine(['seedcord', '@seedcord/services']);
        expect(resolveManifestPackageName(engine, 'SERVICES')).toBe('@seedcord/services');
        expect(resolveManifestPackageName(engine, '  Services  ')).toBe('@seedcord/services');
        expect(resolveManifestPackageName(engine, '@SEEDCORD/Services')).toBe('@seedcord/services');
    });

    it('resolves explicit override aliases', () => {
        const engine = makeEngine(['seedcord', '@seedcord/eslint-config', '@seedcord/cli']);
        expect(resolveManifestPackageName(engine, 'eslint')).toBe('@seedcord/eslint-config');
        expect(resolveManifestPackageName(engine, 'cli')).toBe('@seedcord/cli');
        expect(resolveManifestPackageName(engine, 'core')).toBe('seedcord');
    });

    it('synthesises an @seedcord/<name> alias for unscoped manifest names', () => {
        const engine = makeEngine(['utils-extra']);
        expect(resolveManifestPackageName(engine, '@seedcord/utils-extra')).toBe('utils-extra');
        expect(resolveManifestPackageName(engine, 'utils-extra')).toBe('utils-extra');
    });

    it('falls back to the default when the requested name is unknown', () => {
        const engine = makeEngine(['seedcord', '@seedcord/services']);
        expect(resolveManifestPackageName(engine, 'no-such-package')).toBe('seedcord');
    });

    it('falls back to the first package when seedcord is absent and request is unknown', () => {
        const engine = makeEngine(['@seedcord/services', '@seedcord/plugins']);
        expect(resolveManifestPackageName(engine, 'no-such-package')).toBe('@seedcord/services');
    });
});
