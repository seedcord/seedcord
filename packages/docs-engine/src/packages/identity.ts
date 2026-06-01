import { rawExternalLinks } from './external-links';

import type { DocsEngine } from '../DocsEngine';

const EXTERNAL_DOCUMENTATION_LINKS: ReadonlyMap<string, string> = new Map(
    Object.entries(rawExternalLinks).map(([key, value]) => [sanitizeExternalKey(key), value])
);

interface PackageOverride {
    displayName?: string;
    aliases?: readonly string[];
}

const PACKAGE_OVERRIDES: Record<string, PackageOverride> = {
    seedcord: {
        displayName: 'seedcord',
        aliases: ['@seedcord', 'core']
    },
    '@seedcord/plugins': {
        displayName: 'plugins',
        aliases: ['@seedcord/plugins']
    },
    '@seedcord/services': {
        displayName: 'services',
        aliases: ['@seedcord/services']
    },
    '@seedcord/types': {
        displayName: 'types',
        aliases: ['@seedcord/types']
    },
    '@seedcord/utils': {
        displayName: 'utils',
        aliases: ['@seedcord/utils']
    },
    '@seedcord/eslint-config': {
        displayName: 'eslint-config',
        aliases: ['eslint', '@seedcord/eslint-config']
    },
    '@seedcord/cli': {
        displayName: 'cli',
        aliases: ['cli', '@seedcord/cli']
    }
};

export const DEFAULT_MANIFEST_PACKAGE = 'seedcord';
export const DEFAULT_VERSION = 'latest';

const normalizeKey = (value: string): string => value.trim().toLowerCase();

function sanitizeExternalKey(value: string): string {
    if (!value) return '';
    return value
        .replace(/^@types\//, '') // DefinitelyTyped (@types/pg) documents the runtime package (pg)
        .replace(/<.*>/g, '')
        .replace(/\[\]/g, '')
        .replace(/\|.*/g, '')
        .trim();
}

export function resolveExternalPackageUrl(packageName?: string | null): string | null {
    if (!packageName) {
        return null;
    }

    const candidates = new Set<string>();

    const sanitized = sanitizeExternalKey(packageName);
    if (sanitized) candidates.add(sanitized);

    if (sanitized.length > 0) {
        const cap = sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
        candidates.add(cap);
    }
    const stripped = packageName
        .trim()
        .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
        .trim();
    if (stripped) candidates.add(sanitizeExternalKey(stripped));

    for (const key of candidates) {
        const url = EXTERNAL_DOCUMENTATION_LINKS.get(key);
        if (url) return url;
    }

    return null;
}

export function formatDisplayPackageName(manifestName: string): string {
    const override = PACKAGE_OVERRIDES[manifestName]?.displayName;
    return override ?? manifestName;
}

function computePackageAliases(available: readonly string[]): Map<string, string> {
    const map = new Map<string, string>();

    for (const manifestName of available) {
        const override = PACKAGE_OVERRIDES[manifestName];
        const aliases = new Set<string>([
            manifestName,
            normalizeKey(manifestName),
            formatDisplayPackageName(manifestName),
            normalizeKey(formatDisplayPackageName(manifestName))
        ]);

        const lastSegment = manifestName.includes('/') ? manifestName.split('/').at(-1) : manifestName;
        if (lastSegment) {
            aliases.add(lastSegment);
            aliases.add(normalizeKey(lastSegment));
        }

        if (!manifestName.startsWith('@')) {
            const scoped = `@seedcord/${manifestName}`;
            aliases.add(scoped);
            aliases.add(normalizeKey(scoped));
        }

        if (override?.aliases) {
            for (const alias of override.aliases) {
                aliases.add(alias);
                aliases.add(normalizeKey(alias));
            }
        }

        for (const alias of aliases) {
            map.set(normalizeKey(alias), manifestName);
        }
    }

    return map;
}

export function resolveManifestPackageName(engine: DocsEngine, requested?: string | null): string {
    const packages = engine.listPackages();
    if (!packages.length) {
        return DEFAULT_MANIFEST_PACKAGE;
    }

    if (!requested) {
        const fallback = packages[0] ?? DEFAULT_MANIFEST_PACKAGE;
        return packages.includes(DEFAULT_MANIFEST_PACKAGE) ? DEFAULT_MANIFEST_PACKAGE : fallback;
    }

    const aliasMap = computePackageAliases(packages);
    const normalized = normalizeKey(requested);
    const resolved = aliasMap.get(normalized);

    if (resolved) {
        return resolved;
    }

    const direct = packages.find((pkg) => normalizeKey(pkg) === normalized);
    if (direct) {
        return direct;
    }

    const fallback = packages[0] ?? DEFAULT_MANIFEST_PACKAGE;
    return packages.includes(DEFAULT_MANIFEST_PACKAGE) ? DEFAULT_MANIFEST_PACKAGE : fallback;
}
