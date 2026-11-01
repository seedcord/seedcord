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
import { Converters, Envapter } from 'envapt';

import { EmbeddingCache } from '#src/guide/EmbeddingCache';
import { WorkersAi } from '#src/guide/WorkersAi';
import { CloudflareApi } from '#src/lib/CloudflareApi';

const EXPORT = new URL(`../../../apps/guide/${exportDir(PRODUCTION_SITES.guide)}/`, import.meta.url);
// site-deploy.yml restores this folder between runs
const CACHE = new URL('../../../.cache/guide-embeddings/', import.meta.url);

const exported = (path: string): URL => new URL(`.${path}`, EXPORT);
const fromExport: ReadAsset = async (path) => new Response(await readFile(exported(path)));

// only a cache miss reads the credentials
function embed(documents: readonly string[]): Promise<number[][]> {
    const env = Envapter.getRequiredAll({
        CLOUDFLARE_ACCOUNT_ID: Converters.String,
        // the token needs the Account > Workers AI permission
        CLOUDFLARE_API_TOKEN: Converters.String
    });
    return new WorkersAi(env.CLOUDFLARE_ACCOUNT_ID, new CloudflareApi(env.CLOUDFLARE_API_TOKEN)).embed(documents);
}

async function main(): Promise<void> {
    const sections = await readJson<GuideSection[]>(GUIDE_SECTIONS_PATH, fromExport);
    const { bytes, reused } = await new EmbeddingCache(CACHE).vectors(sections.map(embedding.document), embed);
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
