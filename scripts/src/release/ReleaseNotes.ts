import { ORDER } from '#src/release/changelog-format';
import { toBareReferences } from '#src/release/ChangelogRenderer';

import type { Bucket } from '#src/release/changelog-format';
import type { ReleaseEntries } from '#src/release/ReleaseEntries';

export interface ReleasePackage {
    name: string;
    version: string;
    oldVersion?: string;
    // a package with a bin and no exports, like create-seedcord, runs without being installed
    commandOnly?: true;
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

const KINDS = ['💥', '✨', '🐛', '🔧'] as const;
type Kind = (typeof KINDS)[number];

interface Change {
    kind: Kind;
    text: string;
    packages: readonly string[];
}

const KIND_OF_BUCKET: Record<Bucket, Kind> = { breaking: '💥', minor: '✨', patch: '🔧' };
const SHARED = '👥';

const LEGEND = [
    '💥 breaking &nbsp;·&nbsp; ✨ minor &nbsp;·&nbsp; 🐛 fixed &nbsp;·&nbsp; 🔧 changed &nbsp;·&nbsp; 👥 shared',
    'A blank row means only its seedcord dependencies changed.'
].join('\n\n');

const SCOPE = '@seedcord/';
// pnpm 12 waits a day before it installs a new release
const PNPM_WAIT = 'pnpm can take a day to pick this release up.';

const FOLDER_HEADING: Record<string, string> = {
    packages: '📦 Packages',
    plugins: '🔌 Plugins',
    cli: '💻 CLIs',
    tooling: '🧹 Tooling'
};
const FOLDERS = Object.keys(FOLDER_HEADING);

export class ReleaseNotes {
    private readonly changes: Change[];
    private readonly packages: ReleasePackage[];

    constructor(private readonly config: NotesConfig) {
        this.changes = ORDER.flatMap((bucket) =>
            config.entries[bucket].map((entry) => ({
                kind: kindOf(bucket, entry.summary),
                text: toBareReferences(entry.summary),
                packages: entry.packages
            }))
        );
        this.packages = config.published.toSorted(byFolderThenName);
    }

    body(): string {
        const parts = [
            this.table(),
            this.upgradeCommands(),
            ...this.folderSections(),
            this.sharedSection(),
            this.footer()
        ];

        return `${parts.filter((part) => part !== '').join('\n\n')}\n`;
    }

    private table(): string {
        if (this.packages.length === 0) return '';

        const shared = this.sharedChanges();
        const rows = this.packages.map((pkg) => {
            const own = this.ownChanges(pkg);
            const counts = [
                ...KINDS.map((kind) => own.filter((change) => change.kind === kind).length),
                shared.filter((change) => change.packages.includes(pkg.name)).length
            ];

            return `| [\`${pkg.name}\`](${this.changelogUrl(pkg)}) | ${versionsOf(pkg)} | ${counts.map(countOrBlank).join(' | ')} |`;
        });

        return [
            `| package | version | ${KINDS.join(' | ')} | ${SHARED} |`,
            '| --- | --- | :-: | :-: | :-: | :-: | :-: |',
            ...rows,
            '',
            LEGEND
        ].join('\n');
    }

    private upgradeCommands(): string {
        const installed = this.packages.filter((pkg) => pkg.commandOnly !== true).map((pkg) => pkg.name);
        const unscoped = installed.filter((name) => !name.startsWith(SCOPE));
        const targets = [...(unscoped.length < installed.length ? [`${SCOPE}*`] : []), ...unscoped];
        if (targets.length === 0) return '';

        const quoted = targets.map((target) => (target.includes('*') ? `"${target}"` : target));
        const checkUpdates = `npm-check-updates -u --filter "${targets.join(',')}"`;

        return [
            fence(`pnpm up --latest ${quoted.join(' ')}`),
            PNPM_WAIT,
            '<details>\n<summary>yarn, bun or npm</summary>',
            fence(`yarn dlx ${checkUpdates} && yarn install`),
            fence(`bunx ${checkUpdates} && bun install`),
            fence(`npx ${checkUpdates} && npm install`),
            '</details>'
        ].join('\n\n');
    }

    private folderSections(): string[] {
        return [...Map.groupBy(this.packages, folderOf)].map(([folder, packages]) => {
            const blocks = packages.map((pkg) => this.packageBlock(pkg)).filter((block) => block !== '');

            return blocks.length === 0 ? '' : [`## ${FOLDER_HEADING[folder] ?? folder}`, ...blocks].join('\n\n');
        });
    }

    private packageBlock(pkg: ReleasePackage): string {
        const own = this.ownChanges(pkg);
        if (own.length === 0) return '';

        const lines = own.map((change) => `- ${lineOf(change)}`).join('\n');

        return [`### \`${pkg.name}\``, `<sub>${versionsOf(pkg)}</sub>`, lines].join('\n\n');
    }

    private sharedSection(): string {
        const shared = this.sharedChanges();
        if (shared.length === 0) return '';

        const blocks = shared.map((change) => {
            const names = change.packages.map((name) => `\`${shortName(name)}\``).toSorted();

            return `#### ${lineOf(change)}\n\n${names.join(' ')}`;
        });

        return [`## ${SHARED} Shared changes`, ...blocks].join('\n\n');
    }

    private footer(): string {
        const { repo, tag, previousTag } = this.config;
        if (previousTag === undefined) return '';

        const diff = `https://github.com/${repo}/compare/${previousTag}...${tag}`;
        const release = `https://github.com/${repo}/releases/tag/${previousTag}`;

        return `---\n\n<sub>[See what changed](${diff}) since the [last release](${release})</sub>`;
    }

    private ownChanges(pkg: ReleasePackage): Change[] {
        return this.changes.filter((change) => change.packages.length === 1 && change.packages[0] === pkg.name);
    }

    private sharedChanges(): Change[] {
        return this.changes.filter((change) => change.packages.length > 1);
    }

    private changelogUrl(pkg: ReleasePackage): string {
        return `https://github.com/${this.config.repo}/blob/${this.config.tag}/${pkg.directory}/CHANGELOG.md#${headingAnchor(pkg.version)}`;
    }
}

// the changeset rules open every bug fix with "Fixed"
function kindOf(bucket: Bucket, summary: string): Kind {
    return bucket === 'patch' && summary.startsWith('Fixed') ? '🐛' : KIND_OF_BUCKET[bucket];
}

function fence(command: string): string {
    return `\`\`\`sh\n${command}\n\`\`\``;
}

function lineOf(change: Change): string {
    return `${change.kind} ${change.text}`;
}

function countOrBlank(count: number): string {
    return count === 0 ? '' : String(count);
}

function byFolderThenName(a: ReleasePackage, b: ReleasePackage): number {
    return (
        folderRank(a) - folderRank(b) ||
        folderOf(a).localeCompare(folderOf(b)) ||
        shortName(a.name).localeCompare(shortName(b.name))
    );
}

function folderRank(pkg: ReleasePackage): number {
    const rank = FOLDERS.indexOf(folderOf(pkg));
    return rank === -1 ? FOLDERS.length : rank;
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
