/* eslint-disable no-console -- CLI script so console is ok */
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { isPrerelease } from '@seedcord/docs-engine';

import { CliFlags } from '#src/lib/CliFlags';
import { Workspace } from '#src/lib/Workspace';
import { ChangelogFile } from '#src/release/ChangelogFile';
import { ReleaseEntries } from '#src/release/ReleaseEntries';
import { ReleaseName } from '#src/release/ReleaseName';
import { ReleaseNotes } from '#src/release/ReleaseNotes';

import type { ReleasePackage } from '#src/release/ReleaseNotes';

const run = promisify(execFile);

const flags = new CliFlags('pnpm release:notes [options]', {
    published: { type: 'string', describe: 'JSON array of { name, version } objects that published' },
    'published-file': { type: 'string', describe: 'Path to a file holding that JSON array' },
    repo: { type: 'string', describe: 'GitHub repo slug, defaulting to seedcord/seedcord' },
    out: { type: 'string', describe: 'File to write the release body to' }
});

interface Published {
    name: string;
    version: string;
}

function parsePublished(raw: string): Published[] {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError('--published must be a JSON array of { name, version }');

    return parsed.map((entry) => {
        // justified: validated as a non-null object below before its fields are read
        const { name, version } = (entry ?? {}) as { name?: unknown; version?: unknown };
        if (typeof name !== 'string' || typeof version !== 'string') {
            throw new TypeError('each published entry needs a string name and version');
        }

        return { name, version };
    });
}

async function releaseTags(...extra: string[]): Promise<string[]> {
    const { stdout } = await run('git', ['tag', '--list', 'release-*', ...extra]);

    return stdout.split('\n').filter((tag) => tag !== '');
}

async function resolvePackages(entries: readonly Published[]): Promise<ReleasePackage[]> {
    const workspace = await Workspace.load(import.meta.dirname);
    const published: ReleasePackage[] = [];

    for (const entry of entries) {
        const dir = workspace.directoryOf(entry.name);
        if (dir === undefined) throw new Error(`${entry.name} is not a package in this workspace`);

        const changelog = await ChangelogFile.read(path.join(dir, 'CHANGELOG.md'));
        published.push({
            name: entry.name,
            version: entry.version,
            oldVersion: changelog.versionBefore(entry.version) ?? '',
            directory: path.relative(workspace.rootDir, dir),
            changelog: changelog.contents
        });
    }

    return published;
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    if (flags.wantsHelp(argv)) {
        console.log(flags.help());
        return;
    }

    const parsed = flags.parse(argv);
    const file = parsed['published-file'];
    const raw = file === undefined ? parsed.published : await readFile(file, 'utf8');
    if (raw === undefined) throw new Error('--published <json> or --published-file <path> is required');

    const repo = parsed.repo ?? 'seedcord/seedcord';
    const published = await resolvePackages(parsePublished(raw));

    const [onCommit] = await releaseTags('--points-at', 'HEAD');
    const name = onCommit
        ? ReleaseName.fromTag(onCommit)
        : ReleaseName.next(Temporal.Now.instant(), await releaseTags());
    const notes = new ReleaseNotes({ repo, tag: name.tag, published, entries: new ReleaseEntries(published) });
    const body = notes.body();

    if (parsed.out !== undefined) await writeFile(parsed.out, body, 'utf8');
    console.log(`tag: ${name.tag}`);
    console.log(`title: ${name.title}`);
    console.log(`tagged: ${String(onCommit !== undefined)}`);
    console.log(`prerelease: ${String(published.some((pkg) => isPrerelease(pkg.version)))}`);
    if (parsed.out === undefined) console.log(`\n${body}`);
}

await main();
