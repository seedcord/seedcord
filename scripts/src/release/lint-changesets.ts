/* eslint-disable no-console -- CLI script */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { Workspace } from '#src/lib/Workspace';
import { ChangesetRule } from '#src/release/ChangesetRule';

import type { Violation } from '#src/release/ChangesetRule';

const MESSAGES: Record<Violation['reason'], string> = {
    'unknown-package': 'names a package outside the workspace',
    'pre-1.0-major': 'asks for a major bump while the repo is pre-1.0',
    'empty-summary': 'has no summary',
    'multi-line': 'runs past one paragraph on one line',
    'block-start': 'opens as a list, a heading or a quote',
    'breaking-marker': 'spells the breaking marker as something other than **BREAKING:** opening the summary',
    'breaking-patch': 'marks a patch as breaking, which needs a minor bump pre-1.0',
    'too-long': 'runs past the sentence cap, one when every bump is a patch and three otherwise',
    'banned-punctuation': 'carries punctuation the writing rules ban',
    'banned-word': 'carries a banned word',
    'fix-opener': 'opens a fix with something other than Fixed'
};

async function changesetFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir);

    return entries.filter((entry) => entry.endsWith('.md') && entry !== 'README.md').sort();
}

async function main(): Promise<void> {
    const workspace = await Workspace.load(import.meta.dirname);
    const dir = path.join(workspace.rootDir, '.changeset');
    const rule = new ChangesetRule(
        new Map(workspace.all().map((pkg) => [pkg.packageJson.name, pkg.packageJson.version]))
    );

    const found: Violation[] = [];
    for (const file of await changesetFiles(dir)) {
        found.push(...rule.violations(file, await readFile(path.join(dir, file), 'utf8')));
    }

    if (found.length === 0) {
        console.log('Every changeset reads clean');
        return;
    }

    for (const violation of found) {
        console.error(`${violation.file}: ${MESSAGES[violation.reason]} (${violation.detail})`);
    }
    console.error(`\n${String(found.length)} problem(s) across the changesets`);
    process.exitCode = 1;
}

await main();
