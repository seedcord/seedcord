export interface RenderedChangeset {
    summary: string;
    commit?: string;
}

export interface UpdatedDependency {
    name: string;
    oldVersion: string;
    newVersion: string;
}

export type SubjectLookup = (sha: string) => Promise<string | undefined>;
export type ContributorLookup = (pull: string) => Promise<readonly string[]>;

export interface RendererConfig {
    repo: string;
    subjectOf: SubjectLookup;
    contributorsOf?: ContributorLookup;
    maintainers?: readonly string[];
}

// github puts the pull request number at the end of a squash merge subject
const PULL_NUMBER = /\(#(\d+)\)$/;

export class ChangelogRenderer {
    constructor(private readonly config: RendererConfig) {}

    async releaseLine(changeset: RenderedChangeset): Promise<string> {
        const reference = await this.referenceFor(changeset.commit);

        return reference === undefined ? `- ${changeset.summary}` : `- ${changeset.summary} (${reference})`;
    }

    dependencyLine(updated: readonly UpdatedDependency[]): string {
        return updated.map((one) => `- ${one.name} ${one.oldVersion} → ${one.newVersion}`).join('\n');
    }

    private async referenceFor(sha: string | undefined): Promise<string | undefined> {
        if (sha === undefined) return undefined;

        const base = `https://github.com/${this.config.repo}`;
        const pull = PULL_NUMBER.exec((await this.config.subjectOf(sha)) ?? '')?.[1];
        if (pull === undefined) return `[\`${sha}\`](${base}/commit/${sha})`;

        return `[#${pull}](${base}/pull/${pull})${await this.thanksFor(pull)}`;
    }

    private async thanksFor(pull: string): Promise<string> {
        const { contributorsOf, maintainers = [] } = this.config;
        if (contributorsOf === undefined) return '';

        const contributors = await contributorsOf(pull);
        const credited = contributors.filter((login) => !maintainers.includes(login));
        if (credited.length === 0) return '';

        return `, thanks ${joined(credited.map((login) => `[@${login}](https://github.com/${login})`))}`;
    }
}

function joined(links: readonly string[]): string {
    const last = links.at(-1) ?? '';
    if (links.length < 2) return last;

    return `${links.slice(0, -1).join(', ')} and ${last}`;
}
