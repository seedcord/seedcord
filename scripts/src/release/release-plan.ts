/* eslint-disable no-console -- CLI script */
import { writeFile } from 'node:fs/promises';

import { CliFlags } from '#src/lib/CliFlags';
import { Workspace } from '#src/lib/Workspace';
import { readReleasePackages } from '#src/release/readReleasePackages';

const flags = new CliFlags('vp run release:plan [options]', {
    since: { type: 'string', describe: 'Release tag to compare package versions against' },
    out: { type: 'string', describe: 'File to write the release package list to' }
});

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    if (flags.wantsHelp(argv)) {
        console.log(flags.help());
        return;
    }
    const parsed = flags.parse(argv);
    const workspace = await Workspace.load(import.meta.dirname);
    const entries = await readReleasePackages(workspace, parsed.since);
    const json = `${JSON.stringify(entries)}\n`;
    if (parsed.out !== undefined) await writeFile(parsed.out, json, 'utf8');
    else console.log(json.trim());
}

await main();
