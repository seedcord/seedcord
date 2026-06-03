import { IndexFetchError } from '@remote/errors';
import { isEntityTone, type EntityTone } from '@src/tones';

/**
 * Root `index.json` published to the artifacts repo. `packages` is keyed by the unscoped folder
 * name (`utils`), which `pathTemplates` substitute as `{name}`; `fullName` is the scoped display
 * name (`@seedcord/utils`). The doc-version axis is the latest patch per minor (pre-1.0) and per
 * major (post-1.0), not every published patch.
 */
export interface IndexJson {
    schemaVersion: 1;
    updatedAt: string;
    pathTemplates: { stable: string; prerelease: string };
    packages: Record<string, PackageIndexEntry>;
}

export interface StableChannel {
    latest: string;
    latestByMinor: Record<string, string>;
    latestByMajor: Record<string, string>;
}

export interface PackageIndexEntry {
    fullName: string;
    stable: StableChannel | null;
    prerelease: { latest: string } | null;
    // Entity slug -> tone for the latest version (`logger` -> `class`). The lazy engine reads this to
    // build `/tone/version/slug` URLs for an unloaded package and to drop links to non-entities
    // (params, mis-attributed externals). Absent on legacy indexes.
    entities?: Record<string, EntityTone>;
}

export function validateIndex(value: unknown): IndexJson {
    const root = asObject(value, 'index.json');
    if (root.schemaVersion !== 1) {
        throw new IndexFetchError(null, `index.json: unsupported schemaVersion ${String(root.schemaVersion)}`);
    }

    const pathTemplates = asObject(root.pathTemplates, 'index.json.pathTemplates');
    const packagesRaw = asObject(root.packages, 'index.json.packages');

    const packages: Record<string, PackageIndexEntry> = {};
    for (const [folder, entry] of Object.entries(packagesRaw)) {
        packages[folder] = validateEntry(folder, entry);
    }

    return {
        schemaVersion: 1,
        updatedAt: asString(root.updatedAt, 'index.json.updatedAt'),
        pathTemplates: {
            stable: asString(pathTemplates.stable, 'index.json.pathTemplates.stable'),
            prerelease: asString(pathTemplates.prerelease, 'index.json.pathTemplates.prerelease')
        },
        packages
    };
}

function validateEntry(folder: string, value: unknown): PackageIndexEntry {
    const where = `index.json.packages.${folder}`;
    const entry = asObject(value, where);
    const base: PackageIndexEntry = {
        fullName: asString(entry.fullName, `${where}.fullName`),
        stable: isNullish(entry.stable) ? null : validateStable(where, entry.stable),
        prerelease: isNullish(entry.prerelease)
            ? null
            : {
                  latest: asString(
                      asObject(entry.prerelease, `${where}.prerelease`).latest,
                      `${where}.prerelease.latest`
                  )
              }
    };

    if (!isNullish(entry.entities)) {
        base.entities = asEntityToneRecord(entry.entities, `${where}.entities`);
    }

    return base;
}

function validateStable(where: string, value: unknown): StableChannel {
    const stable = asObject(value, `${where}.stable`);
    return {
        latest: asString(stable.latest, `${where}.stable.latest`),
        latestByMinor: asStringRecord(stable.latestByMinor, `${where}.stable.latestByMinor`),
        latestByMajor: asStringRecord(stable.latestByMajor, `${where}.stable.latestByMajor`)
    };
}

function isNullish(value: unknown): boolean {
    return value === null || value === undefined;
}

function asObject(value: unknown, where: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new IndexFetchError(null, `${where} must be an object`);
    }
    return value as Record<string, unknown>;
}

function asString(value: unknown, where: string): string {
    if (typeof value !== 'string') {
        throw new IndexFetchError(null, `${where} must be a string`);
    }
    return value;
}

function asStringRecord(value: unknown, where: string): Record<string, string> {
    const record = asObject(value, where);
    const out: Record<string, string> = {};
    for (const [key, entry] of Object.entries(record)) {
        out[key] = asString(entry, `${where}.${key}`);
    }
    return out;
}

function asEntityToneRecord(value: unknown, where: string): Record<string, EntityTone> {
    const record = asObject(value, where);
    const out: Record<string, EntityTone> = {};
    for (const [key, entry] of Object.entries(record)) {
        const tone = asString(entry, `${where}.${key}`);
        if (!isEntityTone(tone)) {
            throw new IndexFetchError(null, `${where}.${key} is not a valid entity tone: ${tone}`);
        }
        out[key] = tone;
    }
    return out;
}
