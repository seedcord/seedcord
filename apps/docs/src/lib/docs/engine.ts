import { VersionedDocsEngine } from '@seedcord/docs-engine';
import { fetchFileOrUrl, workspaceIndexLoader } from '@seedcord/docs-engine/workspace';
import { cache } from 'react';

// one engine per request. it holds mutable version state for each package
export const getDocsEngine = cache((): Promise<VersionedDocsEngine> =>
    Promise.resolve(new VersionedDocsEngine(workspaceIndexLoader(), fetchFileOrUrl))
);
