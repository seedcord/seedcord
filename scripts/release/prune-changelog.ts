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
 * Removes a prerelease section once its stable section exists above it, so the changelog keeps
 * one entry per released version.
 */
export function pruneSupersededPrereleases(changelog: string): string {
    const sections = changelog.split(/(?=^## )/m);
    // a stable below a prerelease is an older line from before a package rename
    const stableAbove = new Set<string>();
    const kept: string[] = [];
    for (const section of sections) {
        const version = sectionVersion(section);
        if (version && STABLE.test(version)) stableAbove.add(version);
        const base = PRERELEASE.exec(version ?? '')?.[1];
        if (base && stableAbove.has(base)) {
            // a --- block is a hand-authored note, changesets never emits one
            const note = /^---$/m.exec(section);
            if (note) kept.push(section.slice(note.index));
            continue;
        }
        kept.push(section);
    }
    // dropping the last section leaves a blank line at EOF
    return kept.join('').replace(/\n*$/, '\n');
}

function pruneAllPackages(): void {
    const repoRoot = resolve(import.meta.dirname, '..', '..');
    let prunedAny = false;
    for (const root of ['packages', 'plugins']) {
        const rootDir = resolve(repoRoot, root);
        if (!fs.existsSync(rootDir)) continue;
        for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const changelogPath = resolve(rootDir, entry.name, 'CHANGELOG.md');
            if (!fs.existsSync(changelogPath)) continue;
            const before = fs.readFileSync(changelogPath, 'utf8');
            const after = pruneSupersededPrereleases(before);
            if (after === before) continue;
            fs.writeFileSync(changelogPath, after, 'utf8');
            console.log(`Pruned superseded prerelease sections from ${changelogPath}`);
            prunedAny = true;
        }
    }
    if (!prunedAny) console.log('No superseded prerelease sections to prune');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
    pruneAllPackages();
}
