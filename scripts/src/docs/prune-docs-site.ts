/* eslint-disable no-console -- CLI script */
import { SiteBuild } from '@seedcord/docs-engine';
import { Converters, Envapter } from 'envapt';

import { rollbackBuildId, workerBucket } from '#src/docs/docsSite';
import { DocsSiteUpload } from '#src/docs/DocsSiteUpload';

// docs-deploy.yml runs this once the worker serves BUILD_ID
async function main(): Promise<void> {
    const live = new SiteBuild(Envapter.getRequired('BUILD_ID', Converters.String));
    const rollback = rollbackBuildId();
    const deleted = await new DocsSiteUpload(workerBucket()).prune(live, rollback);
    console.log(`✅ ${live.id} is live, ${rollback ?? 'no build'} is kept for a rollback`);
    if (deleted.length > 0) console.log(`🗑️ deleted older builds: ${deleted.join(', ')}`);
}

main().catch((error: unknown) => {
    console.error('\n❌ prune-docs-site.ts failed:\n');
    console.error(error);
    process.exitCode = 1;
});
