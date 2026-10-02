/* eslint-disable no-console -- CLI script */
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';

import { SiteBuild } from '@seedcord/docs-engine';

import { DirectoryBucket } from '#src/docs/DirectoryBucket';
import { DocsSiteFiles } from '#src/docs/DocsSiteFiles';
import { DocsSiteUpload } from '#src/docs/DocsSiteUpload';

const INIT_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
const DOCS_APP = path.resolve(INIT_CWD, 'apps/docs');

// runs the upload from docs-deploy.yml against apps/docs/.preview, then wrangler dev on that folder
async function main(): Promise<void> {
    const sha = execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8' }).trim();
    const build = SiteBuild.at(new Date(), sha);
    const files = await new DocsSiteFiles(path.join(DOCS_APP, 'dist/docs')).list();

    const upload = new DocsSiteUpload(new DirectoryBucket(path.join(DOCS_APP, '.preview')));
    const { written, deleted } = await upload.run(build, files);
    console.log(`✅ wrote ${written} files to .preview/${build.folder}`);
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
