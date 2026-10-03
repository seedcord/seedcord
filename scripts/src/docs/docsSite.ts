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

// wrangler prints these cloudflare api responses as they come
interface Deployment {
    versions: { version_id: string; percentage: number }[];
}

interface WorkerVersion {
    resources: { bindings: { type: string; name: string; text?: string }[] };
}

type Wrangler = (args: string[]) => string;

const SHORT_SHA = 7;
const WORKER_BINDING = 'DOCS';
const BUILD_VAR = 'BUILD_ID';
const FULL_ROLLOUT = 100;

const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();

export const DOCS_APP = path.resolve(INIT_CWD, 'apps/docs');

export function exportedFiles(): Promise<DocsSiteFile[]> {
    return new DocsSiteFiles(path.join(DOCS_APP, 'dist/docs')).list();
}

export function buildOfHead(): SiteBuild {
    const sha = execFileSync('git', ['rev-parse', `--short=${String(SHORT_SHA)}`, 'HEAD'], { encoding: 'utf8' });
    return SiteBuild.at(new Date(), sha.trim());
}

const runWrangler: Wrangler = (args) =>
    execFileSync('pnpm', ['exec', 'wrangler', ...args, '--json'], { cwd: DOCS_APP, encoding: 'utf8' });

// wrangler rollback picks the newest earlier deployment that runs one version at 100%
export function rollbackBuildId(wrangler: Wrangler = runWrangler): string | null {
    const deployments = JSON.parse(wrangler(['deployments', 'list'])) as Deployment[];
    const earlierNewestFirst = deployments.slice(0, -1).reverse();
    const previous = earlierNewestFirst
        .map(({ versions }) => versions.find(({ percentage }) => percentage === FULL_ROLLOUT))
        .find((version) => version !== undefined);
    if (!previous) return null;

    const version = JSON.parse(wrangler(['versions', 'view', previous.version_id])) as WorkerVersion;
    const buildVar = version.resources.bindings.find(({ type, name }) => type === 'plain_text' && name === BUILD_VAR);
    return buildVar?.text ?? null;
}

export function workerBucket(): R2Bucket {
    const config = parse(readFileSync(path.join(DOCS_APP, 'wrangler.jsonc'), 'utf8')) as WranglerConfig;
    const bucket = config.r2_buckets?.find(({ binding }) => binding === WORKER_BINDING)?.bucket_name;
    if (!bucket) throw new Error(`apps/docs/wrangler.jsonc binds no R2 bucket as ${WORKER_BINDING}`);
    return R2Bucket.fromEnv(bucket);
}
