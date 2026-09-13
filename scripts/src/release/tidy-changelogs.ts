import console from 'node:console';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Workspace } from '#src/lib/Workspace';
import { ChangelogFile } from '#src/release/ChangelogFile';
import { ChangelogSections } from '#src/release/ChangelogSections';

async function tidyEveryChangelog(): Promise<void> {
    const workspace = await Workspace.load(import.meta.dirname);
    let tidied = false;

    for (const { dir } of workspace.all()) {
        const changelogPath = resolve(dir, 'CHANGELOG.md');
        if (!existsSync(changelogPath)) continue;

        const before = await ChangelogFile.read(changelogPath);
        const pruned = before.withoutSupersededPrereleases();
        const after = new ChangelogSections(pruned.contents).regrouped().contents;
        if (after === before.contents) continue;

        await writeFile(changelogPath, after, 'utf8');
        console.log(`Tidied ${changelogPath}`);
        tidied = true;
    }

    if (!tidied) console.log('Every changelog is already tidy');
}

await tidyEveryChangelog();
