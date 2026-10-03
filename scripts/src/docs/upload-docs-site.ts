/* eslint-disable no-console -- CLI script */
import { appendFile } from 'node:fs/promises';

import { buildOfHead, exportedFiles, workerBucket } from '#src/docs/DocsSite';
import { DocsSiteUpload } from '#src/docs/DocsSiteUpload';

async function main(): Promise<void> {
    const build = buildOfHead();
    const written = await new DocsSiteUpload(workerBucket()).upload(build, await exportedFiles());
    console.log(`✅ wrote ${String(written)} files to ${build.folder}`);

    const output = process.env.GITHUB_OUTPUT;
    if (output) await appendFile(output, `build_id=${build.id}\n`);
}

main().catch((error: unknown) => {
    console.error('\n❌ upload-docs-site.ts failed:\n');
    console.error(error);
    process.exitCode = 1;
});
