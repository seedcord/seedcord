import { toBareReferences } from '#src/release/ChangelogRenderer';

import type { ReleaseEntries, ReleaseEntry } from '#src/release/ReleaseEntries';

export interface ReleasePackage {
    name: string;
    version: string;
    oldVersion?: string;
    directory: string;
    changelog: string;
}

interface NotesConfig {
    repo: string;
    tag: string;
    previousTag?: string | undefined;
    published: readonly ReleasePackage[];
    entries: ReleaseEntries;
}

export class ReleaseNotes {
    constructor(private readonly config: NotesConfig) {}

    body(): string {
        const quiet = new Set(this.config.entries.dependencyOnly);
        const changed = this.config.published.filter((pkg) => !quiet.has(pkg.name));

        const parts = [
            this.table(changed),
            dependencyBlock(this.config.published.filter((pkg) => quiet.has(pkg.name))),
            section('💥 Breaking changes', this.config.entries.breaking),
            section('✨ Minor changes', this.config.entries.minor),
            section('🩹 Patch changes', this.config.entries.patch),
            this.footer()
        ];

        return `${parts.filter((part) => part !== '').join('\n\n')}\n`;
    }

    private footer(): string {
        const { repo, tag, previousTag } = this.config;
        if (previousTag === undefined) return '';

        const diff = `https://github.com/${repo}/compare/${previousTag}...${tag}`;
        const release = `https://github.com/${repo}/releases/tag/${previousTag}`;

        return `---\n\n<sub>[See what changed](${diff}) since the [last release](${release})</sub>`;
    }

    private table(packages: readonly ReleasePackage[]): string {
        if (packages.length === 0) return '';

        const rows = packages.map((pkg) => {
            const url = `https://github.com/${this.config.repo}/blob/${this.config.tag}/${pkg.directory}/CHANGELOG.md#${headingAnchor(pkg.version)}`;

            const versions =
                pkg.oldVersion === undefined ? `${pkg.version} (new)` : `${pkg.oldVersion} → ${pkg.version}`;

            return `| [${pkg.name}](${url}) | ${versions} |`;
        });

        return ['## 📦 Packages', '', '| package | version |', '| --- | --- |', ...rows].join('\n');
    }
}

// github renders the anchor for `## 0.16.0` as `#0160`
function headingAnchor(version: string): string {
    return version.toLowerCase().replaceAll('.', '');
}

function dependencyBlock(packages: readonly ReleasePackage[]): string {
    if (packages.length === 0) return '';

    const rows = packages.map((pkg) => `- \`${pkg.name}\` ${pkg.version}`);
    const count = `${String(packages.length)} more published with seedcord dependency bumps only`;

    return ['<details>', `<summary>${count}</summary>`, '', ...rows, '', '</details>'].join('\n');
}

function section(heading: string, entries: readonly ReleaseEntry[]): string {
    if (entries.length === 0) return '';

    const rows = entries.map((entry) => `- **${entry.packages.join(', ')}**: ${toBareReferences(entry.summary)}`);

    return [`## ${heading}`, '', ...rows].join('\n');
}
