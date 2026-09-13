import {
    bodyWithoutNested,
    bucketOf,
    headingOf,
    ORDER,
    SECTION_START,
    splitEntries
} from '#src/release/changelog-format';
import { ChangelogFile } from '#src/release/ChangelogFile';

import type { Bucket } from '#src/release/changelog-format';

interface PublishedPackage {
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
    private readonly dependencyOnlyNames: string[] = [];

    constructor(published: readonly PublishedPackage[]) {
        for (const pkg of published) {
            const section = new ChangelogFile(pkg.changelog).sectionFor(pkg.version);
            const found = section === undefined ? 0 : this.collect(section, shortName(pkg.name));
            if (found === 0) this.dependencyOnlyNames.push(pkg.name);
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

    get dependencyOnly(): string[] {
        return this.dependencyOnlyNames;
    }

    private collect(section: string, pkg: string): number {
        let added = 0;

        for (const part of section.split(SECTION_START)) {
            const bucket = bucketOf(headingOf(part));
            if (bucket === undefined) continue;

            for (const entry of splitEntries(bodyWithoutNested(part))) {
                this.add(bucket, entry.slice(2), pkg);
                added += 1;
            }
        }

        return added;
    }

    // one changeset can bump core as a minor and gateway as a patch
    private add(bucket: Bucket, summary: string, pkg: string): void {
        const found = this.find(summary);
        const entry = found?.entry ?? { summary, packages: [] };
        entry.packages.push(pkg);

        if (found && ORDER.indexOf(found.bucket) <= ORDER.indexOf(bucket)) return;
        if (found)
            this.buckets.set(
                found.bucket,
                (this.buckets.get(found.bucket) ?? []).filter((one) => one !== entry)
            );

        this.buckets.set(bucket, [...(this.buckets.get(bucket) ?? []), entry]);
    }

    private find(summary: string): { bucket: Bucket; entry: ReleaseEntry } | undefined {
        for (const [bucket, entries] of this.buckets) {
            const entry = entries.find((one) => one.summary === summary);
            if (entry) return { bucket, entry };
        }

        return undefined;
    }
}

function shortName(name: string): string {
    return name.replace('@seedcord/', '');
}
