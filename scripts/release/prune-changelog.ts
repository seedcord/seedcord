import console from 'node:console';
import fs from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const STABLE = /^\d+\.\d+\.\d+$/;
const PRERELEASE = /^(\d+\.\d+\.\d+)-/;

function sectionVersion(section: string): string | undefined {
    return /^## (\S+)/.exec(section)?.[1];
}

/**
 * Removes `## X.Y.Z-next.N` sections whose stable `## X.Y.Z` already exists, so a graduated release
 * keeps one changelog entry per version.
 */
export function pruneSupersededPrereleases(changelog: string): string {
    const sections = changelog.split(/(?=^## )/m);
    const stable = new Set<string>();
    for (const section of sections) {
        const version = sectionVersion(section);
        if (version && STABLE.test(version)) stable.add(version);
    }
    return sections
        .filter((section) => {
            const base = PRERELEASE.exec(sectionVersion(section) ?? '')?.[1];
            return !(base && stable.has(base));
        })
        .join('');
}

function pruneAllPackages(): void {
    const packagesDir = resolve(import.meta.dirname, '..', '..', 'packages');
    let prunedAny = false;
    for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const changelogPath = resolve(packagesDir, entry.name, 'CHANGELOG.md');
        if (!fs.existsSync(changelogPath)) continue;
        const before = fs.readFileSync(changelogPath, 'utf8');
        const after = pruneSupersededPrereleases(before);
        if (after === before) continue;
        fs.writeFileSync(changelogPath, after, 'utf8');
        console.log(`Pruned superseded prerelease sections from ${changelogPath}`);
        prunedAny = true;
    }
    if (!prunedAny) console.log('No superseded prerelease sections to prune');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
    pruneAllPackages();
}
