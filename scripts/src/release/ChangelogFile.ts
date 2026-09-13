import { readFile } from 'node:fs/promises';

import { isStable, bodyWithoutNested, SECTION_START, splitEntries, VERSION_START } from '#src/release/changelog-format';

const VERSION_HEADING = /^## (\S+)/;
const PRERELEASE = /^(\d+\.\d+\.\d+)-/;
const NOTE = /^---$/m;
const DEPENDENCY_NAME = /^- `([^`]+)` \S+/gm;

const versionOf = (section: string): string | undefined => VERSION_HEADING.exec(section)?.[1];

export class ChangelogFile {
    static async read(filePath: string): Promise<ChangelogFile> {
        return new ChangelogFile(await readFile(filePath, 'utf8'));
    }

    constructor(private readonly text: string) {}

    get contents(): string {
        return this.text;
    }

    sectionFor(version: string): string | undefined {
        return this.sections().find((section) => versionOf(section) === version);
    }

    versionBefore(version: string): string | undefined {
        const versions = this.sections()
            .map((section) => versionOf(section))
            .filter((one) => one !== undefined);
        const index = versions.indexOf(version);
        if (index === -1) return undefined;

        const older = versions.slice(index + 1);
        return isStable(version) ? older.find((one) => isStable(one)) : older[0];
    }

    withoutSupersededPrereleases(): ChangelogFile {
        let stable: { version: string; section: string } | undefined;
        const kept: string[] = [];

        for (const section of this.sections()) {
            const version = versionOf(section);
            if (version && isStable(version)) stable = { version, section };

            const base = PRERELEASE.exec(version ?? '')?.[1];
            // after a package rename, an older prerelease can carry a higher version than the stable above it
            const superseded =
                base !== undefined &&
                stable !== undefined &&
                (base === stable.version ||
                    (compareCore(base, stable.version) < 0 && carriesEveryEntry(stable.section, section)));

            if (superseded) {
                // a --- block is a note someone added by hand
                const note = NOTE.exec(section);
                if (note) kept.push(section.slice(note.index));
                continue;
            }
            kept.push(section);
        }

        return new ChangelogFile(kept.join('').replace(/\n*$/, '\n'));
    }

    private sections(): string[] {
        return this.text.split(VERSION_START);
    }
}

// history rewritten by hand left some prerelease entries that no stable section repeats
function carriesEveryEntry(stable: string, prerelease: string): boolean {
    const entries = prerelease
        .split(SECTION_START)
        .slice(1)
        .flatMap((part) => splitEntries(bodyWithoutNested(part)));
    const packages = [...prerelease.matchAll(DEPENDENCY_NAME)].map((match) => match[1] ?? '');

    return (
        entries.every((entry) => stable.includes(entry)) && packages.every((name) => stable.includes(`- \`${name}\` `))
    );
}

function compareCore(left: string, right: string): number {
    const theirs = right.split('.').map(Number);

    for (const [index, part] of left.split('.').map(Number).entries()) {
        const diff = part - (theirs[index] ?? 0);
        if (diff !== 0) return diff;
    }

    return 0;
}
