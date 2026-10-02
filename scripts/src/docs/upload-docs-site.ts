/* eslint-disable no-console -- CLI script */
import path from 'node:path';

import { SiteBuild } from '@seedcord/docs-engine';
import { Converters, Envapter } from 'envapt';

import { DocsSiteFiles } from '#src/docs/DocsSiteFiles';
import { DocsSiteUpload } from '#src/docs/DocsSiteUpload';
import { R2Bucket } from '#src/docs/R2Bucket';

const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const EXPORT_ROOT = path.resolve(INIT_CWD, 'apps/docs/dist/docs');

const read = (key: string): string => Envapter.getRequired(key, Converters.String);

async function main(): Promise<void> {
    const build = new SiteBuild(read('BUILD_ID'));
    const bucket = R2Bucket.fromEnv(read('R2_DOCS_BUCKET'));
    const files = await new DocsSiteFiles(EXPORT_ROOT).list();

    const { written, deleted } = await new DocsSiteUpload(bucket).run(build, files);
    console.log(`✅ wrote ${written} files to ${build.folder}`);
    if (deleted.length > 0) console.log(`🗑️ deleted older builds: ${deleted.join(', ')}`);
}

main().catch((error: unknown) => {
    console.error('\n❌ upload-docs-site.ts failed:\n');
    console.error(error);
    process.exitCode = 1;
});
