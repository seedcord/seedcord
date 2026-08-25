/* eslint-disable no-console -- CLI script so console is ok */
/**
 * Prints the `published` input for a manual `docs-publish` run, as a JSON array of
 * `{ name, version }` for every documented package at the version the extractor recorded.
 *
 * `publish.yml` normally passes this from the changesets action. A failed publish skips the
 * downstream docs sync even when npm accepted every version. This fills that gap.
 *
 * Run `pnpm docs:extract` first, since this reads the generated manifest.
 */
import path from 'node:path';

import { DocsEngine } from '@seedcord/docs-engine';

const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const GENERATED_ROOT = path.resolve(INIT_CWD, 'generated');

async function main(): Promise<void> {
    const engine = await DocsEngine.create({ generatedRoot: GENERATED_ROOT });

    const published: { name: string; version: string }[] = [];
    for (const name of engine.listPackages()) {
        const version = engine.getPackage(name)?.manifest.version;
        if (version) published.push({ name, version });
    }

    console.log(JSON.stringify(published));
}

await main();
