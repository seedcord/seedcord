/* eslint-disable no-console -- CLI script */
import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import process from 'node:process';
import { promisify } from 'node:util';

import { CliFlags } from '#src/lib/CliFlags';
import { PUBLISHED_FLAGS, readPublished } from '#src/lib/published-packages';
import { Workspace } from '#src/lib/Workspace';
import { isStable } from '#src/release/changelog-format';
import { resolvePackages } from '#src/release/release-packages';
import { ReleaseEntries } from '#src/release/ReleaseEntries';
import { ReleaseName } from '#src/release/ReleaseName';
import { ReleaseNotes } from '#src/release/ReleaseNotes';

const run = promisify(execFile);

const flags = new CliFlags('pnpm release:notes [options]', {
    ...PUBLISHED_FLAGS,
    repo: { type: 'string', describe: 'GitHub repo slug, defaulting to seedcord/seedcord' },
    out: { type: 'string', describe: 'File to write the release body to' }
});

async function releaseTags(...extra: string[]): Promise<string[]> {
    const { stdout } = await run('git', ['tag', '--list', 'release-*', ...extra]);

    return stdout.split('\n').filter((tag) => tag !== '');
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    if (flags.wantsHelp(argv)) {
        console.log(flags.help());
        return;
    }

    const parsed = flags.parse(argv);
    const repo = parsed.repo ?? 'seedcord/seedcord';
    const published = await resolvePackages(await Workspace.load(import.meta.dirname), await readPublished(parsed));

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
    console.log(`prerelease: ${String(!published.every((pkg) => isStable(pkg.version)))}`);
    if (parsed.out === undefined) console.log(`\n${body}`);
}

await main();
