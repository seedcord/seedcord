import { ORDER } from '#src/release/changelog-format';
import { toBareReferences } from '#src/release/ChangelogRenderer';

import type { Bucket } from '#src/release/changelog-format';
import type { ReleaseEntries } from '#src/release/ReleaseEntries';

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

interface Change {
    line: string;
    packages: readonly string[];
}

const KIND: Record<Bucket, string> = { breaking: '💥', minor: '✨', patch: '🔧' };
const FIXED = '🐛';

const FOLDER_HEADING: Record<string, string> = {
    packages: '📦 Packages',
    plugins: '🔌 Plugins',
    cli: '💻 CLIs',
    tooling: '🧹 Tooling'
};

export class ReleaseNotes {
    private readonly changes: Change[];

    constructor(private readonly config: NotesConfig) {
        this.changes = ORDER.flatMap((bucket) =>
            config.entries[bucket].map((entry) => ({
                line: `${kindOf(bucket, entry.summary)} ${toBareReferences(entry.summary)}`,
                packages: entry.packages
            }))
        );
    }

    body(): string {
        const quiet = new Set(this.config.entries.dependencyOnly);
        const changed = this.config.published.filter((pkg) => !quiet.has(pkg.name));

        const parts = [
            this.table(changed),
            dependencyBlock(this.config.published.filter((pkg) => quiet.has(pkg.name))),
            ...this.folderSections(),
            this.sharedSection(),
            this.footer()
        ];

        return `${parts.filter((part) => part !== '').join('\n\n')}\n`;
    }

    private folderSections(): string[] {
        const folders = new Set([...Object.keys(FOLDER_HEADING), ...this.config.published.map(folderOf)]);

        return [...folders].map((folder) => {
            const blocks = this.config.published
                .filter((pkg) => folderOf(pkg) === folder)
                .toSorted((a, b) => shortName(a.name).localeCompare(shortName(b.name)))
                .map((pkg) => this.packageBlock(pkg))
                .filter((block) => block !== '');

            return blocks.length === 0 ? '' : [`## ${FOLDER_HEADING[folder] ?? folder}`, ...blocks].join('\n\n');
        });
    }

    private packageBlock(pkg: ReleasePackage): string {
        const own = this.changes.filter((change) => change.packages.length === 1 && change.packages[0] === pkg.name);
        if (own.length === 0) return '';

        const lines = own.map((change) => `- ${change.line}`).join('\n');

        return [`### \`${pkg.name}\``, `<sub>${versionsOf(pkg)}</sub>`, lines].join('\n\n');
    }

    private sharedSection(): string {
        const shared = this.changes.filter((change) => change.packages.length > 1);
        if (shared.length === 0) return '';

        const blocks = shared.map((change) => {
            const names = change.packages.map((name) => `\`${shortName(name)}\``).toSorted();

            return `#### ${change.line}\n\n${names.join(' ')}`;
        });

        return ['## 👥 Shared changes', ...blocks].join('\n\n');
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

            return `| [${pkg.name}](${url}) | ${versionsOf(pkg)} |`;
        });

        return ['| package | version |', '| --- | --- |', ...rows].join('\n');
    }
}

// the changeset rules open every bug fix with "Fixed"
function kindOf(bucket: Bucket, summary: string): string {
    return bucket === 'patch' && summary.startsWith('Fixed') ? FIXED : KIND[bucket];
}

function folderOf(pkg: ReleasePackage): string {
    return pkg.directory.split('/')[0] ?? pkg.directory;
}

function shortName(name: string): string {
    return name.replace('@seedcord/', '');
}

function versionsOf(pkg: ReleasePackage): string {
    return pkg.oldVersion === undefined ? `${pkg.version} (new)` : `${pkg.oldVersion} → ${pkg.version}`;
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
