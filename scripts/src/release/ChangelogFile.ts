import { readFile } from 'node:fs/promises';

const HEADING = /^## (\S+)/;
const SECTION_START = /(?=^## )/m;
const STABLE = /^\d+\.\d+\.\d+$/;
const PRERELEASE = /^(\d+\.\d+\.\d+)-/;
const NOTE = /^---$/m;

const versionOf = (section: string): string | undefined => HEADING.exec(section)?.[1];

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

        return index === -1 ? undefined : versions[index + 1];
    }

    withoutSupersededPrereleases(): ChangelogFile {
        // a stable below a prerelease is an older line from before a package rename
        const stableAbove = new Set<string>();
        const kept: string[] = [];

        for (const section of this.sections()) {
            const version = versionOf(section);
            if (version && STABLE.test(version)) stableAbove.add(version);

            const base = PRERELEASE.exec(version ?? '')?.[1];
            if (base && stableAbove.has(base)) {
                // changesets never writes a --- block, so one here was added by hand
                const note = NOTE.exec(section);
                if (note) kept.push(section.slice(note.index));
                continue;
            }
            kept.push(section);
        }

        return new ChangelogFile(kept.join('').replace(/\n*$/, '\n'));
    }

    private sections(): string[] {
        return this.text.split(SECTION_START);
    }
}
