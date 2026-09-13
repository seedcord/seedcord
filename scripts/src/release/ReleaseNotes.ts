import type { ReleaseEntries, ReleaseEntry } from '#src/release/ReleaseEntries';

export interface ReleasePackage {
    name: string;
    version: string;
    oldVersion: string;
    directory: string;
    changelog: string;
}

export interface NotesConfig {
    repo: string;
    tag: string;
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
            section('🩹 Patch changes', this.config.entries.patch)
        ];

        return `${parts.filter((part) => part !== '').join('\n\n')}\n`;
    }

    private table(packages: readonly ReleasePackage[]): string {
        if (packages.length === 0) return '';

        const rows = packages.map((pkg) => {
            const url = `https://github.com/${this.config.repo}/blob/${this.config.tag}/${pkg.directory}/CHANGELOG.md`;

            return `| [${pkg.name}](${url}) | ${pkg.oldVersion} → ${pkg.version} |`;
        });

        return [
            '## 📦 Packages',
            '',
            '<!-- prettier-ignore-start -->',
            '',
            '| package | version |',
            '| --- | --- |',
            ...rows,
            '',
            '<!-- prettier-ignore-end -->'
        ].join('\n');
    }
}

function dependencyBlock(packages: readonly ReleasePackage[]): string {
    if (packages.length === 0) return '';

    const rows = packages.map((pkg) => `- \`${pkg.name}\` ${pkg.version}`);
    const count = `${String(packages.length)} more published with seedcord dependency bumps only`;

    return ['<details>', `<summary>${count}</summary>`, '', ...rows, '', '</details>'].join('\n');
}

function section(heading: string, entries: readonly ReleaseEntry[]): string {
    if (entries.length === 0) return '';

    // an entry carrying a continuation paragraph needs a blank line before the next bullet
    const rows = entries.map((entry, index) => {
        const row = `- **${entry.packages.join(', ')}**: ${entry.summary}`;

        return row.includes('\n') && index < entries.length - 1 ? `${row}\n` : row;
    });

    return [`## ${heading}`, '', ...rows].join('\n');
}
