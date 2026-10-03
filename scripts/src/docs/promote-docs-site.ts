/* eslint-disable no-console -- CLI script */
import { SiteBuild } from '@seedcord/docs-engine';
import { Converters, Envapter } from 'envapt';

import { workerBucket } from '#src/docs/DocsSite';
import { DocsSiteUpload } from '#src/docs/DocsSiteUpload';

// docs-deploy.yml runs this once the worker serves BUILD_ID
async function main(): Promise<void> {
    const live = new SiteBuild(Envapter.getRequired('BUILD_ID', Converters.String));
    const deleted = await new DocsSiteUpload(workerBucket()).promote(live);
    console.log(`✅ ${live.id} is live`);
    if (deleted.length > 0) console.log(`🗑️ deleted older builds: ${deleted.join(', ')}`);
}

main().catch((error: unknown) => {
    console.error('\n❌ promote-docs-site.ts failed:\n');
    console.error(error);
    process.exitCode = 1;
});
