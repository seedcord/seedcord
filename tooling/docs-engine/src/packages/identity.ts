import { rawExternalLinks } from '#packages/external-links';

const EXTERNAL_DOCUMENTATION_LINKS: ReadonlyMap<string, string> = new Map(
    Object.entries(rawExternalLinks).map(([key, value]) => [sanitizeExternalKey(key), value])
);

interface PackageOverride {
    displayName?: string;
    aliases?: readonly string[];
}

const PACKAGE_OVERRIDES: Record<string, PackageOverride> = {
    '@seedcord/gateway': {
        displayName: 'gateway',
        aliases: ['gateway', 'ws']
    },
    '@seedcord/core': {
        displayName: 'core',
        aliases: ['core']
    },
    '@seedcord/http': {
        displayName: 'http',
        aliases: ['http', 'edge']
    },
    '@seedcord/plugin-mongoose': {
        displayName: 'plugin-mongoose',
        aliases: ['plugin-mongoose', 'mongoose', 'mongo']
    },
    '@seedcord/plugin-kysely-postgres': {
        displayName: 'plugin-kysely-postgres',
        aliases: ['plugin-kysely-postgres', 'kysely', 'postgres', 'pg']
    },
    '@seedcord/types': {
        displayName: 'types',
        aliases: ['types']
    },
    '@seedcord/utils': {
        displayName: 'utils',
        aliases: ['utils']
    },
    '@seedcord/eslint-config': {
        displayName: 'eslint-config',
        aliases: ['eslint-config']
    },
    '@seedcord/eslint-plugin': {
        displayName: 'eslint-plugin',
        aliases: ['eslint-plugin']
    },
    seedcord: {
        displayName: 'seedcord',
        aliases: ['cli', 'seedcord']
    },
    '@seedcord/custom-id': {
        displayName: 'custom-id',
        aliases: ['custom-id', 'customid']
    },
    '@seedcord/errors': {
        displayName: 'errors',
        aliases: ['errors']
    },
    '@seedcord/rate-limiter': {
        displayName: 'rate-limiter',
        aliases: ['rate-limiter']
    },
    '@seedcord/event-emitter': {
        displayName: 'event-emitter',
        aliases: ['event-emitter']
    },
    '@seedcord/logger': {
        displayName: 'logger',
        aliases: ['logger']
    },
    'eslint-plugin-discordjs': {
        aliases: ['eslint-plugin-discordjs', 'eslint-plugin-djs']
    }
};

export const DEFAULT_MANIFEST_PACKAGE = 'seedcord';
export const DEFAULT_VERSION = 'latest';

const normalizeKey = (value: string): string => value.trim().toLowerCase();

function sanitizeExternalKey(value: string): string {
    if (!value) return '';
    return value
        .replace(/^@types\//, '') // DefinitelyTyped (@types/pg) documents the runtime package (pg)
        .replaceAll(/<.*>/g, '')
        .replaceAll('[]', '')
        .replaceAll(/\|.*/g, '')
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
        .replaceAll(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '')
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

// the R2 index.json is additive. A folder published once stays, so removed and mis-keyed folders linger.
// a scoped key here needs a displayName matching its folder.
const DOCUMENTED_PACKAGE_FOLDERS: ReadonlySet<string> = new Set(
    Object.keys(PACKAGE_OVERRIDES).map((name) => formatDisplayPackageName(name))
);

export function isDocumentedPackage(folder: string): boolean {
    return DOCUMENTED_PACKAGE_FOLDERS.has(folder);
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

export interface PackageIdentity {
    folder: string;
    fullName: string;
}

// Resolves a package request, falling back to `seedcord` or the first available package.
export function resolvePackageIdentity(
    packages: readonly PackageIdentity[],
    requested?: string | null
): PackageIdentity | null {
    if (packages.length === 0) {
        return null;
    }

    const byFullName = new Map(packages.map((pkg) => [pkg.fullName, pkg] as const));
    const fallback = byFullName.get(DEFAULT_MANIFEST_PACKAGE) ?? packages[0] ?? null;

    if (!requested) {
        return fallback;
    }

    const aliasMap = computePackageAliases(packages.map((pkg) => pkg.fullName));
    const resolved = aliasMap.get(normalizeKey(requested));
    if (resolved) {
        return byFullName.get(resolved) ?? fallback;
    }

    const byFolder = packages.find((pkg) => normalizeKey(pkg.folder) === normalizeKey(requested));
    return byFolder ?? fallback;
}
