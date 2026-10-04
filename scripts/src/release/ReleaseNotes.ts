import { FIX_OPENER, ORDER } from '#src/release/changelog-format';
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
const LABEL: Record<Kind, string> = { '💥': 'Breaking', '✨': 'Minor', '🐛': 'Fixed', '🔧': 'Changed' };
const SHARED = '👥';

const LEGEND = [
    [...KINDS.map((kind) => `${kind} ${LABEL[kind].toLowerCase()}`), `${SHARED} shared`].join(' &nbsp;·&nbsp; '),
    'A row with no counts means only its seedcord dependencies changed.'
].join('\n\n');

const SCOPE = '@seedcord/';
// pnpm 12 waits a day before it installs a new release
const PNPM_WAIT = 'pnpm installs a release once it is a day old.';

const FOLDER_HEADING = {
    packages: '📦 Packages',
    plugins: '🔌 Plugins',
    cli: '💻 CLIs',
    tooling: '🧹 Tooling'
} as const;
type Folder = keyof typeof FOLDER_HEADING;
const FOLDERS = Object.keys(FOLDER_HEADING);

type FiledPackage = ReleasePackage & { folder: Folder };

export class ReleaseNotes {
    private readonly changes: Change[];
    private readonly packages: FiledPackage[];

    constructor(private readonly config: NotesConfig) {
        this.changes = ORDER.flatMap((bucket) =>
            config.entries[bucket].map((entry) => ({
                kind: kindOf(bucket, entry.summary),
                text: toBareReferences(entry.summary, config.repo),
                packages: entry.packages
            }))
        );
        this.packages = config.published.map((pkg) => ({ ...pkg, folder: folderOf(pkg) })).toSorted(byFolderThenName);
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
        if (installed.length === 0) return '';

        const scoped = installed.some((name) => name.startsWith(SCOPE)) ? [`${SCOPE}*`] : [];
        const targets = [...scoped, ...installed.filter((name) => !name.startsWith(SCOPE))];
        const checkUpdates = `npm-check-updates -u --filter "${targets.join(',')}"`;

        return [
            fence(
                `pnpm up --latest ${targets.map((target) => (target.endsWith('*') ? `"${target}"` : target)).join(' ')}`
            ),
            PNPM_WAIT,
            '<details>\n<summary>yarn, bun or npm</summary>',
            '**yarn 4**',
            fence(`yarn dlx ${checkUpdates} && yarn install`),
            '**bun 1**',
            fence(`bunx ${checkUpdates} && bun install`),
            '**npm 12**',
            fence(`npx ${checkUpdates} && npm install`),
            '</details>'
        ].join('\n\n');
    }

    private folderSections(): string[] {
        return [...Map.groupBy(this.packages, (pkg) => pkg.folder)].map(([folder, packages]) => {
            const blocks = packages.map((pkg) => this.packageBlock(pkg)).filter((block) => block !== '');

            return blocks.length === 0 ? '' : [`## ${FOLDER_HEADING[folder]}`, ...blocks].join('\n\n');
        });
    }

    private packageBlock(pkg: ReleasePackage): string {
        const own = this.ownChanges(pkg);
        if (own.length === 0) return '';

        const groups = KINDS.flatMap((kind) => {
            const ofKind = own.filter((change) => change.kind === kind);
            if (ofKind.length === 0) return [];

            return [`**${kind} ${LABEL[kind]}**`, ofKind.map((change) => `- ${change.text}`).join('\n')];
        });

        return [`### \`${pkg.name}\``, `<sub>${versionsOf(pkg)}</sub>`, ...groups].join('\n\n');
    }

    private sharedSection(): string {
        const shared = this.sharedChanges();
        if (shared.length === 0) return '';

        const blocks = shared.map((change) => {
            const names = change.packages.map((name) => `\`${shortName(name)}\``).toSorted();

            // prettier indents a later paragraph 4 spaces under its list item
            const paragraphs = lineOf(change).replaceAll('\n    ', '\n');

            return `#### ${paragraphs}\n\n${names.join(' ')}`;
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

function kindOf(bucket: Bucket, summary: string): Kind {
    return bucket === 'patch' && FIX_OPENER.test(summary) ? '🐛' : KIND_OF_BUCKET[bucket];
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

function byFolderThenName(a: FiledPackage, b: FiledPackage): number {
    return FOLDERS.indexOf(a.folder) - FOLDERS.indexOf(b.folder) || shortName(a.name).localeCompare(shortName(b.name));
}

function folderOf(pkg: ReleasePackage): Folder {
    const folder = pkg.directory.split('/')[0] ?? '';
    if (!isFolder(folder)) {
        throw new Error(
            `${pkg.name} is in ${folder}/. Add a heading for ${folder} to FOLDER_HEADING in ReleaseNotes.ts.`
        );
    }

    return folder;
}

function isFolder(folder: string): folder is Folder {
    return Object.hasOwn(FOLDER_HEADING, folder);
}

function shortName(name: string): string {
    return name.replace(SCOPE, '');
}

function versionsOf(pkg: ReleasePackage): string {
    return pkg.oldVersion === undefined ? `${pkg.version} (new)` : `${pkg.oldVersion} → ${pkg.version}`;
}

// github renders the anchor for `## 0.16.0` as `#0160`
function headingAnchor(version: string): string {
    return version.toLowerCase().replaceAll('.', '');
}
