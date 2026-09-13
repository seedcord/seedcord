import { bucketOf, headingOf, ownBody, SECTION_START, splitEntries } from '#src/release/changelog-format';
import { ChangelogFile } from '#src/release/ChangelogFile';

import type { Bucket } from '#src/release/changelog-format';

export interface PublishedPackage {
    name: string;
    version: string;
    changelog: string;
}

export interface ReleaseEntry {
    summary: string;
    packages: string[];
}

export class ReleaseEntries {
    private readonly buckets = new Map<Bucket, ReleaseEntry[]>();
    private readonly quiet: string[] = [];

    constructor(published: readonly PublishedPackage[]) {
        for (const pkg of published) {
            const section = new ChangelogFile(pkg.changelog).sectionFor(pkg.version);
            const found = section === undefined ? 0 : this.collect(section, shortName(pkg.name));
            if (found === 0) this.quiet.push(pkg.name);
        }
    }

    get breaking(): ReleaseEntry[] {
        return this.buckets.get('breaking') ?? [];
    }

    get minor(): ReleaseEntry[] {
        return this.buckets.get('minor') ?? [];
    }

    get patch(): ReleaseEntry[] {
        return this.buckets.get('patch') ?? [];
    }

    /** Packages whose release carries nothing beyond their own seedcord bumps. */
    get dependencyOnly(): string[] {
        return this.quiet;
    }

    private collect(section: string, pkg: string): number {
        let added = 0;

        for (const part of section.split(SECTION_START)) {
            const bucket = bucketOf(headingOf(part));
            if (bucket === undefined) continue;

            // the nested block lists seedcord bumps, which the release body covers through its table
            for (const entry of splitEntries(ownBody(part))) {
                this.add(bucket, entry.slice(2), pkg);
                added += 1;
            }
        }

        return added;
    }

    private add(bucket: Bucket, summary: string, pkg: string): void {
        const entries = this.buckets.get(bucket) ?? [];
        const existing = entries.find((entry) => entry.summary === summary);

        if (existing) existing.packages.push(pkg);
        else entries.push({ summary, packages: [pkg] });

        this.buckets.set(bucket, entries);
    }
}

function shortName(name: string): string {
    return name.replace('@seedcord/', '');
}
