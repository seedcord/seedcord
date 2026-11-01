/* eslint-disable no-console -- CLI script */
import { readFile, writeFile } from 'node:fs/promises';

import { PRODUCTION_SITES } from '@seedcord/brand';
import { embedding, GUIDE_SECTIONS_PATH, GUIDE_VECTORS_PATH, SectionIndex } from '@seedcord/docs-search';
import { exportDir } from '@seedcord/ui/exportDir';

import { WorkersAi } from '#src/guide/WorkersAi';

import type { GuideSection } from '@seedcord/docs-search';

const EXPORT = new URL(`../../../apps/guide/${exportDir(PRODUCTION_SITES.guide)}/`, import.meta.url);
const exported = (path: string): URL => new URL(`.${path}`, EXPORT);

async function main(): Promise<void> {
    // the guide build writes this file from the same type
    const sections = JSON.parse(await readFile(exported(GUIDE_SECTIONS_PATH), 'utf8')) as GuideSection[];
    const vectors = await WorkersAi.fromEnv().embed(sections.map(embedding.document));
    await writeFile(exported(GUIDE_VECTORS_PATH), new Float32Array(vectors.flat()));

    // the worker loads them like this too. a mismatch throws here in CI, before any deploy
    await SectionIndex.load(async (path) => new Response(await readFile(exported(path))));
    console.log(`✅ embedded ${sections.length} guide sections`);
}

main().catch((error: unknown) => {
    console.error('\n❌ embed-guide-sections.ts failed:\n');
    console.error(error);
    process.exitCode = 1;
});
