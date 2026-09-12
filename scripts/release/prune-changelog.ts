import console from 'node:console';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { ChangelogFile } from '../lib/ChangelogFile';
import { Workspace } from '../lib/Workspace';

async function tidyEveryChangelog(): Promise<void> {
    const workspace = await Workspace.load(import.meta.dirname);
    let tidied = false;

    for (const { dir } of workspace.all()) {
        const changelogPath = resolve(dir, 'CHANGELOG.md');
        if (!existsSync(changelogPath)) continue;

        const before = await ChangelogFile.read(changelogPath);
        const after = before.withoutSupersededPrereleases().withCollapsedDependencyLines();
        if (after.contents === before.contents) continue;

        await writeFile(changelogPath, after.contents, 'utf8');
        console.log(`Tidied ${changelogPath}`);
        tidied = true;
    }

    if (!tidied) console.log('Every changelog is already tidy');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
    await tidyEveryChangelog();
}
