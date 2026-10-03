import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { SiteBuild } from '@seedcord/docs-engine';
import { parse } from 'jsonc-parser';

import { DocsSiteFiles } from '#src/docs/DocsSiteFiles';
import { R2Bucket } from '#src/docs/R2Bucket';

import type { DocsSiteFile } from '#src/docs/DocsSiteFiles';

interface WranglerConfig {
    r2_buckets?: { binding: string; bucket_name: string }[];
}

const SHORT_SHA = 7;
const WORKER_BINDING = 'DOCS';

const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();

export const DOCS_APP = path.resolve(INIT_CWD, 'apps/docs');

export function exportedFiles(): Promise<DocsSiteFile[]> {
    return new DocsSiteFiles(path.join(DOCS_APP, 'dist/docs')).list();
}

export function buildOfHead(): SiteBuild {
    const sha = execFileSync('git', ['rev-parse', `--short=${String(SHORT_SHA)}`, 'HEAD'], { encoding: 'utf8' });
    return SiteBuild.at(new Date(), sha.trim());
}

// the bucket the docs worker reads, as apps/docs/wrangler.jsonc binds it
export function workerBucket(): R2Bucket {
    // wrangler checks this file against its config schema on every deploy
    const config = parse(readFileSync(path.join(DOCS_APP, 'wrangler.jsonc'), 'utf8')) as WranglerConfig;
    const bucket = config.r2_buckets?.find(({ binding }) => binding === WORKER_BINDING)?.bucket_name;
    if (!bucket) throw new Error(`apps/docs/wrangler.jsonc binds no R2 bucket as ${WORKER_BINDING}`);
    return R2Bucket.fromEnv(bucket);
}
