/* eslint-disable no-console -- CLI script */
import { spawn } from 'node:child_process';
import path from 'node:path';

import { DirectoryBucket } from '#src/docs/DirectoryBucket';
import { buildOfHead, DOCS_APP, exportedFiles } from '#src/docs/DocsSite';
import { DocsSiteUpload } from '#src/docs/DocsSiteUpload';

// runs the upload and promote steps from docs-deploy.yml against apps/docs/.preview, then wrangler dev on it
async function main(): Promise<void> {
    const build = buildOfHead();
    const site = new DocsSiteUpload(new DirectoryBucket(path.join(DOCS_APP, '.preview')));
    const written = await site.upload(build, await exportedFiles());
    const deleted = await site.promote(build);
    console.log(`✅ wrote ${String(written)} files to .preview/${build.folder}`);
    if (deleted.length > 0) console.log(`🗑️ deleted older builds: ${deleted.join(', ')}`);

    const wrangler = ['exec', 'wrangler', 'dev', '--env', 'preview', '--var', `BUILD_ID:${build.id}`];
    spawn('pnpm', [...wrangler, ...process.argv.slice(2)], { cwd: DOCS_APP, stdio: 'inherit' }).on('exit', (code) => {
        process.exitCode = code ?? 1;
    });
}

main().catch((error: unknown) => {
    console.error('\n❌ preview-docs.ts failed:\n');
    console.error(error);
    process.exitCode = 1;
});
