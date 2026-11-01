/* eslint-disable no-console -- CLI script */
import { readFile, writeFile } from 'node:fs/promises';

import { PRODUCTION_SITES } from '@seedcord/brand';
import {
    embedding,
    GUIDE_SECTIONS_PATH,
    GUIDE_VECTORS_PATH,
    readJson,
    SectionIndex,
    type GuideSection,
    type ReadAsset
} from '@seedcord/docs-search';
import { exportDir } from '@seedcord/ui/exportDir';

import { EmbeddingCache } from '#src/guide/EmbeddingCache';
import { WorkersAi } from '#src/guide/WorkersAi';

const EXPORT = new URL(`../../../apps/guide/${exportDir(PRODUCTION_SITES.guide)}/`, import.meta.url);
// site-deploy.yml restores this folder between runs
const CACHE = new URL('../../../.cache/guide-embeddings/', import.meta.url);

const exported = (path: string): URL => new URL(`.${path}`, EXPORT);
const fromExport: ReadAsset = async (path) => new Response(await readFile(exported(path)));

async function main(): Promise<void> {
    const sections = await readJson<GuideSection[]>(GUIDE_SECTIONS_PATH, fromExport);
    const { bytes, reused } = await new EmbeddingCache(CACHE).vectors(sections.map(embedding.document), (documents) =>
        WorkersAi.fromEnv().embed(documents)
    );
    await writeFile(exported(GUIDE_VECTORS_PATH), bytes);

    // the worker loads them like this too. a mismatch throws here in CI, before any deploy
    await SectionIndex.load(fromExport);
    console.log(`✅ ${reused ? 'reused the vectors for' : 'embedded'} ${sections.length} guide sections`);
}

main().catch((error: unknown) => {
    console.error('\n❌ embed-guide-sections.ts failed:\n');
    console.error(error);
    process.exitCode = 1;
});
